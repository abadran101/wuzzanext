package repo

import (
	"context"

	cModel "donetick.com/core/internal/circle/model"
	uModel "donetick.com/core/internal/user/model"
)

func (r *CircleRepository) CanAccessMenuItems(ctx context.Context, circleID, userID int, admin bool) (bool, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&cModel.UserCircle{}).
		Where("circle_id = ? AND user_id = ? AND is_active = ?", circleID, userID, true).
		Where("user_id IN (?)", r.db.Model(&uModel.User{}).Select("id").Where("disabled = ?", false))
	if admin {
		query = query.Where("role = ?", cModel.UserRoleAdmin)
	}
	err := query.Count(&count).Error
	return count == 1, err
}

func (r *CircleRepository) SetMemberMenuItems(ctx context.Context, circleID int, items string) error {
	return r.db.WithContext(ctx).Model(&cModel.Circle{}).Where("id = ?", circleID).Update("member_menu_items", items).Error
}
