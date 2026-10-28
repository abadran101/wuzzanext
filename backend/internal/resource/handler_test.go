package resource

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"donetick.com/core/config"
	"github.com/gin-gonic/gin"
)

// TestResourceExposesDisablePasswordAuth verifies the resource endpoint
// surfaces the disable_password_auth flag so the client can hide password
// login (#438).
func TestResourceExposesDisablePasswordAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	for _, want := range []bool{true, false} {
		h := NewHandler(&config.Config{DisablePasswordAuth: want})
		r := gin.New()
		r.GET("api/v1/resource", h.getResource)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/resource", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("got %d", w.Code)
		}
		var body struct {
			DisablePasswordAuth bool `json:"disable_password_auth"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if body.DisablePasswordAuth != want {
			t.Errorf("disable_password_auth = %v, want %v", body.DisablePasswordAuth, want)
		}
	}
}

// TestResourceTranslationEnabled verifies the client learns whether it may ask
// for translations, and that the key itself never appears in the answer.
func TestResourceTranslationEnabled(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cases := []struct {
		name string
		tc   config.TranslationConfig
		want bool
	}{
		{"off", config.TranslationConfig{}, false},
		{"on without key", config.TranslationConfig{Enabled: true, Provider: "google"}, false},
		{"on with key", config.TranslationConfig{Enabled: true, Provider: "google", APIKey: "test-key-not-real"}, true},
		{"fake", config.TranslationConfig{Enabled: true, Provider: "fake"}, true},
	}
	for _, tc := range cases {
		h := NewHandler(&config.Config{Translation: tc.tc})
		r := gin.New()
		r.GET("api/v1/resource", h.getResource)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/resource", nil))

		var body struct {
			TranslationEnabled bool `json:"translation_enabled"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatalf("%s: decode: %v", tc.name, err)
		}
		if body.TranslationEnabled != tc.want {
			t.Errorf("%s: translation_enabled = %v, want %v", tc.name, body.TranslationEnabled, tc.want)
		}
		if strings.Contains(w.Body.String(), "test-key-not-real") {
			t.Errorf("%s: the key is in the answer", tc.name)
		}
	}
}
