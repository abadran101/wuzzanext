package storage

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAssetAnswerVariesByOrigin(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "profiles", "1"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "profiles", "1", "made-up.webp"), []byte("not a picture"), 0o644); err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &Handler{storage: &LocalStorage{BasePath: dir}}
	router.GET("/api/v1/assets/*filepath", h.AssetHandler)

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/assets/profiles/1/made-up.webp", nil))
	if rec.Code != http.StatusOK || rec.Body.String() != "not a picture" {
		t.Fatalf("status = %d body = %q", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Values("Vary"); len(got) != 1 || got[0] != "Origin" {
		t.Errorf("Vary = %q, want Origin", got)
	}
}
