package chore

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	chModel "donetick.com/core/internal/chore/model"
	nRepo "donetick.com/core/internal/notifier/repo"
	uModel "donetick.com/core/internal/user/model"
)

// newChangeTimeTestRouter serves the chore routes the outbox replays, as the
// circle admin from newContentTestRouter (task 017).
func newChangeTimeTestRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
	t.Helper()
	_, db, choreRepository := newContentTestRouter(t)
	h := newContentTestHandler(t, db)
	h.choreRepo = choreRepository
	h.nRepo = nRepo.NewNotificationRepository(db)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("id", &uModel.UserDetails{User: uModel.User{ID: 1, CircleID: 1, Username: "made-up-admin"}})
		c.Next()
	})
	router.POST("/chores", h.CreateChore)
	router.PUT("/chores", h.EditChore)
	router.DELETE("/chores/:id", h.DeleteChore)
	router.POST("/chores/:id/do", h.CompleteChore)
	router.POST("/chores/:id/skip", h.SkipChore)
	router.PUT("/chores/:id/dueDate", h.UpdateDueDate)
	return router, db
}

func queued(t *testing.T, router *gin.Engine, method, path string, changedAt time.Time, body any) *httptest.ResponseRecorder {
	t.Helper()
	var raw []byte
	if body != nil {
		var err error
		raw, err = json.Marshal(body)
		require.NoError(t, err)
	}
	target := path + "?changedAt=" + url.QueryEscape(changedAt.UTC().Format(time.RFC3339Nano))
	req := httptest.NewRequest(method, target, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)
	return recorder
}

