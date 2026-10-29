package chore

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"donetick.com/core/config"
	chModel "donetick.com/core/internal/chore/model"
	chRepo "donetick.com/core/internal/chore/repo"
	cModel "donetick.com/core/internal/circle/model"
	cRepo "donetick.com/core/internal/circle/repo"
	"donetick.com/core/internal/database"
	dRepo "donetick.com/core/internal/device/repo"
	"donetick.com/core/internal/events"
	lRepo "donetick.com/core/internal/label/repo"
	"donetick.com/core/internal/notifier/push"
	nRepo "donetick.com/core/internal/notifier/repo"
	nps "donetick.com/core/internal/notifier/service"
	"donetick.com/core/internal/storage"
	storageModel "donetick.com/core/internal/storage/model"
	storageRepo "donetick.com/core/internal/storage/repo"
	stRepo "donetick.com/core/internal/subtask/repo"
	tRepo "donetick.com/core/internal/thing/repo"
	uModel "donetick.com/core/internal/user/model"
)

// newContentTestRouter has Alex (user 1, admin of circle 1) creating and
// editing chores, with local storage so picture clean-up runs.
func newContentTestRouter(t *testing.T) (*gin.Engine, *gorm.DB, *chRepo.ChoreRepository) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "content.db")), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	// One connection: the handler plans notifications in the background, and
	// SQLite refuses two writers at once.
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = sqlDB.Close() })
	require.NoError(t, database.Migration(db))
	require.NoError(t, db.Create(&cModel.UserCircle{UserID: 1, CircleID: 1, Role: cModel.UserRoleAdmin, IsActive: true}).Error)

	h := newContentTestHandler(t, db)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("id", &uModel.UserDetails{User: uModel.User{ID: 1, CircleID: 1}})
		c.Next()
	})
	router.POST("/chores", h.CreateChore)
	router.PUT("/chores", h.EditChore)
	return router, db, h.choreRepo
}

// newContentTestHandler builds a chore handler on db, with local storage.
func newContentTestHandler(t *testing.T, db *gorm.DB) *Handler {
	t.Helper()
	cfg := &config.Config{}
	cfg.Database.Type = "sqlite"
	cfg.Storage.BasePath = t.TempDir()
	circleRepository := cRepo.NewCircleRepository(db)
	eventProducer := events.NewEventsProducer(cfg)
	eventProducer.Start(context.Background())
	return &Handler{
		choreRepo:     chRepo.NewChoreRepository(db, cfg),
		circleRepo:    circleRepository,
		lRepo:         lRepo.NewLabelRepository(db, cfg),
		stRepo:        stRepo.NewSubTasksRepository(db),
		tRepo:         tRepo.NewThingRepository(db, cfg),
		storage:       storage.NewLocalStorage(cfg),
		storageRepo:   storageRepo.NewStorageRepository(db, cfg),
		nPlanner:      nps.NewNotificationPlanner(nRepo.NewNotificationRepository(db), circleRepository),
		eventProducer: eventProducer,
		pushSender:    push.NewSender(dRepo.NewDeviceRepository(db, cfg), nil),
	}
}

func sendChore(t *testing.T, router *gin.Engine, method string, body map[string]any) *httptest.ResponseRecorder {
	t.Helper()
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(method, "/chores", bytes.NewReader(raw)))
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	return recorder
}

func savedDoneMeans(t *testing.T, db *gorm.DB, choreID int) *string {
	t.Helper()
	var chore chModel.Chore
	require.NoError(t, db.First(&chore, choreID).Error)
	return chore.DoneMeans
}

