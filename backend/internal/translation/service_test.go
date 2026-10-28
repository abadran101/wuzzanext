package translation

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	tModel "donetick.com/core/internal/translation/model"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// recordingTranslator stands in for the provider: it remembers every text sent.
// Texts starting with "same:" come back as already in the target language.
type recordingTranslator struct {
	calls int
	sent  []string
	fail  bool
}

func (r *recordingTranslator) Name() string { return "test" }

func (r *recordingTranslator) Translate(_ context.Context, texts []string, format Format, target string) ([]Answer, error) {
	r.calls++
	r.sent = append(r.sent, texts...)
	if r.fail {
		return nil, errors.New("translation service answered 503")
	}
	answers := make([]Answer, len(texts))
	for i, text := range texts {
		if strings.HasPrefix(text, "same:") {
			answers[i] = Answer{Text: text, Detected: target}
			continue
		}
		answers[i] = Answer{Text: fmt.Sprintf("%s(%s) %s", target, format, text), Detected: "en-US"}
	}
	return answers, nil
}

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })
	require.NoError(t, db.AutoMigrate(&tModel.CacheEntry{}, &tModel.DailyUsage{}))
	return db
}

func TestTranslateOffSendsNothing(t *testing.T) {
	s := newService(newTestDB(t), nil, 15000)
	require.False(t, s.Enabled())
	out := s.Translate(context.Background(), []Item{{Text: "Water the plants", Format: FormatText}}, "ar")
	require.Equal(t, []Outcome{{Status: StatusOff}}, out)
}

func TestTranslateCachesAnswers(t *testing.T) {
	db := newTestDB(t)
	tr := &recordingTranslator{}
	s := newService(db, tr, 15000)
	items := []Item{
		{Text: "Water the plants", Format: FormatText},
		{Text: "<p>Use the blue can</p>", Format: FormatHTML},
		{Text: "Water the plants", Format: FormatText}, // the same text twice is sent once
	}

	out := s.Translate(context.Background(), items, "ar")
	require.Equal(t, Outcome{Status: StatusTranslated, Text: "ar(text) Water the plants"}, out[0])
	require.Equal(t, Outcome{Status: StatusTranslated, Text: "ar(html) <p>Use the blue can</p>"}, out[1])
	require.Equal(t, out[0], out[2])
	require.Equal(t, 2, tr.calls, "one call per format")
	require.Len(t, tr.sent, 2)

	again := s.Translate(context.Background(), items, "ar")
	require.Equal(t, out, again)
	require.Equal(t, 2, tr.calls, "cached answers are not sent again")

	// Another target language is another answer.
	s.Translate(context.Background(), items[:1], "en")
	require.Equal(t, 3, tr.calls)
}

func TestTranslateSameLanguageCachedWithoutText(t *testing.T) {
	db := newTestDB(t)
	tr := &recordingTranslator{}
	s := newService(db, tr, 15000)
	items := []Item{{Text: "same: already Arabic", Format: FormatText}}

	out := s.Translate(context.Background(), items, "ar")
	require.Equal(t, []Outcome{{Status: StatusUnchanged}}, out)

	var entries []tModel.CacheEntry
	require.NoError(t, db.Find(&entries).Error)
	require.Len(t, entries, 1)
	require.Nil(t, entries[0].Text, "the original is never copied into the cache")
	require.Equal(t, "ar", entries[0].Detected)
	require.Len(t, entries[0].SourceHash, 64)

	s.Translate(context.Background(), items, "ar")
	require.Equal(t, 1, tr.calls, "a text already in the language is not sent again")
}

func TestTranslateEmptyTextSendsNothing(t *testing.T) {
	tr := &recordingTranslator{}
	s := newService(newTestDB(t), tr, 15000)
	out := s.Translate(context.Background(), []Item{{Text: "  ", Format: FormatText}}, "ar")
	require.Equal(t, []Outcome{{Status: StatusUnchanged}}, out)
	require.Zero(t, tr.calls)
}

func TestTranslateDailyLimit(t *testing.T) {
	db := newTestDB(t)
	tr := &recordingTranslator{}
	s := newService(db, tr, 10)
	day := time.Date(2026, 10, 28, 23, 0, 0, 0, time.UTC)
	s.now = func() time.Time { return day }

	out := s.Translate(context.Background(), []Item{{Text: "12345678", Format: FormatText}}, "ar")
	require.Equal(t, StatusTranslated, out[0].Status)

	out = s.Translate(context.Background(), []Item{{Text: "abcde", Format: FormatText}}, "ar")
	require.Equal(t, StatusLimit, out[0].Status)
	require.Equal(t, 1, tr.calls, "nothing is sent over the limit")

	// Cached answers still come back over the limit.
	out = s.Translate(context.Background(), []Item{{Text: "12345678", Format: FormatText}}, "ar")
	require.Equal(t, StatusTranslated, out[0].Status)

	// Only the characters actually sent are counted.
	var usage tModel.DailyUsage
	require.NoError(t, db.First(&usage, "day = ?", "2026-10-28").Error)
	require.Equal(t, 8, usage.Chars)

	// The next UTC day starts again.
	s.now = func() time.Time { return day.Add(2 * time.Hour) }
	out = s.Translate(context.Background(), []Item{{Text: "abcde", Format: FormatText}}, "ar")
	require.Equal(t, StatusTranslated, out[0].Status)
}

func TestTranslateCountsCharactersNotBytes(t *testing.T) {
	db := newTestDB(t)
	s := newService(db, &recordingTranslator{}, 15000)
	s.Translate(context.Background(), []Item{{Text: "اسقِ النباتات", Format: FormatText}}, "en")
	var usage tModel.DailyUsage
	require.NoError(t, db.First(&usage).Error)
	require.Equal(t, 13, usage.Chars)
}

func TestTranslateFailureIsNotCached(t *testing.T) {
	db := newTestDB(t)
	tr := &recordingTranslator{fail: true}
	s := newService(db, tr, 15000)
	items := []Item{{Text: "Take out the bins", Format: FormatText}}

	out := s.Translate(context.Background(), items, "ar")
	require.Equal(t, []Outcome{{Status: StatusUnavailable}}, out)
	var count int64
	require.NoError(t, db.Model(&tModel.CacheEntry{}).Count(&count).Error)
	require.Zero(t, count)

	tr.fail = false
	out = s.Translate(context.Background(), items, "ar")
	require.Equal(t, StatusTranslated, out[0].Status)
	require.Equal(t, 2, tr.calls)
}

func TestFakeAndGoogleAnswersDoNotMix(t *testing.T) {
	db := newTestDB(t)
	items := []Item{{Text: "Feed the cat", Format: FormatText}}
	fake := newService(db, FakeTranslator{}, 15000)
	require.Equal(t, Outcome{Status: StatusTranslated, Text: "[ar] Feed the cat"}, fake.Translate(context.Background(), items, "ar")[0])

	other := &recordingTranslator{}
	s := newService(db, other, 15000)
	out := s.Translate(context.Background(), items, "ar")
	require.Equal(t, "ar(text) Feed the cat", out[0].Text)
	require.Equal(t, 1, other.calls)
}

func TestFakeTranslatorDetectsArabic(t *testing.T) {
	answers, err := FakeTranslator{}.Translate(context.Background(), []string{"اسقِ النباتات", "Sweep"}, FormatText, "ar")
	require.NoError(t, err)
	require.Equal(t, Answer{Text: "اسقِ النباتات", Detected: "ar"}, answers[0])
	require.Equal(t, Answer{Text: "[ar] Sweep", Detected: "en"}, answers[1])
}
