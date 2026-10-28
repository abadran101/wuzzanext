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

func TestMenuItems(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&cModel.Circle{}, &cModel.UserCircle{}, &uModel.User{}))
	for _, circle := range []cModel.Circle{{ID: 1, Name: "Alex"}, {ID: 2, Name: "Sam"}} {
		require.NoError(t, db.Create(&circle).Error)
	}
	for _, user := range []uModel.User{{ID: 1, Username: "Alex", CircleID: 1}, {ID: 2, Username: "Sam", CircleID: 1}} {
		require.NoError(t, db.Create(&user).Error)
	}
	for _, member := range []cModel.UserCircle{
		{UserID: 1, CircleID: 1, Role: cModel.UserRoleAdmin, IsActive: true},
		{UserID: 2, CircleID: 1, Role: cModel.UserRoleMember, IsActive: true},
		{UserID: 2, CircleID: 2, Role: cModel.UserRoleAdmin, IsActive: true},
	} {
		require.NoError(t, db.Create(&member).Error)
	}
	h := &Handler{circleRepo: cRepo.NewCircleRepository(db)}
	request := func(method, body string, userID, circleID int, impersonating bool) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(method, "/circles/menu-items", strings.NewReader(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Set("id", &uModel.UserDetails{User: uModel.User{ID: userID, CircleID: circleID}})
		if impersonating {
			c.Set(auth.ImpersonatedUserKey, &uModel.UserDetails{User: uModel.User{ID: 1, CircleID: circleID}})
			c.Request.Header.Set(auth.ImpersonateUserIDHeader, "1")
		}
		if method == "PUT" {
			h.PutMenuItems(c)
		} else {
			h.GetMenuItems(c)
		}
		return w
	}
	t.Run("default empty", func(t *testing.T) {
		w := request("GET", "", 2, 1, false)
		require.Equal(t, 200, w.Code)
		require.JSONEq(t, `{"memberItems":[]}`, w.Body.String())
	})
	t.Run("member refused", func(t *testing.T) {
		require.Equal(t, 403, request("PUT", `{"memberItems":["things"]}`, 2, 1, false).Code)
	})
	t.Run("impersonation refused", func(t *testing.T) {
		for _, id := range []int{1, 2} {
			require.Equal(t, 403, request("PUT", `{"memberItems":["things"]}`, id, 1, true).Code)
		}
	})
	t.Run("unknown refused", func(t *testing.T) {
		require.Equal(t, 400, request("PUT", `{"memberItems":["unknown"]}`, 1, 1, false).Code)
	})
	t.Run("admin saves ordered unique items", func(t *testing.T) {
		w := request("PUT", `{"memberItems":["labels","things","things","archived","reportIssue"]}`, 1, 1, false)
		require.Equal(t, 200, w.Code)
		require.JSONEq(t, `{"memberItems":["archived","things","labels","reportIssue"]}`, w.Body.String())
		w = request("GET", "", 2, 1, false)
		require.Equal(t, 200, w.Code)
		require.JSONEq(t, `{"memberItems":["archived","things","labels","reportIssue"]}`, w.Body.String())
		var circle cModel.Circle
		require.NoError(t, db.First(&circle, 1).Error)
		require.Equal(t, "archived,things,labels,reportIssue", circle.MemberMenuItems)
	})
	t.Run("other circle unaffected", func(t *testing.T) {
		w := request("GET", "", 2, 2, false)
		require.Equal(t, 200, w.Code)
		require.JSONEq(t, `{"memberItems":[]}`, w.Body.String())
	})
	t.Run("admin clears", func(t *testing.T) {
		w := request("PUT", `{"memberItems":[]}`, 1, 1, false)
		require.Equal(t, 200, w.Code)
		require.JSONEq(t, `{"memberItems":[]}`, request("GET", "", 2, 1, false).Body.String())
	})
	t.Run("inactive membership refused", func(t *testing.T) {
		require.NoError(t, db.Model(&cModel.UserCircle{}).Where("circle_id = ? AND user_id = ?", 1, 2).Update("is_active", false).Error)
		require.Equal(t, 403, request("GET", "", 2, 1, false).Code)
	})
}
