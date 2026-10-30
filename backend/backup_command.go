package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"donetick.com/core/internal/backup"
)

// runBackup is `wuzzanext.exe backup -to <folder>`: the nightly copy of the
// database and the uploads (internal/backup). It needs no configuration or
// secrets, so a scheduled task can run it while the service is running.
func runBackup(args []string) int {
	flags := flag.NewFlagSet("backup", flag.ContinueOnError)
	defaultDB := os.Getenv("DT_SQLITE_PATH")
	if defaultDB == "" {
		defaultDB = "donetick.db"
	}
	dbPath := flags.String("db", defaultDB, "SQLite database file (default: DT_SQLITE_PATH, else donetick.db)")
	uploads := flags.String("uploads", "uploads", "uploaded pictures folder (storage.base_path)")
	to := flags.String("to", "", "folder that holds the dated copies (required)")
	keep := flags.Int("keep", 14, "days of copies to keep")
	if err := flags.Parse(args); err != nil {
		return 2
	}
	if *to == "" {
		fmt.Fprintln(os.Stderr, "backup: -to is required")
		flags.Usage()
		return 2
	}

	dest, err := backup.Run(*dbPath, *uploads, *to, *keep, time.Now())
	if err != nil {
		fmt.Fprintf(os.Stderr, "backup failed: %v\n", err)
		return 1
	}
	fmt.Printf("backup ok: %s\n", dest)
	return 0
}
