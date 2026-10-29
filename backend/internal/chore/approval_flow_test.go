package chore

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	chModel "donetick.com/core/internal/chore/model"
	cModel "donetick.com/core/internal/circle/model"
	uModel "donetick.com/core/internal/user/model"
)

const (
	flowAlex  = 1 // admin who owns the circle (from newContentTestRouter)
	flowSam   = 2 // family member who gives out the chore
	flowKim   = 3 // family member who does it
	flowRiley = 4 // family member with nothing to do with it
)

// newApprovalTestRouter serves the chore routes as whichever family member the
// X-Test-User header names.
func newApprovalTestRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
	t.Helper()
	_, db, choreRepository := newContentTestRouter(t)
	for _, id := range []int{flowAlex, flowSam, flowKim, flowRiley} {
		require.NoError(t, db.Create(&uModel.User{ID: id, Username: fmt.Sprintf("member%d", id), CircleID: 1}).Error)
		if id != flowAlex {
			require.NoError(t, db.Create(&cModel.UserCircle{UserID: id, CircleID: 1, Role: cModel.UserRoleMember, IsActive: true}).Error)
		}
	}
	h := newContentTestHandler(t, db)
	h.choreRepo = choreRepository

	router := gin.New()
	router.Use(func(c *gin.Context) {
		id, _ := strconv.Atoi(c.GetHeader("X-Test-User"))
		c.Set("id", &uModel.UserDetails{User: uModel.User{ID: id, CircleID: 1, Username: fmt.Sprintf("member%d", id)}})
		c.Next()
	})
	router.POST("/chores", h.CreateChore)
	router.POST("/chores/:id/do", h.CompleteChore)
	router.POST("/chores/:id/approve", h.ApproveChore)
	router.POST("/chores/:id/reject", h.RejectChore)
	return router, db
}

func asMember(t *testing.T, router *gin.Engine, user int, path string, body map[string]any) *httptest.ResponseRecorder {
	t.Helper()
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(raw))
	req.Header.Set("X-Test-User", strconv.Itoa(user))
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)
	return recorder
}

func choreStatus(t *testing.T, db *gorm.DB, id int) chModel.Status {
	t.Helper()
	var chore chModel.Chore
	require.NoError(t, db.First(&chore, id).Error)
	return chore.Status
}

func latestHistory(t *testing.T, db *gorm.DB, id int) chModel.ChoreHistory {
	t.Helper()
	var history chModel.ChoreHistory
	require.NoError(t, db.Where("chore_id = ?", id).Order("id desc").First(&history).Error)
	return history
}

// Sam gives Kim a chore that asks for a thumbs up: Kim's done photo waits, Riley
// can't decide on it, Sam can, and the points land on approval.
func TestCreatorApprovesAndRejectsWithoutBeingAdmin(t *testing.T) {
	router, db := newApprovalTestRouter(t)

	created := asMember(t, router, flowSam, "/chores", map[string]any{
		"name":            "Water the plants",
		"frequencyType":   chModel.FrequencyTypeDaily,
		"frequency":       1,
		"assignStrategy":  chModel.AssignmentStrategyKeepLastAssigned,
		"assignedTo":      flowKim,
		"assignees":       []map[string]any{{"userId": flowKim}},
		"requireApproval": true,
		"points":          5,
	})
	require.Equal(t, http.StatusOK, created.Code, created.Body.String())
	var res struct {
		Res int `json:"res"`
	}
	require.NoError(t, json.Unmarshal(created.Body.Bytes(), &res))
	id := res.Res
	base := fmt.Sprintf("/chores/%d", id)

	photo := `<p><img src="users/3/a.jpg" dt-data-path="users/3/a.jpg"></p>`
	done := asMember(t, router, flowKim, base+"/do", map[string]any{"notes": photo})
	require.Equal(t, http.StatusOK, done.Code, done.Body.String())
	require.Equal(t, chModel.ChoreStatusPendingApproval, choreStatus(t, db, id))
	pending := latestHistory(t, db, id)
	require.Equal(t, chModel.ChoreHistoryStatusPendingApproval, pending.Status)
	require.Equal(t, photo, *pending.Note, "the done photo travels with the completion")

	for _, action := range []string{"/approve", "/reject"} {
		refused := asMember(t, router, flowRiley, base+action, map[string]any{})
		require.Equal(t, http.StatusForbidden, refused.Code, "a member who did not give out the chore: %s", action)
		refused = asMember(t, router, flowKim, base+action, map[string]any{})
		require.Equal(t, http.StatusForbidden, refused.Code, "the one who did it: %s", action)
	}
	require.Equal(t, chModel.ChoreStatusPendingApproval, choreStatus(t, db, id))

	approved := asMember(t, router, flowSam, base+"/approve", map[string]any{})
	require.Equal(t, http.StatusOK, approved.Code, approved.Body.String())
	require.Equal(t, chModel.ChoreStatusNoStatus, choreStatus(t, db, id))
	completed := latestHistory(t, db, id)
	require.Equal(t, chModel.ChoreHistoryStatusCompleted, completed.Status)
	require.Equal(t, flowKim, completed.CompletedBy)
	require.NotNil(t, completed.ApprovedAt, "the weekly points count from the thumbs up")
	require.WithinDuration(t, time.Now(), *completed.ApprovedAt, time.Minute)
	require.Nil(t, pending.ApprovedAt)
	var kim cModel.UserCircle
	require.NoError(t, db.Where("user_id = ? AND circle_id = 1", flowKim).First(&kim).Error)
	require.Equal(t, 5, kim.Points, "points come on approval")

	// The next day's turn: a thumbs down sends it back to open.
	done = asMember(t, router, flowKim, base+"/do", map[string]any{"notes": "<p>Watered</p>"})
	require.Equal(t, http.StatusOK, done.Code, done.Body.String())
	rejected := asMember(t, router, flowSam, base+"/reject", map[string]any{"notes": "<p>Soil still dry</p>"})
	require.Equal(t, http.StatusOK, rejected.Code, rejected.Body.String())
	require.Equal(t, chModel.ChoreStatusNoStatus, choreStatus(t, db, id))
	thumbsDown := latestHistory(t, db, id)
	require.Equal(t, chModel.ChoreHistoryStatusRejected, thumbsDown.Status)
	require.NotNil(t, thumbsDown.Note)
	require.Equal(t, "<p>👎 Soil still dry</p><p>Watered</p>", *thumbsDown.Note, "the doer sees why it came back")
	require.NoError(t, db.Where("user_id = ? AND circle_id = 1", flowKim).First(&kim).Error)
	require.Equal(t, 5, kim.Points, "no points for a thumbs down")

	// An admin can still decide.
	done = asMember(t, router, flowKim, base+"/do", map[string]any{})
	require.Equal(t, http.StatusOK, done.Code, done.Body.String())
	approved = asMember(t, router, flowAlex, base+"/approve", map[string]any{})
	require.Equal(t, http.StatusOK, approved.Code, approved.Body.String())
}
