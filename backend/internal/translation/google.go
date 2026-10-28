package translation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const googleEndpoint = "https://translation.googleapis.com/language/translate/v2"

// GoogleTranslator calls Cloud Translation v2 (basic model, "nmt"). The key goes
// in a header, never in the URL, and errors never include the key or the texts.
type GoogleTranslator struct {
	apiKey   string
	endpoint string
	client   *http.Client
}

func NewGoogleTranslator(apiKey string) *GoogleTranslator {
	return &GoogleTranslator{
		apiKey:   apiKey,
		endpoint: googleEndpoint,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (g *GoogleTranslator) Name() string { return "google" }

type googleResponse struct {
	Data struct {
		Translations []struct {
			TranslatedText         string `json:"translatedText"`
			DetectedSourceLanguage string `json:"detectedSourceLanguage"`
		} `json:"translations"`
	} `json:"data"`
}

func (g *GoogleTranslator) Translate(ctx context.Context, texts []string, format Format, target string) ([]Answer, error) {
	if len(texts) == 0 {
		return nil, nil
	}
	form := url.Values{}
	for _, text := range texts {
		form.Add("q", text)
	}
	form.Set("target", target)
	form.Set("format", string(format))
	form.Set("model", "nmt")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, errors.New("translation request could not be built")
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("X-Goog-Api-Key", g.apiKey)

	resp, err := g.client.Do(req)
	if err != nil {
		return nil, errors.New("translation service unreachable")
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, errors.New("translation response could not be read")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("translation service answered %d", resp.StatusCode)
	}
	var parsed googleResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, errors.New("translation response could not be parsed")
	}
	if len(parsed.Data.Translations) != len(texts) {
		return nil, errors.New("translation response has the wrong number of answers")
	}
	answers := make([]Answer, len(texts))
	for i, tr := range parsed.Data.Translations {
		answers[i] = Answer{Text: tr.TranslatedText, Detected: tr.DetectedSourceLanguage}
	}
	return answers, nil
}
