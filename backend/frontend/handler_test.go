package frontend

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gin-gonic/gin"
)

func serve(t *testing.T, dist fstest.MapFS, path string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	saved := files
	files = dist
	t.Cleanup(func() { files = saved })

	router := gin.New()
	Routes(router, &Handler{ServeFrontend: true})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestSourceArchiveIsServedWhenBuiltIn(t *testing.T) {
	archive := []byte{0x1f, 0x8b, 0x08, 0x00, 'm', 'a', 'd', 'e', '-', 'u', 'p'}
	rec := serve(t, fstest.MapFS{
		"dist/index.html":              {Data: []byte("<html>app</html>")},
		"dist/wuzzanext-source.tar.gz": {Data: archive},
	}, "/wuzzanext-source.tar.gz")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	// Go's MIME table says application/gzip; Windows' registry may say application/x-gzip.
	if got := rec.Header().Get("Content-Type"); !strings.Contains(got, "gzip") {
		t.Errorf("Content-Type = %q, want a gzip type", got)
	}
	if rec.Body.String() != string(archive) {
		t.Errorf("body is not the archive")
	}
}

func TestMissingSourceArchiveIsNotTheAppShell(t *testing.T) {
	rec := serve(t, fstest.MapFS{
		"dist/index.html": {Data: []byte("<html>app</html>")},
	}, "/wuzzanext-source.tar.gz")

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "<html>") {
		t.Errorf("body = %q, want no app shell", rec.Body.String())
	}
}

func TestOtherPathsStillGetTheAppShell(t *testing.T) {
	rec := serve(t, fstest.MapFS{
		"dist/index.html": {Data: []byte("<html>app</html>")},
	}, "/about")

	if rec.Code != http.StatusOK || rec.Body.String() != "<html>app</html>" {
		t.Fatalf("status = %d body = %q, want the app shell", rec.Code, rec.Body.String())
	}
}
