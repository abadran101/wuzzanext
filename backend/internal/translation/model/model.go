package model

import "time"

// CacheEntry keeps one translation answer so the same text is never sent twice.
// The source text itself is not stored: rows are found by its SHA-256. A text
// that is already in the target language is kept as StatusUnchanged with no
// Text, so it is not sent again either.
type CacheEntry struct {
	ID         int       `gorm:"primary_key;autoIncrement"`
	SourceHash string    `gorm:"column:source_hash;type:varchar(64);not null;uniqueIndex:idx_translation_cache_key"`
	Target     string    `gorm:"column:target;type:varchar(8);not null;uniqueIndex:idx_translation_cache_key"`
	Provider   string    `gorm:"column:provider;type:varchar(16);not null;uniqueIndex:idx_translation_cache_key"`
	Status     string    `gorm:"column:status;type:varchar(16);not null"`
	Text       *string   `gorm:"column:text;type:text"`
	Detected   string    `gorm:"column:detected;type:varchar(16)"`
	CreatedAt  time.Time `gorm:"column:created_at"`
}

func (CacheEntry) TableName() string { return "translation_cache" }

// DailyUsage counts the characters sent to the translation provider per UTC day,
// so the daily limit survives restarts.
type DailyUsage struct {
	Day   string `gorm:"column:day;type:varchar(10);primary_key"`
	Chars int    `gorm:"column:chars;not null;default:0"`
}

func (DailyUsage) TableName() string { return "translation_daily_usage" }
