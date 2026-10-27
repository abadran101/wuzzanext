package user

import (
	"testing"
	"time"
)

func TestIsPlusMember(t *testing.T) {
	parentID := 1
	expired := time.Date(2000, time.January, 1, 0, 0, 0, 0, time.UTC)
	for name, user := range map[string]User{
		"parent":  {UserType: UserTypeParent},
		"child":   {UserType: UserTypeChild, ParentUserID: &parentID},
		"expired": {UserType: UserTypeParent, Expiration: &expired},
	} {
		t.Run(name, func(t *testing.T) {
			if !user.IsPlusMember() {
				t.Fatal("every account must have access to all features")
			}
		})
	}
}
