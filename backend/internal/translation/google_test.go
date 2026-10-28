package translation

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"donetick.com/core/config"
	"github.com/stretchr/testify/require"
)

const testKey = "test-key-not-real"

func newTestGoogle(t *testing.T, handler http.HandlerFunc) *GoogleTranslator {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	g := NewGoogleTranslator(testKey)
	g.endpoint = server.URL
	return g
}

func TestGoogleTranslatorRequestAndAnswer(t *testing.T) {
	g := newTestGoogle(t, func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		require.Equal(t, testKey, r.Header.Get("X-Goog-Api-Key"))
		require.Empty(t, r.URL.RawQuery, "the key never goes in the URL")
		require.NoError(t, r.ParseForm())
		require.Equal(t, []string{"Sweep", "Mop"}, r.PostForm["q"])
		require.Equal(t, "ar", r.PostForm.Get("target"))
		require.Equal(t, "text", r.PostForm.Get("format"))
		require.Equal(t, "nmt", r.PostForm.Get("model"))
		require.Empty(t, r.PostForm.Get("source"), "Google detects the language")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"translations":[
			{"translatedText":"اكنس","detectedSourceLanguage":"en"},
			{"translatedText":"امسح","detectedSourceLanguage":"en"}]}}`))
	})

	answers, err := g.Translate(context.Background(), []string{"Sweep", "Mop"}, FormatText, "ar")
	require.NoError(t, err)
	require.Equal(t, []Answer{{Text: "اكنس", Detected: "en"}, {Text: "امسح", Detected: "en"}}, answers)
}

func TestGoogleTranslatorErrorsHideKeyAndText(t *testing.T) {
	g := newTestGoogle(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"error":{"message":"API key not valid"}}`))
	})
	_, err := g.Translate(context.Background(), []string{"Private words"}, FormatText, "ar")
	require.Error(t, err)
	require.Equal(t, "translation service answered 403", err.Error())
	require.NotContains(t, err.Error(), testKey)
	require.NotContains(t, err.Error(), "Private words")
}

func TestGoogleTranslatorWrongAnswerCount(t *testing.T) {
	g := newTestGoogle(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"data":{"translations":[]}}`))
	})
	_, err := g.Translate(context.Background(), []string{"Sweep"}, FormatText, "ar")
	require.Error(t, err)
}

func TestNewTranslatorFromConfig(t *testing.T) {
	cfg := &config.Config{}
	require.Nil(t, NewTranslator(cfg), "off by default")

	cfg.Translation.Enabled = true
	cfg.Translation.Provider = "google"
	require.Nil(t, NewTranslator(cfg), "no key, nothing is sent")

	cfg.Translation.APIKey = "  " + testKey + "  "
	g, ok := NewTranslator(cfg).(*GoogleTranslator)
	require.True(t, ok)
	require.Equal(t, testKey, g.apiKey)
	require.True(t, strings.HasPrefix(g.endpoint, "https://translation.googleapis.com/"))

	cfg.Translation.Provider = "fake"
	cfg.Translation.APIKey = ""
	require.IsType(t, FakeTranslator{}, NewTranslator(cfg))

	cfg.Translation.Provider = "something-else"
	require.Nil(t, NewTranslator(cfg))
}
