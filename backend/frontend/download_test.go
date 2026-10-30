package frontend

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func download(t *testing.T, dir, method, path string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	DownloadRoutes(router, &DownloadHandler{Dir: dir})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func TestApkIsOfferedWhenPlaced(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "wuzzanext.apk"), []byte("made-up apk"), 0o644); err != nil {
		t.Fatal(err)
	}
	rec := download(t, dir, http.MethodGet, "/download/wuzzanext.apk")
	if rec.Code != http.StatusOK || rec.Body.String() != "made-up apk" {
		t.Fatalf("status = %d body = %q", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Content-Type"); got != "application/vnd.android.package-archive" {
		t.Errorf("Content-Type = %q", got)
	}
	if got := rec.Header().Get("Content-Disposition"); got != `attachment; filename="wuzzanext.apk"` {
		t.Errorf("Content-Disposition = %q", got)
	}
	if rec := download(t, dir, http.MethodHead, "/download/wuzzanext.apk"); rec.Code != http.StatusOK {
		t.Errorf("HEAD status = %d, want 200", rec.Code)
	}
}

func TestNoApkMeansNotFound(t *testing.T) {
	if rec := download(t, t.TempDir(), http.MethodGet, "/download/wuzzanext.apk"); rec.Code != http.StatusNotFound {
		t.Errorf("empty folder: status = %d, want 404", rec.Code)
	}
	if rec := download(t, "", http.MethodHead, "/download/wuzzanext.apk"); rec.Code != http.StatusNotFound {
		t.Errorf("no folder set: status = %d, want 404", rec.Code)
	}
}

func TestOnlyTheApkIsReachable(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "notes.txt"), []byte("private"), 0o644); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/download/notes.txt", "/download/../download/notes.txt", "/download/"} {
		if rec := download(t, dir, http.MethodGet, path); rec.Code == http.StatusOK {
			t.Errorf("%s: status 200, want it unreachable", path)
		}
	}
}
