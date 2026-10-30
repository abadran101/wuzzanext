package frontend

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"donetick.com/core/config"
	"github.com/gin-gonic/gin"
)

//go:embed dist
var embeddedFiles embed.FS

// files is what the server serves; tests swap in their own.
var files fs.FS = embeddedFiles

type Handler struct {
	ServeFrontend bool
}

func NewHandler(config *config.Config) *Handler {
	return &Handler{
		ServeFrontend: config.Server.ServeFrontend,
	}
}

func Routes(router *gin.Engine, h *Handler) {
	// this whole logic is walkaround for serving frontend files
	// TODO: figure out better way to improve it. main issue i run into is failing over to index.html when file does not exist

	if h.ServeFrontend {
		// if file exists in dist folder, serve it
		router.Use(staticMiddleware("dist"))
		// if file does not exist in dist folder fallback to index.html
		router.NoRoute(staticMiddlewareNoRoute("dist"))

	}

}

func staticMiddleware(root string) gin.HandlerFunc {
	fileServer := http.FileServer(getFileSystem(root))

	return func(c *gin.Context) {
		_, err := fs.Stat(files, "dist"+c.Request.URL.Path)
		if err != nil {
			c.Next()
			return
		}
		// Cache-busted assets (filenames contain content hashes) can be
		// cached indefinitely. Other files like index.html must not be
		// cached so that updates are picked up immediately.
		if strings.HasPrefix(c.Request.URL.Path, "/assets/") {
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		}
		fileServer.ServeHTTP(c.Writer, c.Request)

	}
}
func staticMiddlewareNoRoute(root string) gin.HandlerFunc {
	fileServer := http.FileServer(getFileSystem(root))

	// always serve index.html for any route does not match:
	return func(c *gin.Context) {
		// A missing source archive must return 404, never the app shell.
		if c.Request.URL.Path == "/wuzzanext-source.tar.gz" {
			c.Status(http.StatusNotFound)
			return
		}
		// Rewrite all requests to serve index.html
		c.Request.URL.Path = "/"
		fileServer.ServeHTTP(c.Writer, c.Request)

	}
}

func getFileSystem(path string) http.FileSystem {
	fs, err := fs.Sub(files, path)
	if err != nil {
		panic(err)
	}
	return http.FS(fs)
}
