package translation

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"
	"unicode/utf8"

	"donetick.com/core/config"
	tModel "donetick.com/core/internal/translation/model"
	"donetick.com/core/logging"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Status says what happened to one text.
type Status string

const (
	StatusTranslated  Status = "translated"  // Text holds the translation
	StatusUnchanged   Status = "unchanged"   // already in the target language
	StatusOff         Status = "off"         // translation is turned off
	StatusLimit       Status = "limit"       // the daily character limit is reached
	StatusUnavailable Status = "unavailable" // the provider failed; try again later
)

// Item is one text to show in the target language.
type Item struct {
	Text   string
	Format Format
}

// Outcome is the answer for one Item.
type Outcome struct {
	Status Status
	Text   string
}

// Service translates through the configured provider, keeps every answer in
// the cache table and counts the characters sent per UTC day.
type Service struct {
	db         *gorm.DB
	translator Translator // nil when translation is off
	dailyLimit int
	now        func() time.Time
}

// NewTranslator picks the provider from the configuration: nil when
// translation is off or the Google key is missing, so nothing is ever sent.
func NewTranslator(cfg *config.Config) Translator {
	tc := cfg.Translation
	if !tc.Enabled {
		return nil
	}
	switch tc.Provider {
	case "fake":
		return FakeTranslator{}
	case "google", "":
		key := strings.TrimSpace(tc.APIKey)
		if key == "" {
			return nil
		}
		return NewGoogleTranslator(key)
	}
	return nil
}

func NewService(cfg *config.Config, db *gorm.DB) *Service {
	return newService(db, NewTranslator(cfg), cfg.Translation.DailyCharLimit)
}

func newService(db *gorm.DB, translator Translator, dailyLimit int) *Service {
	return &Service{db: db, translator: translator, dailyLimit: dailyLimit, now: time.Now}
}

// Enabled reports whether texts can be translated at all.
func (s *Service) Enabled() bool { return s.translator != nil }

func sourceHash(item Item) string {
	sum := sha256.Sum256([]byte(string(item.Format) + "\x00" + item.Text))
	return hex.EncodeToString(sum[:])
}

func baseLanguage(code string) string {
	return strings.ToLower(strings.SplitN(code, "-", 2)[0])
}

// Translate answers every item, in order. Cached answers cost nothing; the rest
// are sent in one call per format, when the daily limit allows.
func (s *Service) Translate(ctx context.Context, items []Item, target string) []Outcome {
	outcomes := make([]Outcome, len(items))
	if !s.Enabled() {
		for i := range outcomes {
			outcomes[i] = Outcome{Status: StatusOff}
		}
		return outcomes
	}

	// Group the items by text, so a text that appears twice is handled once.
	byHash := map[string][]int{}
	var hashes []string
	for i, item := range items {
		if strings.TrimSpace(item.Text) == "" {
			outcomes[i] = Outcome{Status: StatusUnchanged}
			continue
		}
		h := sourceHash(item)
		if _, seen := byHash[h]; !seen {
			hashes = append(hashes, h)
		}
		byHash[h] = append(byHash[h], i)
	}
	if len(hashes) == 0 {
		return outcomes
	}
	set := func(h string, outcome Outcome) {
		for _, i := range byHash[h] {
			outcomes[i] = outcome
		}
	}
	setAll := func(group []string, status Status) {
		for _, h := range group {
			set(h, Outcome{Status: status})
		}
	}

	var cached []tModel.CacheEntry
	if err := s.db.WithContext(ctx).
		Where("provider = ? AND target = ? AND source_hash IN ?", s.translator.Name(), target, hashes).
		Find(&cached).Error; err != nil {
		setAll(hashes, StatusUnavailable)
		return outcomes
	}
	found := map[string]bool{}
	for _, entry := range cached {
		found[entry.SourceHash] = true
		outcome := Outcome{Status: Status(entry.Status)}
		if entry.Text != nil {
			outcome.Text = *entry.Text
		}
		set(entry.SourceHash, outcome)
	}

	// What is left goes to the provider, one call per format.
	var formats []Format
	missing := map[Format][]string{}
	var missingAll []string
	chars := 0
	for _, h := range hashes {
		if found[h] {
			continue
		}
		item := items[byHash[h][0]]
		if _, ok := missing[item.Format]; !ok {
			formats = append(formats, item.Format)
		}
		missing[item.Format] = append(missing[item.Format], h)
		missingAll = append(missingAll, h)
		chars += utf8.RuneCountInString(item.Text)
	}
	if len(missingAll) == 0 {
		return outcomes
	}

	allowed, err := s.reserve(ctx, chars)
	if err != nil {
		setAll(missingAll, StatusUnavailable)
		return outcomes
	}
	if !allowed {
		setAll(missingAll, StatusLimit)
		return outcomes
	}

	for _, format := range formats {
		group := missing[format]
		texts := make([]string, len(group))
		for i, h := range group {
			texts[i] = items[byHash[h][0]].Text
		}
		answers, err := s.translator.Translate(ctx, texts, format, target)
		if err != nil || len(answers) != len(texts) {
			// The error names only the provider status, never the key or the texts.
			logging.FromContext(ctx).Warnw("translation failed", "provider", s.translator.Name(),
				"texts", len(texts), "answers", len(answers), "error", err)
			setAll(group, StatusUnavailable)
			continue
		}
		for i, h := range group {
			set(h, s.store(ctx, h, texts[i], answers[i], target))
		}
	}
	return outcomes
}

// store keeps one answer. A text already in the target language is kept
// without any text, so the original is never copied into the cache.
func (s *Service) store(ctx context.Context, hash, source string, answer Answer, target string) Outcome {
	entry := tModel.CacheEntry{
		SourceHash: hash,
		Target:     target,
		Provider:   s.translator.Name(),
		Detected:   baseLanguage(answer.Detected),
		CreatedAt:  s.now().UTC(),
	}
	outcome := Outcome{Status: StatusUnchanged}
	if entry.Detected != target && answer.Text != "" && answer.Text != source {
		text := answer.Text
		entry.Text = &text
		outcome = Outcome{Status: StatusTranslated, Text: text}
	}
	entry.Status = string(outcome.Status)
	// Another request may have stored the same text meanwhile; either answer is fine.
	_ = s.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(&entry).Error
	return outcome
}

// reserve counts chars against today's limit (UTC) before anything is sent. It
// answers false when the limit would be passed. The check and the update are
// one statement, so concurrent requests cannot pass the limit together.
func (s *Service) reserve(ctx context.Context, chars int) (bool, error) {
	if chars > s.dailyLimit {
		return false, nil
	}
	day := s.now().UTC().Format("2006-01-02")
	allowed := false
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).
			Create(&tModel.DailyUsage{Day: day}).Error; err != nil {
			return err
		}
		res := tx.Model(&tModel.DailyUsage{}).
			Where("day = ? AND chars + ? <= ?", day, chars, s.dailyLimit).
			Update("chars", gorm.Expr("chars + ?", chars))
		if res.Error != nil {
			return res.Error
		}
		allowed = res.RowsAffected == 1
		return nil
	})
	return allowed, err
}
