// Package backup makes the home server's nightly copy: the SQLite database and
// the uploaded pictures, in one dated folder (task 019).
package backup

import (
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const stamp = "20060102-150405"

var copyName = regexp.MustCompile(`^wuzzanext-(\d{8}-\d{6})(\.partial)?$`)

// Run copies the database at dbPath with VACUUM INTO, so a server that is
// running and writing still gives a consistent copy, checks the copy, and
// copies uploadsDir (skipped when it doesn't exist yet). Everything lands in
// to\wuzzanext-<date-time>; the folder only gets that name once complete.
// Copies older than keepDays are then removed, always keeping the newest.
func Run(dbPath, uploadsDir, to string, keepDays int, now time.Time) (string, error) {
	if keepDays < 1 {
		return "", fmt.Errorf("keep must be at least 1 day")
	}
	if info, err := os.Stat(dbPath); err != nil || info.IsDir() {
		return "", fmt.Errorf("database not found: %s", dbPath)
	}
	if err := os.MkdirAll(to, 0o755); err != nil {
		return "", err
	}

	dest := filepath.Join(to, "wuzzanext-"+now.Format(stamp))
	partial := dest + ".partial"
	if _, err := os.Stat(dest); err == nil {
		return "", fmt.Errorf("already exists: %s", dest)
	}
	if err := os.RemoveAll(partial); err != nil {
		return "", err
	}
	if err := os.Mkdir(partial, 0o755); err != nil {
		return "", err
	}

	dbCopy := filepath.Join(partial, "wuzzanext.db")
	if err := vacuumInto(dbPath, dbCopy); err != nil {
		return "", fmt.Errorf("database copy: %w", err)
	}
	if err := integrityCheck(dbCopy); err != nil {
		return "", fmt.Errorf("database copy check: %w", err)
	}

	if uploadsDir != "" {
		if info, err := os.Stat(uploadsDir); err == nil && info.IsDir() {
			if err := copyTree(uploadsDir, filepath.Join(partial, "uploads")); err != nil {
				return "", fmt.Errorf("uploads copy: %w", err)
			}
		}
	}

	if err := os.Rename(partial, dest); err != nil {
		return "", err
	}
	if err := prune(to, keepDays, now, dest); err != nil {
		return dest, fmt.Errorf("removing old copies: %w", err)
	}
	return dest, nil
}

func open(path string) (*gorm.DB, error) {
	return gorm.Open(sqlite.Open(path+"?_pragma=busy_timeout(10000)"), &gorm.Config{
		Logger: logger.Discard,
	})
}

func vacuumInto(src, dst string) error {
	db, err := open(src)
	if err != nil {
		return err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer sqlDB.Close()
	return db.Exec("VACUUM INTO ?", dst).Error
}

func integrityCheck(path string) error {
	db, err := open(path)
	if err != nil {
		return err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer sqlDB.Close()
	var result string
	if err := db.Raw("PRAGMA integrity_check").Scan(&result).Error; err != nil {
		return err
	}
	if result != "ok" {
		return fmt.Errorf("integrity_check says %q", result)
	}
	return nil
}

func copyTree(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		if !d.Type().IsRegular() {
			return nil
		}
		return copyFile(path, target)
	})
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// prune removes this tool's copies (and leftover .partial folders) older than
// keepDays. keep, the copy just made, always stays.
func prune(to string, keepDays int, now time.Time, keep string) error {
	entries, err := os.ReadDir(to)
	if err != nil {
		return err
	}
	cutoff := now.AddDate(0, 0, -keepDays)
	var old []string
	for _, e := range entries {
		m := copyName.FindStringSubmatch(e.Name())
		if !e.IsDir() || m == nil {
			continue
		}
		path := filepath.Join(to, e.Name())
		if path == keep {
			continue
		}
		made, err := time.ParseInLocation(stamp, m[1], now.Location())
		if err != nil || !made.Before(cutoff) {
			continue
		}
		old = append(old, path)
	}
	sort.Strings(old)
	for _, path := range old {
		if err := os.RemoveAll(path); err != nil {
			return err
		}
	}
	return nil
}
