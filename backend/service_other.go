//go:build !windows

package main

// The Windows service mode (service_windows.go) does not exist elsewhere.
func isWindowsService() bool { return false }

func runWindowsService() {}
