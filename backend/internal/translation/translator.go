// Package translation shows family-typed text (chore names and details) in the
// reader's language. The home server asks the configured provider once per text
// and keeps the answer; see docs/translation-setup.md.
package translation

import "context"

// Format tells the provider whether the text is plain text or HTML.
type Format string

const (
	FormatText Format = "text"
	FormatHTML Format = "html"
)

// Answer is the provider's answer for one text.
type Answer struct {
	Text     string
	Detected string // detected source language, e.g. "en"
}

// Translator sends texts to a translation provider. Answers come back in the
// order of texts.
type Translator interface {
	Name() string
	Translate(ctx context.Context, texts []string, format Format, target string) ([]Answer, error)
}
