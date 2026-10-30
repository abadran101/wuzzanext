package frontend

import (
	"net/http"
	"os"
	"path/filepath"

	"donetick.com/core/config"
	"github.com/gin-gonic/gin"
)

// apkName is the only file offered; nothing else in the folder is reachable.
const apkName = "wuzzanext.apk"

// DownloadHandler offers the owner-signed Android app from server.downloads_dir
// (task 019). The owner puts the file there; the server never signs or builds it.
type DownloadHandler struct {
	Dir string
}

func NewDownloadHandler(cfg *config.Config) *DownloadHandler {
	return &DownloadHandler{Dir: cfg.Server.DownloadsDir}
}

func DownloadRoutes(router *gin.Engine, h *DownloadHandler) {
	serve := func(c *gin.Context) {
		path := filepath.Join(h.Dir, apkName)
		info, err := os.Stat(path)
		if h.Dir == "" || err != nil || !info.Mode().IsRegular() {
			c.Status(http.StatusNotFound)
			return
		}
		c.Header("Content-Type", "application/vnd.android.package-archive")
		c.Header("Cache-Control", "no-cache")
		c.FileAttachment(path, apkName)
	}
	router.GET("/download/"+apkName, serve)
	router.HEAD("/download/"+apkName, serve)
}
