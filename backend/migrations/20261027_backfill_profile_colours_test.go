package migrations

import (
	"context"
	"testing"

	uModel "donetick.com/core/internal/user/model"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestProfileColourBackfillIdempotent(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()
	if err := db.AutoMigrate(&uModel.User{}); err != nil {
		t.Fatal(err)
	}
	users := []uModel.User{{Username: "alex", DisplayName: "Alex"}, {Username: "sam", DisplayName: "Sam", Colour: uModel.ProfileColours[5]}}
	if err := db.Create(&users).Error; err != nil {
		t.Fatal(err)
	}
	m := BackfillProfileColours20261027{}
	registered := false
	for _, script := range registry {
		if script.ID() == m.ID() {
			registered = true
		}
	}
	if !registered {
		t.Fatal("migration not registered")
	}
	for i := 0; i < 2; i++ {
		if err := m.Up(context.Background(), db); err != nil {
			t.Fatal(err)
		}
		var saved []uModel.User
		if err := db.Order("id").Find(&saved).Error; err != nil {
			t.Fatal(err)
		}
		if !uModel.IsProfileColour(saved[0].Colour) || saved[1].Colour != users[1].Colour || saved[0].PINHash != "" || saved[1].PINHash != "" {
			t.Fatal("invalid backfill")
		}
		if i == 0 {
			users[0].Colour = saved[0].Colour
		} else if users[0].Colour != saved[0].Colour {
			t.Fatal("not idempotent")
		}
	}
}
