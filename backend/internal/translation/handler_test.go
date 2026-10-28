package translation

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"donetick.com/core/config"
	chModel "donetick.com/core/internal/chore/model"
	chRepo "donetick.com/core/internal/chore/repo"
	cModel "donetick.com/core/internal/circle/model"
	lModel "donetick.com/core/internal/label/model"
	pModel "donetick.com/core/internal/project/model"
	stModel "donetick.com/core/internal/subtask/model"
	tModel "donetick.com/core/internal/thing/model"
	trModel "donetick.com/core/internal/translation/model"
	uModel "donetick.com/core/internal/user/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type handlerResponse struct {
	Enabled bool               `json:"enabled"`
	Res     []choreTranslation `json:"res"`
}

// newHandlerTest has Alex (user 1) and Sam (user 2) in circle 1 and a third
// person in circle 2. Chore 1 is shared, chore 2 is Sam's private chore and
// chore 3 belongs to the other circle.
func newHandlerTest(t *testing.T, translator Translator) (*gin.Engine, *gorm.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })
	require.NoError(t, db.AutoMigrate(
		&uModel.User{}, &cModel.Circle{}, &cModel.UserCircle{}, &chModel.Chore{}, &chModel.ChoreAssignees{},
		&chModel.ChoreLabels{}, &stModel.SubTask{}, &lModel.Label{}, &pModel.Project{}, &pModel.ProjectMember{},
		&tModel.Thing{}, &tModel.ThingChore{}, &trModel.CacheEntry{}, &trModel.DailyUsage{},
	))

	details := "<p>Use the blue can</p>"
	require.NoError(t, db.Create(&chModel.Chore{ID: 1, Name: "Water the plants", Description: &details, CreatedBy: 1, CircleID: 1}).Error)
	require.NoError(t, db.Create(&chModel.Chore{ID: 2, Name: "Sam's secret", IsPrivate: true, CreatedBy: 2, CircleID: 1}).Error)
	require.NoError(t, db.Create(&chModel.Chore{ID: 3, Name: "Other home", CreatedBy: 3, CircleID: 2}).Error)

	cfg := &config.Config{}
	cfg.Database.Type = "sqlite"
	h := NewHandler(newService(db, translator, 15000), chRepo.NewChoreRepository(db, cfg))
	router := gin.New()
	router.POST("/api/v1/translations/chores", func(c *gin.Context) {
		c.Set("id", &uModel.UserDetails{User: uModel.User{ID: 1, CircleID: 1}})
	}, h.translateChores)
	return router, db
}

func postTranslations(t *testing.T, router *gin.Engine, body string) (*httptest.ResponseRecorder, handlerResponse) {
	t.Helper()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/translations/chores", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, request)
	var parsed handlerResponse
	if recorder.Code == http.StatusOK {
		require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &parsed))
	}
	return recorder, parsed
}

func TestTranslateChoresOnlyVisibleNameAndDetails(t *testing.T) {
	tr := &recordingTranslator{}
	router, _ := newHandlerTest(t, tr)

	recorder, res := postTranslations(t, router, `{"ids":[1,2,3,99],"target":"ar"}`)
	require.Equal(t, http.StatusOK, recorder.Code)
	require.True(t, res.Enabled)
	require.Len(t, res.Res, 1, "chores the user cannot see are left out")
	require.Equal(t, 1, res.Res[0].ID)
	require.Equal(t, fieldTranslation{Status: StatusTranslated, Text: "ar(text) Water the plants"}, res.Res[0].Name)
	require.Equal(t, &fieldTranslation{Status: StatusTranslated, Text: "ar(html) <p>Use the blue can</p>"}, res.Res[0].Description)
	require.ElementsMatch(t, []string{"Water the plants", "<p>Use the blue can</p>"}, tr.sent,
		"only the visible chore's name and details are sent")
}

func TestTranslateChoresOff(t *testing.T) {
	router, _ := newHandlerTest(t, nil)
	recorder, res := postTranslations(t, router, `{"ids":[1],"target":"ar"}`)
	require.Equal(t, http.StatusOK, recorder.Code)
	require.False(t, res.Enabled)
	require.Empty(t, res.Res)
}

func TestTranslateChoresRejectsBadRequests(t *testing.T) {
	tr := &recordingTranslator{}
	router, _ := newHandlerTest(t, tr)

	recorder, _ := postTranslations(t, router, `{"ids":[1],"target":"fr"}`)
	require.Equal(t, http.StatusBadRequest, recorder.Code)

	recorder, _ = postTranslations(t, router, `{"ids":[],"target":"ar"}`)
	require.Equal(t, http.StatusBadRequest, recorder.Code)

	ids := make([]string, maxChoresPerRequest+1)
	for i := range ids {
		ids[i] = fmt.Sprint(i + 1)
	}
	recorder, _ = postTranslations(t, router, `{"ids":[`+strings.Join(ids, ",")+`],"target":"ar"}`)
	require.Equal(t, http.StatusBadRequest, recorder.Code)
	require.Zero(t, tr.calls)
}

func TestTranslateChoresNeedsUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &Handler{service: newService(nil, nil, 15000)}
	router := gin.New()
	router.POST("/x", h.translateChores)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"ids":[1],"target":"ar"}`)))
	require.Equal(t, http.StatusUnauthorized, recorder.Code)
}
