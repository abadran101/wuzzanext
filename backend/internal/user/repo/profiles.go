package user

import (
	"context"
	"errors"
	"time"

	cModel "donetick.com/core/internal/circle/model"
	uModel "donetick.com/core/internal/user/model"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var ErrProfileCredentials = errors.New("invalid profile credentials")
var ErrProfilePermission = errors.New("profile permission denied")
var errProfileContention = errors.New("profile PIN state kept changing")

// Sensitive statements contain bcrypt hashes in their parameters. Suppress SQL
// logging for these operations, including error and slow-query logging.
func (r *UserRepository) pinDB(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx).Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)})
}

func (r *UserRepository) HouseholdCircle(ctx context.Context, configured int) (int, error) {
	if configured > 0 {
		return configured, nil
	}
	var circles []cModel.Circle
	if err := r.db.WithContext(ctx).Select("id").Limit(2).Find(&circles).Error; err != nil {
		return 0, err
	}
	if len(circles) == 1 {
		return circles[0].ID, nil
	}
	return 0, nil
}

func householdMembers(db *gorm.DB, circleID int) *gorm.DB {
	return db.Model(&uModel.User{}).Where("disabled = ? AND id IN (?)", false,
		db.Model(&cModel.UserCircle{}).Select("user_id").Where("circle_id = ? AND is_active = ?", circleID, true))
}

func (r *UserRepository) HouseholdProfiles(ctx context.Context, circleID int) ([]uModel.User, error) {
	users := make([]uModel.User, 0)
	if circleID == 0 {
		return users, nil
	}
	err := householdMembers(r.db.WithContext(ctx), circleID).Order("id").Find(&users).Error
	return users, err
}

// CheckProfilePIN uses a compare-and-swap inside a transaction. Every competing
// attempt must observe the previous attempt's state before it can update it.
// Hash verification happens outside the transaction to avoid holding a DB lock
// during bcrypt. The hash is included in the condition to detect PIN resets.
func (r *UserRepository) CheckProfilePIN(ctx context.Context, circleID, id int, verify func(string) bool) (*uModel.User, *time.Time, error) {
	if circleID == 0 {
		return nil, nil, ErrProfileCredentials
	}
	for try := 0; try < 10; try++ {
		if err := ctx.Err(); err != nil {
			return nil, nil, err
		}
		var user uModel.User
		if err := householdMembers(r.db.WithContext(ctx), circleID).Where("id = ?", id).First(&user).Error; err != nil {
			return nil, nil, err
		}
		if user.PINHash == "" {
			return nil, nil, ErrProfileCredentials
		}
		now := time.Now().UTC()
		if user.PINLockedUntil != nil && user.PINLockedUntil.After(now) {
			return nil, user.PINLockedUntil, nil
		}
		matched := verify(user.PINHash)
		attempts := user.PINFailedAttempts + 1
		var lockedUntil *time.Time
		if matched {
			attempts = 0
		} else if attempts >= 5 {
			until := now.Add(time.Minute)
			lockedUntil = &until
			attempts = 0
		}
		var affected int64
		err := r.pinDB(ctx).Transaction(func(tx *gorm.DB) error {
			query := householdMembers(tx, circleID).Where("id = ? AND pin_hash = ? AND pin_failed_attempts = ?", id, user.PINHash, user.PINFailedAttempts)
			if user.PINLockedUntil == nil {
				query = query.Where("pin_locked_until IS NULL")
			} else {
				query = query.Where("pin_locked_until = ?", user.PINLockedUntil)
			}
			result := query.Updates(map[string]interface{}{"pin_failed_attempts": attempts, "pin_locked_until": lockedUntil})
			affected = result.RowsAffected
			return result.Error
		})
		if err != nil {
			return nil, nil, err
		}
		if affected == 0 {
			continue
		}
		if !matched {
			return nil, nil, ErrProfileCredentials
		}
		user.PINFailedAttempts = 0
		user.PINLockedUntil = nil
		return &user, nil, nil
	}
	return nil, nil, errProfileContention
}

func (r *UserRepository) ChangeProfilePIN(ctx context.Context, user *uModel.User, hash string) error {
	result := r.pinDB(ctx).Model(&uModel.User{}).
		Where("id = ? AND pin_hash = ? AND password = ? AND disabled = ?", user.ID, user.PINHash, user.Password, false).
		Updates(map[string]interface{}{"pin_hash": hash, "pin_failed_attempts": 0, "pin_locked_until": nil})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return ErrProfileCredentials
	}
	return nil
}

func profileAdmin(db *gorm.DB, circleID, userID int) bool {
	if circleID == 0 {
		return false
	}
	var count int64
	err := db.Model(&cModel.UserCircle{}).Where("circle_id = ? AND user_id = ? AND is_active = ? AND role = ?", circleID, userID, true, cModel.UserRoleAdmin).
		Where("user_id IN (?)", db.Model(&uModel.User{}).Select("id").Where("disabled = ?", false)).Count(&count).Error
	return err == nil && count == 1
}

func (r *UserRepository) IsProfileAdmin(ctx context.Context, circleID, userID int) bool {
	return profileAdmin(r.db.WithContext(ctx), circleID, userID)
}

func (r *UserRepository) CreateHouseholdProfile(ctx context.Context, circleID, adminID int, user *uModel.User, role cModel.UserRole) error {
	return r.pinDB(ctx).Transaction(func(tx *gorm.DB) error {
		if !profileAdmin(tx, circleID, adminID) {
			return ErrProfilePermission
		}
		if err := tx.Create(user).Error; err != nil {
			return err
		}
		return tx.Create(&cModel.UserCircle{UserID: user.ID, CircleID: circleID, Role: role, IsActive: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}).Error
	})
}

func (r *UserRepository) ResetHouseholdPIN(ctx context.Context, circleID, adminID, id int, hash string) error {
	return r.pinDB(ctx).Transaction(func(tx *gorm.DB) error {
		if !profileAdmin(tx, circleID, adminID) {
			return ErrProfilePermission
		}
		result := householdMembers(tx, circleID).Where("id = ?", id).
			Updates(map[string]interface{}{"pin_hash": hash, "pin_failed_attempts": 0, "pin_locked_until": nil})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
}
