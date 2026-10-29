package chore

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestWithRejectionNote(t *testing.T) {
	str := func(s string) *string { return &s }
	photo := `<p>Watered</p><p><img src="x.jpg" dt-data-path="users/3/x.jpg"></p>`

	require.Equal(t, "<p>👎 Soil still dry</p>"+photo, *withRejectionNote(str(photo), str("<p>Soil still dry</p>")))
	require.Equal(t, "<p>👎 Soil still dry</p>", *withRejectionNote(nil, str("Soil still dry")))
	require.Equal(t, photo, *withRejectionNote(str(photo), nil), "no note keeps the doer's note")
	require.Equal(t, photo, *withRejectionNote(str(photo), str("  ")), "a blank note keeps the doer's note")
	require.Nil(t, withRejectionNote(nil, nil))
}