// createChangeTimeChore makes a daily chore whose last change was at lastChange.
func createChangeTimeChore(t *testing.T, router *gin.Engine, db *gorm.DB, lastChange time.Time) int {
	t.Helper()
	raw, err := json.Marshal(map[string]any{
		"name":           "Feed the made-up fish",
		"frequencyType":  chModel.FrequencyTypeDaily,
		"frequency":      1,
		"assignStrategy": chModel.AssignmentStrategyKeepLastAssigned,
		"assignedTo":     1,
		"assignees":      []map[string]any{{"userId": 1}},
		"nextDueDate":    time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339),
	})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/chores", bytes.NewReader(raw))
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var res struct {
		Res int `json:"res"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &res))
	require.NoError(t, db.Model(&chModel.Chore{}).Where("id = ?", res.Res).UpdateColumn("updated_at", lastChange).Error)
	return res.Res
}

func editBody(id int, name string) map[string]any {
	return map[string]any{
		"id":             id,
		"name":           name,
		"frequencyType":  chModel.FrequencyTypeDaily,
		"frequency":      1,
		"assignStrategy": chModel.AssignmentStrategyKeepLastAssigned,
		"assignedTo":     1,
		"assignees":      []map[string]any{{"userId": 1}},
		// What the phone last saw: older than the chore's last change, which
		// upstream would refuse. A queued change is judged by its own time.
		"updatedAt": time.Now().UTC().Add(-48 * time.Hour).Format(time.RFC3339),
	}
}

func storedChore(t *testing.T, db *gorm.DB, id int) chModel.Chore {
	t.Helper()
	var chore chModel.Chore
	require.NoError(t, db.First(&chore, id).Error)
	return chore
}

func requireSuperseded(t *testing.T, recorder *httptest.ResponseRecorder) {
	t.Helper()
	require.Equal(t, http.StatusConflict, recorder.Code, recorder.Body.String())
	var body map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &body))
	require.Equal(t, true, body["superseded"])
}

// Two phones edited the same chore offline; the one made last wins, whichever
// reaches the server first.
func TestQueuedEditsMostRecentWins(t *testing.T) {
	router, db := newChangeTimeTestRouter(t)
	now := time.Now().UTC()
	id := createChangeTimeChore(t, router, db, now.Add(-3*time.Hour))

	later := queued(t, router, http.MethodPut, "/chores", now.Add(-1*time.Hour), editBody(id, "Later edit"))
	require.Equal(t, http.StatusOK, later.Code, later.Body.String())
	stored := storedChore(t, db, id)
	require.Equal(t, "Later edit", stored.Name)
	require.WithinDuration(t, now.Add(-1*time.Hour), stored.UpdatedAt, time.Second, "the phone's time is the last change")

	older := queued(t, router, http.MethodPut, "/chores", now.Add(-2*time.Hour), editBody(id, "Older edit"))
	requireSuperseded(t, older)
	require.Equal(t, "Later edit", storedChore(t, db, id).Name)

	newer := queued(t, router, http.MethodPut, "/chores", now.Add(-30*time.Minute), editBody(id, "Newest edit"))
	require.Equal(t, http.StatusOK, newer.Code, newer.Body.String())
	require.Equal(t, "Newest edit", storedChore(t, db, id).Name)
}

func TestQueuedDueDateAndSkipFollowTheRule(t *testing.T) {
	router, db := newChangeTimeTestRouter(t)
	now := time.Now().UTC()
	id := createChangeTimeChore(t, router, db, now.Add(-1*time.Hour))

	due := map[string]any{
		"dueDate":   now.Add(72 * time.Hour).Format(time.RFC3339),
		"updatedAt": now.Add(-48 * time.Hour).Format(time.RFC3339),
	}
	requireSuperseded(t, queued(t, router, http.MethodPut, fmt.Sprintf("/chores/%d/dueDate", id), now.Add(-2*time.Hour), due))
	requireSuperseded(t, queued(t, router, http.MethodPost, fmt.Sprintf("/chores/%d/skip", id), now.Add(-2*time.Hour), map[string]any{}))

	moved := queued(t, router, http.MethodPut, fmt.Sprintf("/chores/%d/dueDate", id), now.Add(-30*time.Minute), due)
	require.Equal(t, http.StatusOK, moved.Code, moved.Body.String())
	require.WithinDuration(t, now.Add(72*time.Hour), *storedChore(t, db, id).NextDueDate, time.Second)
}

// A delete wins over an older edit, whichever order they arrive in; a delete
// older than the chore's last change loses.
func TestQueuedDeleteBeatsOlderEdit(t *testing.T) {
	router, db := newChangeTimeTestRouter(t)
	now := time.Now().UTC()

	id := createChangeTimeChore(t, router, db, now.Add(-3*time.Hour))
	deleted := queued(t, router, http.MethodDelete, fmt.Sprintf("/chores/%d", id), now.Add(-1*time.Hour), nil)
	require.Equal(t, http.StatusOK, deleted.Code, deleted.Body.String())
	gone := queued(t, router, http.MethodPut, "/chores", now.Add(-2*time.Hour), editBody(id, "Too late"))
	require.Equal(t, http.StatusNotFound, gone.Code, "an edit to a deleted chore is answered so the phone drops it: %s", gone.Body.String())

	id = createChangeTimeChore(t, router, db, now.Add(-3*time.Hour))
	edited := queued(t, router, http.MethodPut, "/chores", now.Add(-2*time.Hour), editBody(id, "Edited first"))
	require.Equal(t, http.StatusOK, edited.Code, edited.Body.String())
	deleted = queued(t, router, http.MethodDelete, fmt.Sprintf("/chores/%d", id), now.Add(-1*time.Hour), nil)
	require.Equal(t, http.StatusOK, deleted.Code, deleted.Body.String())

	id = createChangeTimeChore(t, router, db, now.Add(-1*time.Hour))
	requireSuperseded(t, queued(t, router, http.MethodDelete, fmt.Sprintf("/chores/%d", id), now.Add(-2*time.Hour), nil))
	require.Equal(t, "Feed the made-up fish", storedChore(t, db, id).Name)
}

// A completion made offline is kept even when the chore changed after it, and
// it counts from the time it was done on the phone.
func TestQueuedCompletionIsKept(t *testing.T) {
	router, db := newChangeTimeTestRouter(t)
	now := time.Now().UTC()
	id := createChangeTimeChore(t, router, db, now.Add(-10*time.Minute))

	doneAt := now.Add(-1 * time.Hour)
	done := queued(t, router, http.MethodPost, fmt.Sprintf("/chores/%d/do", id), doneAt, map[string]any{"notes": "<p>Fed</p>"})
	require.Equal(t, http.StatusOK, done.Code, done.Body.String())
	history := latestHistory(t, db, id)
	require.Equal(t, chModel.ChoreHistoryStatusCompleted, history.Status)
	require.WithinDuration(t, doneAt, *history.PerformedAt, time.Second)
	require.False(t, storedChore(t, db, id).UpdatedAt.Before(now.Add(-10*time.Minute)), "a kept completion never moves the last change back")
}

func TestQueuedChangeFromTheFutureIsRefused(t *testing.T) {
	router, db := newChangeTimeTestRouter(t)
	now := time.Now().UTC()
	id := createChangeTimeChore(t, router, db, now.Add(-1*time.Hour))

	refused := queued(t, router, http.MethodPut, "/chores", now.Add(5*time.Minute), editBody(id, "From the future"))
	require.Equal(t, http.StatusBadRequest, refused.Code, refused.Body.String())
	require.Equal(t, "Feed the made-up fish", storedChore(t, db, id).Name)

	soon := queued(t, router, http.MethodPut, "/chores", now.Add(10*time.Second), editBody(id, "Clock a little fast"))
	require.Equal(t, http.StatusOK, soon.Code, "up to 30 seconds ahead is accepted, as upstream: %s", soon.Body.String())
}
