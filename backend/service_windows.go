//go:build windows

package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/svc"
)

// serviceName is the name the home server's service is installed under
// (docs/deployment-spec.md).
const serviceName = "Wuzzanext"

func isWindowsService() bool {
	ok, err := svc.IsWindowsService()
	return err == nil && ok
}

// runWindowsService runs the server under the Windows service manager. A
// service starts in System32, so the program's own folder becomes the working
// folder (config\selfhosted.yaml lives there), and output goes to a log file.
func runWindowsService() {
	exe, err := os.Executable()
	if err != nil {
		os.Exit(1)
	}
	if err := os.Chdir(filepath.Dir(exe)); err != nil {
		os.Exit(1)
	}
	redirectOutput()
	if err := svc.Run(serviceName, &service{}); err != nil {
		log.Printf("service: %v", err)
		os.Exit(1)
	}
}

// redirectOutput sends everything the server prints to DT_LOG_FILE (default
// logs\wuzzanext.log). A log over 20 MB is kept as .old at each start.
func redirectOutput() {
	path := os.Getenv("DT_LOG_FILE")
	if path == "" {
		path = filepath.Join("logs", "wuzzanext.log")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return
	}
	if info, err := os.Stat(path); err == nil && info.Size() > 20<<20 {
		_ = os.Rename(path, path+".old")
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return
	}
	_ = windows.SetStdHandle(windows.STD_OUTPUT_HANDLE, windows.Handle(f.Fd()))
	_ = windows.SetStdHandle(windows.STD_ERROR_HANDLE, windows.Handle(f.Fd()))
	os.Stdout, os.Stderr = f, f
	gin.DefaultWriter, gin.DefaultErrorWriter = f, f
	log.SetOutput(f)
}

type service struct{}

func (s *service) Execute(_ []string, requests <-chan svc.ChangeRequest, status chan<- svc.Status) (bool, uint32) {
	status <- svc.Status{State: svc.StartPending, WaitHint: 30000}

	app := newApp()
	if err := app.Err(); err != nil {
		log.Printf("service: wiring failed: %v", err)
		return true, 1
	}

	// Migrations can take minutes on first start: keep telling the service
	// manager the start is progressing.
	started := make(chan error, 1)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), app.StartTimeout())
		defer cancel()
		started <- app.Start(ctx)
	}()
	tick := time.NewTicker(10 * time.Second)
	defer tick.Stop()
wait:
	for checkpoint := uint32(1); ; checkpoint++ {
		select {
		case err := <-started:
			if err != nil {
				log.Printf("service: start failed: %v", err)
				return true, 2
			}
			break wait
		case <-tick.C:
			status <- svc.Status{State: svc.StartPending, CheckPoint: checkpoint, WaitHint: 30000}
		case req := <-requests:
			// Stop isn't accepted while starting; just answer status queries.
			if req.Cmd == svc.Interrogate {
				status <- req.CurrentStatus
			}
		}
	}

	status <- svc.Status{State: svc.Running, Accepts: svc.AcceptStop | svc.AcceptShutdown}
	for req := range requests {
		switch req.Cmd {
		case svc.Interrogate:
			status <- req.CurrentStatus
		case svc.Stop, svc.Shutdown:
			status <- svc.Status{State: svc.StopPending, WaitHint: 20000}
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			if err := app.Stop(ctx); err != nil {
				log.Printf("service: stop: %v", err)
			}
			cancel()
			return false, 0
		}
	}
	return false, 0
}