func TestChoreDoneMeansCreateEditAndRead(t *testing.T) {
	router, db, repo := newContentTestRouter(t)

	recorder := sendChore(t, router, http.MethodPost, map[string]any{
		"name":           "Tidy the bedroom",
		"frequencyType":  chModel.FrequencyTypeOnce,
		"assignStrategy": chModel.AssignmentStrategyRandom,
		"description":    "<p>Toys in the box</p>",
		"doneMeans":      "<p>Floor clear, bed made</p>",
	})
	var created struct {
		Res int `json:"res"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &created))
	require.Equal(t, "<p>Floor clear, bed made</p>", *savedDoneMeans(t, db, created.Res))

	// The chore page reads the detail view, which carries the new text too.
	detail, err := repo.GetChoreDetailByID(context.Background(), created.Res, 1, 1)
	require.NoError(t, err)
	require.Equal(t, "<p>Floor clear, bed made</p>", *detail.DoneMeans)
	require.Equal(t, "<p>Toys in the box</p>", *detail.Description)
	// Someone in another circle doesn't get the chore, so not its text either.
	_, err = repo.GetChoreDetailByID(context.Background(), created.Res, 2, 6)
	require.Error(t, err)

	edit := map[string]any{
		"id":             created.Res,
		"name":           "Tidy the bedroom",
		"frequencyType":  chModel.FrequencyTypeOnce,
		"assignStrategy": chModel.AssignmentStrategyRandom,
		"description":    "<p>Toys in the box</p>",
		"doneMeans":      "<p>Floor clear</p>",
	}
	sendChore(t, router, http.MethodPut, edit)
	require.Equal(t, "<p>Floor clear</p>", *savedDoneMeans(t, db, created.Res))

	// An edit from an app that doesn't know the field keeps the saved text.
	delete(edit, "doneMeans")
	sendChore(t, router, http.MethodPut, edit)
	require.Equal(t, "<p>Floor clear</p>", *savedDoneMeans(t, db, created.Res))

	// An empty text clears it.
	edit["doneMeans"] = ""
	sendChore(t, router, http.MethodPut, edit)
	require.Equal(t, "", *savedDoneMeans(t, db, created.Res))
}

func TestChoreWithoutDoneMeansStaysEmpty(t *testing.T) {
	router, db, repo := newContentTestRouter(t)
	recorder := sendChore(t, router, http.MethodPost, map[string]any{
		"name":           "Feed the cat",
		"frequencyType":  chModel.FrequencyTypeOnce,
		"assignStrategy": chModel.AssignmentStrategyRandom,
	})
	var created struct {
		Res int `json:"res"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &created))
	require.Nil(t, savedDoneMeans(t, db, created.Res))

	detail, err := repo.GetChoreDetailByID(context.Background(), created.Res, 1, 1)
	require.NoError(t, err)
	require.Nil(t, detail.DoneMeans)

	raw, err := json.Marshal(chModel.Chore{ID: created.Res, Name: "Feed the cat"})
	require.NoError(t, err)
	require.NotContains(t, string(raw), "doneMeans", "old chores look the same to the app")
}

// Pictures in "Done means" share the description's storage, so saving the
// chore must not delete them as unreferenced.
func TestChorePicturesInBothTextsAreKept(t *testing.T) {
	router, db, _ := newContentTestRouter(t)
	chore := chModel.Chore{Name: "Tidy the bedroom", FrequencyType: chModel.FrequencyTypeOnce,
		AssignStrategy: chModel.AssignmentStrategyRandom, CircleID: 1, CreatedBy: 1, IsActive: true}
	require.NoError(t, db.Create(&chore).Error)
	for _, path := range []string{"users/1/how.jpg", "users/1/done.jpg"} {
		require.NoError(t, db.Create(&storageModel.StorageFile{FilePath: path, UserID: 1, EntityID: chore.ID,
			EntityType: storageModel.EntityTypeChoreDescription, SizeBytes: 10}).Error)
	}
	files := func() []string {
		t.Helper()
		var paths []string
		require.NoError(t, db.Model(&storageModel.StorageFile{}).Order("file_path").Pluck("file_path", &paths).Error)
		return paths
	}

	edit := map[string]any{
		"id":             chore.ID,
		"name":           "Tidy the bedroom",
		"frequencyType":  chModel.FrequencyTypeOnce,
		"assignStrategy": chModel.AssignmentStrategyRandom,
		"description":    `<p><img src="https://example.test/users/1/how.jpg?sig=1" dt-data-path="users/1/how.jpg"></p>`,
		"doneMeans":      `<p><img src="https://example.test/users/1/done.jpg?sig=1" dt-data-path="users/1/done.jpg"></p>`,
	}
	sendChore(t, router, http.MethodPut, edit)
	require.Equal(t, []string{"users/1/done.jpg", "users/1/how.jpg"}, files())

	// Omitted "Done means" keeps its picture too.
	delete(edit, "doneMeans")
	sendChore(t, router, http.MethodPut, edit)
	require.Equal(t, []string{"users/1/done.jpg", "users/1/how.jpg"}, files())

	// Removing the picture from "Done means" removes the file.
	edit["doneMeans"] = "<p>Floor clear</p>"
	sendChore(t, router, http.MethodPut, edit)
	require.Equal(t, []string{"users/1/how.jpg"}, files())
}

func TestChoreText(t *testing.T) {
	description, doneMeans := "a", "b"
	require.Equal(t, "", choreText(nil, nil))
	require.Equal(t, "a", choreText(&description, nil))
	require.Equal(t, "b", choreText(nil, &doneMeans))
	require.Equal(t, "a\nb", choreText(&description, &doneMeans))
}
