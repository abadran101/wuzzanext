package backup

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

type chore struct {
	ID   uint
	Name string
}

func makeDB(t *testing.T, path string, names ...string) {
	t.Helper()
	db, err := open(path)
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	if err := db.AutoMigrate(&chore{}); err != nil {
		t.Fatal(err)
	}
	for _, n := range names {
		if err := db.Create(&chore{Name: n}).Error; err != nil {
			t.Fatal(err)
		}
	}
}

func TestRunCopiesDatabaseAndUploads(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "data", "wuzzanext.db")
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		t.Fatal(err)
	}
	makeDB(t, dbPath, "Feed the made-up cat", "Water the plants")
	uploads := filepath.Join(dir, "data", "uploads")
	if err := os.MkdirAll(filepath.Join(uploads, "chores", "7"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(uploads, "chores", "7", "photo.webp"), []byte("not really a picture"), 0o644); err != nil {
		t.Fatal(err)
	}

	// Keep a connection open, as the running server does.
	live, err := open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	liveSQL, _ := live.DB()
	defer liveSQL.Close()

	to := filepath.Join(dir, "backups")
	now := time.Date(2026, 10, 30, 3, 0, 0, 0, time.Local)
	dest, err := Run(dbPath, uploads, to, 14, now)
	if err != nil {
		t.Fatal(err)
	}
	if want := filepath.Join(to, "wuzzanext-20261030-030000"); dest != want {
		t.Fatalf("dest = %s, want %s", dest, want)
	}

	copied, err := open(filepath.Join(dest, "wuzzanext.db"))
	if err != nil {
		t.Fatal(err)
	}
	copiedSQL, _ := copied.DB()
	defer copiedSQL.Close()
	var count int64
	if err := copied.Model(&chore{}).Count(&count).Error; err != nil || count != 2 {
		t.Fatalf("chores in copy = %d (%v), want 2", count, err)
	}
	got, err := os.ReadFile(filepath.Join(dest, "uploads", "chores", "7", "photo.webp"))
	if err != nil || string(got) != "not really a picture" {
		t.Fatalf("uploaded file in copy = %q (%v)", got, err)
	}
	if _, err := os.Stat(dest + ".partial"); !os.IsNotExist(err) {
		t.Errorf("partial folder left behind")
	}
}

func TestRunWithoutUploadsFolder(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "wuzzanext.db")
	makeDB(t, dbPath, "Tidy the made-up room")
	dest, err := Run(dbPath, filepath.Join(dir, "uploads"), filepath.Join(dir, "b"), 14, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dest, "uploads")); !os.IsNotExist(err) {
		t.Errorf("uploads copied although there were none")
	}
}

func TestRunRefusesMissingDatabase(t *testing.T) {
	dir := t.TempDir()
	if _, err := Run(filepath.Join(dir, "none.db"), "", filepath.Join(dir, "b"), 14, time.Now()); err == nil {
		t.Fatal("want an error for a missing database")
	}
	if _, err := os.Stat(filepath.Join(dir, "none.db")); !os.IsNotExist(err) {
		t.Errorf("a missing database must not be created")
	}
}

func TestOldCopiesArePruned(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "wuzzanext.db")
	makeDB(t, dbPath, "Sweep the made-up porch")
	to := filepath.Join(dir, "b")
	for _, name := range []string{
		"wuzzanext-20261001-030000",         // 29 days old: removed
		"wuzzanext-20261015-030000.partial", // 15 days, unfinished: removed
		"wuzzanext-20261020-030000",         // 10 days: kept
		"family-photos",                     // not ours: kept
	} {
		if err := os.MkdirAll(filepath.Join(to, name), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	now := time.Date(2026, 10, 30, 3, 0, 0, 0, time.Local)
	if _, err := Run(dbPath, "", to, 14, now); err != nil {
		t.Fatal(err)
	}
	entries, _ := os.ReadDir(to)
	var names []string
	for _, e := range entries {
		names = append(names, e.Name())
	}
	want := []string{"family-photos", "wuzzanext-20261020-030000", "wuzzanext-20261030-030000"}
	if len(names) != len(want) {
		t.Fatalf("left = %v, want %v", names, want)
	}
	for i := range want {
		if names[i] != want[i] {
			t.Fatalf("left = %v, want %v", names, want)
		}
	}
}
