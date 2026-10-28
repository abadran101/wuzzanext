package translation

import (
	"context"
	"unicode"
)

// FakeTranslator is for local testing: it marks the text instead of translating
// it and never connects out.
type FakeTranslator struct{}

func (FakeTranslator) Name() string { return "fake" }

func (FakeTranslator) Translate(_ context.Context, texts []string, _ Format, target string) ([]Answer, error) {
	answers := make([]Answer, len(texts))
	for i, text := range texts {
		detected := detectScript(text)
		if detected == target {
			answers[i] = Answer{Text: text, Detected: detected}
			continue
		}
		answers[i] = Answer{Text: "[" + target + "] " + text, Detected: detected}
	}
	return answers, nil
}

// detectScript says "ar" when the text has Arabic letters, otherwise "en".
func detectScript(text string) string {
	for _, r := range text {
		if unicode.Is(unicode.Arabic, r) {
			return "ar"
		}
	}
	return "en"
}
