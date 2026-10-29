package circle

import (
	"net/http/httptest"
	"strings"
	"testing"

	"donetick.com/core/internal/auth"
	cModel "donetick.com/core/internal/circle/model"
	cRepo "donetick.com/core/internal/circle/repo"
	uModel "donetick.com/core/internal/user/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestWeekStart(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&cModel.Circle{}, &cModel.UserCircle{}, &uModel.User{}))
	require.NoError(t, db.Create(&cModel.Circle{ID: 1, Name: "Alex"}).Error)
	for _, user := range []uModel.User{{ID: 1, Username: "Alex", CircleID: 1}, {ID: 2, Username: "Sam", CircleID: 1}, {ID: 3, Username: "Riley", CircleID: 2}} {
		require.NoError(t, db.Create(&user).Error)
	}
	for _, member := range []cModel.UserCircle{
		{UserID: 1, CircleID: 1, Role: cModel.UserRoleAdmin, IsActive: true},
		{UserID: 2, CircleID: 1, Role: cModel.UserRoleMember, IsActive: true},
	} {
		require.NoError(t, db.Create(&member).Error)
	}
	h := &Handler{circleRepo: cRepo.NewCircleRepository(db)}
	request := func(method, body string, userID, circleID int, impersonating bool) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(method, "/circles/week-start", strings.NewReader(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Set("id", &uModel.UserDetails{User: uModel.User{ID: userID, CircleID: circleID}})
		if impersonating {
			c.Set(auth.ImpersonatedUserKey, &uModel.UserDetails{User: uModel.User{ID: 1, CircleID: circleID}})
			c.Request.Header.Set(auth.ImpersonateUserIDHeader, "1")
		}
		if method == "PUT" {
			h.PutWeekStart(c)
		} else {
			h.GetWeekStart(c)
		}
		return w
	}
	t.Run("Monday by default", func(t *testing.T) {
		w := request("GET", "", 2, 1, false)
		require.Equal(t, 200, w.Code)
		require.JSONEq(t, `{"weekStart":1}`, w.Body.String())
	})
	t.Run("not a member refused", func(t *testing.T) {
		require.Equal(t, 403, request("GET", "", 3, 1, false).Code)
	})
	t.Run("member refused", func(t *testing.T) {
		require.Equal(t, 403, request("PUT", `{"weekStart":0}`, 2, 1, false).Code)
	})
	t.Run("impersonation refused", func(t *testing.T) {
		require.Equal(t, 403, request("PUT", `{"weekStart":0}`, 1, 1, true).Code)
	})
	t.Run("invalid refused", func(t *testing.T) {
		for _, body := range []string{`{}`, `{"weekStart":7}`, `{"weekStart":-1}`, `{"weekStart":"mon"}`} {
			require.Equal(t, 400, request("PUT", body, 1, 1, false).Code, body)
		}
	})
	t.Run("admin saves Sunday", func(t *testing.T) {
		w := request("PUT", `{"weekStart":0}`, 1, 1, false)
		require.Equal(t, 200, w.Code)
		require.JSONEq(t, `{"weekStart":0}`, w.Body.String())
		w = request("GET", "", 2, 1, false)
		require.JSONEq(t, `{"weekStart":0}`, w.Body.String())
	})
}
