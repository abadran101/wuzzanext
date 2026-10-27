package migrations

import (
	"context"

	uModel "donetick.com/core/internal/user/model"
	"gorm.io/gorm"
)

type BackfillProfileColours20261027 struct{}

func (BackfillProfileColours20261027) ID() string { return "20261027_backfill_profile_colours" }
func (BackfillProfileColours20261027) Description() string {
	return "Assign colours to existing profiles"
}
func (BackfillProfileColours20261027) Down(context.Context, *gorm.DB) error { return nil }
func (BackfillProfileColours20261027) Up(ctx context.Context, db *gorm.DB) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var users []uModel.User
		if err := tx.Select("id").Where("colour = '' OR colour IS NULL").Find(&users).Error; err != nil {
			return err
		}
		for _, user := range users {
			colour := uModel.ProfileColours[(user.ID-1)%len(uModel.ProfileColours)]
			if err := tx.Model(&uModel.User{}).Where("id = ? AND (colour = '' OR colour IS NULL)", user.ID).Update("colour", colour).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func init() { Register(BackfillProfileColours20261027{}) }
