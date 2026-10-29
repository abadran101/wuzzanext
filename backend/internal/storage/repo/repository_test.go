package repo

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"donetick.com/core/config"
	errorx "donetick.com/core/internal/error"
	st "donetick.com/core/internal/storage/model"
	uModel "donetick.com/core/internal/user/model"
)

func newStorageTestRepo(t *testing.T, maxUserStorage int) (*StorageRepository, *gorm.DB) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = sqlDB.Close() })
	require.NoError(t, db.AutoMigrate(&st.StorageFile{}, &st.StorageUsage{}))
	cfg := &config.Config{}
	cfg.Storage.MaxUserStorage = maxUserStorage
	return NewStorageRepository(db, cfg), db
}

func usedBytes(t *testing.T, db *gorm.DB, userID int) int {
	t.Helper()
	var usage st.StorageUsage
	require.NoError(t, db.Where("user_id = ?", userID).First(&usage).Error)
	return usage.UsedBytes
}

// Sam is a family profile (PIN sign-in), created without a usage row. Their
// first picture starts one instead of being refused as "no space".
func TestAddMediaRecordStartsUsageForProfile(t *testing.T) {
	repo, db := newStorageTestRepo(t, 1000)
	sam := &uModel.UserDetails{User: uModel.User{ID: 2, CircleID: 1}}

	require.NoError(t, repo.AddMediaRecord(context.Background(),
		&st.StorageFile{FilePath: "users/2/a.jpg", UserID: 2, SizeBytes: 100}, sam))
	require.Equal(t, 100, usedBytes(t, db, 2))

	require.NoError(t, repo.AddMediaRecord(context.Background(),
		&st.StorageFile{FilePath: "users/2/b.jpg", UserID: 2, SizeBytes: 50}, sam))
	require.Equal(t, 150, usedBytes(t, db, 2))
}

func TestAddMediaRecordKeepsCircleQuota(t *testing.T) {
	repo, db := newStorageTestRepo(t, 1000)
	require.NoError(t, repo.CreateStorageUsage(context.Background(), 1, 1))
	require.NoError(t, db.Model(&st.StorageUsage{}).Where("user_id = 1").Update("used_bytes", 950).Error)
	sam := &uModel.UserDetails{User: uModel.User{ID: 2, CircleID: 1}}

	err := repo.AddMediaRecord(context.Background(),
		&st.StorageFile{FilePath: "users/2/a.jpg", UserID: 2, SizeBytes: 100}, sam)
	require.ErrorIs(t, err, errorx.ErrNotEnoughSpace)
	var files int64
	require.NoError(t, db.Model(&st.StorageFile{}).Count(&files).Error)
	require.Zero(t, files)
}
