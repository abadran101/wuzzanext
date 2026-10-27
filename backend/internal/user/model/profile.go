package user

// ProfileColours is the shared palette for household profiles.
var ProfileColours = [...]string{
	"#ef767a", "#f4a261", "#e9c46a", "#8ab17d",
	"#2a9d8f", "#69a2d5", "#a78bca", "#df92b3",
}

func IsProfileColour(colour string) bool {
	for _, candidate := range ProfileColours {
		if colour == candidate {
			return true
		}
	}
	return false
}
