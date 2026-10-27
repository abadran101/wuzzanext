package user

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"donetick.com/core/config"
	"donetick.com/core/internal/auth"
	cModel "donetick.com/core/internal/circle/model"
	"donetick.com/core/internal/mfa"
	"donetick.com/core/internal/storage"
	uModel "donetick.com/core/internal/user/model"
	uRepo "donetick.com/core/internal/user/repo"
	jwt "github.com/appleboy/gin-jwt/v2"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func profileFixture(t *testing.T) (*Handler, *gorm.DB, uModel.User) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { sqlDB.Close() })
	if err := db.AutoMigrate(&uModel.User{}, &uModel.UserNotificationTarget{}, &cModel.Circle{}, &cModel.UserCircle{}, &uModel.UserSession{}, &uModel.MFASession{}); err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&cModel.Circle{ID: 1, Name: "Alex"}).Error; err != nil {
		t.Fatal(err)
	}
	hash, err := auth.EncodePassword("0012")
	if err != nil {
		t.Fatal(err)
	}
	user := uModel.User{Username: "alex", DisplayName: "Alex", CircleID: 1, PINHash: hash, Colour: uModel.ProfileColours[0]}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&cModel.UserCircle{UserID: user.ID, CircleID: 1, Role: cModel.UserRoleAdmin, IsActive: true}).Error; err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{Jwt: config.JwtConfig{SessionTime: time.Hour, MaxRefresh: 24 * time.Hour}}
	repo := uRepo.NewUserRepository(db, cfg)
	jwtAuth, err := jwt.New(&jwt.GinJWTMiddleware{Realm: "test", Key: []byte("made-up-test-signing-secret-only"), Timeout: time.Hour, IdentityKey: "id", PayloadFunc: func(data interface{}) jwt.MapClaims { return jwt.MapClaims{"id": data.(*uModel.UserDetails).ID} }})
	if err != nil {
		t.Fatal(err)
	}
	return &Handler{userRepo: repo, signer: &storage.URLSignerLocal{Secret: []byte("made-up")}, jwtAuth: jwtAuth, tokenService: auth.NewTokenService(repo, jwtAuth, cfg), mfaService: mfa.NewService(cfg)}, db, user
}

func profileRequest(h *Handler, method, path, body string, actual *uModel.User, impersonate bool) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		if actual != nil {
			c.Set("id", &uModel.UserDetails{User: *actual})
		}
		if impersonate {
			c.Set(auth.ImpersonatedUserKey, &uModel.UserDetails{})
		}
	})
	r.GET("/auth/profiles", h.profiles)
	r.POST("/auth/pin", h.pinLogin)
	r.PUT("/users/pin", h.changePIN)
	r.POST("/users/profiles", h.createProfile)
	r.PUT("/users/profiles/:id/pin", h.resetProfilePIN)
	r.PUT("/users", h.UpdateUserDetails)
	authHandler := auth.NewAuthHandler(h.tokenService, h.userRepo, h.jwtAuth, h.mfaService)
	r.POST("/auth/refresh", authHandler.RefreshTokenHandler)
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func expectStatus(t *testing.T, w *httptest.ResponseRecorder, status int) {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status %d, want %d: %s", w.Code, status, w.Body.String())
	}
}

func TestProfilePINLoginAndRefresh(t *testing.T) {
	h, _, user := profileFixture(t)
	w := profileRequest(h, "POST", "/auth/pin", fmt.Sprintf(`{"profileId":%d,"pin":"0012"}`, user.ID), nil, false)
	expectStatus(t, w, 200)
	var tokens auth.TokenResponse
	if err := json.Unmarshal(w.Body.Bytes(), &tokens); err != nil {
		t.Fatal(err)
	}
	if tokens.AccessToken == "" || tokens.RefreshToken == "" || len(w.Result().Cookies()) != 1 {
		t.Fatal("missing tokens or refresh cookie")
	}
	w = profileRequest(h, "POST", "/auth/refresh", fmt.Sprintf(`{"refresh_token":%q}`, tokens.RefreshToken), nil, false)
	expectStatus(t, w, 200)
	var refreshed auth.TokenResponse
	if err := json.Unmarshal(w.Body.Bytes(), &refreshed); err != nil {
		t.Fatal(err)
	}
	if refreshed.RefreshToken == tokens.RefreshToken || refreshed.AccessToken == "" {
		t.Fatal("refresh did not rotate")
	}
	for _, pin := range []string{"012", "00012", "１２３４", "00a2"} {
		expectStatus(t, profileRequest(h, "POST", "/auth/pin", fmt.Sprintf(`{"profileId":%d,"pin":%q}`, user.ID, pin), nil, false), 400)
	}
}

func TestProfilePINLockoutExpiryAndReset(t *testing.T) {
	h, db, user := profileFixture(t)
	login := func(pin string) *httptest.ResponseRecorder {
		return profileRequest(h, "POST", "/auth/pin", fmt.Sprintf(`{"profileId":%d,"pin":%q}`, user.ID, pin), nil, false)
	}
	for i := 0; i < 5; i++ {
		expectStatus(t, login("9999"), 401)
	}
	w := login("0012")
	expectStatus(t, w, 429)
	if w.Header().Get("Retry-After") == "" {
		t.Fatal("missing Retry-After")
	}
	if err := db.Model(&uModel.User{}).Where("id = ?", user.ID).Update("pin_locked_until", time.Now().UTC().Add(-time.Second)).Error; err != nil {
		t.Fatal(err)
	}
	expectStatus(t, login("9999"), 401)
	expectStatus(t, login("0012"), 200)
	var saved uModel.User
	if err := db.First(&saved, user.ID).Error; err != nil {
		t.Fatal(err)
	}
	if saved.PINFailedAttempts != 0 || saved.PINLockedUntil != nil {
		t.Fatal("success did not reset lockout")
	}
}

func TestProfileConcurrentWrongPINs(t *testing.T) {
	h, db, user := profileFixture(t)
	var wg sync.WaitGroup
	results := make(chan error, 10)
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, locked, err := h.userRepo.CheckProfilePIN(context.Background(), 1, user.ID, func(hash string) bool { return auth.Matches(hash, "9999") == nil })
			if locked == nil && err != uRepo.ErrProfileCredentials {
				results <- fmt.Errorf("unexpected error: %v", err)
			}
		}()
	}
	wg.Wait()
	close(results)
	for err := range results {
		t.Error(err)
	}
	var saved uModel.User
	if err := db.First(&saved, user.ID).Error; err != nil {
		t.Fatal(err)
	}
	if saved.PINLockedUntil == nil || saved.PINFailedAttempts != 0 {
		t.Fatal("concurrent attempts skipped lockout")
	}
}

func TestHouseholdProfileScopeAndSecrets(t *testing.T) {
	h, db, user := profileFixture(t)
	if err := db.Create(&cModel.Circle{ID: 2, Name: "Sam"}).Error; err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 3; i++ {
		u := uModel.User{Username: fmt.Sprintf("sam%d", i), DisplayName: "Sam", Disabled: i == 1, PINHash: user.PINHash, Password: "made-up", Email: fmt.Sprintf("sam%d@example.invalid", i)}
		if err := db.Create(&u).Error; err != nil {
			t.Fatal(err)
		}
		circle := 1
		if i == 0 {
			circle = 2
		}
		if err := db.Create(&cModel.UserCircle{UserID: u.ID, CircleID: circle, IsActive: i != 2}).Error; err != nil {
			t.Fatal(err)
		}
		expectStatus(t, profileRequest(h, "POST", "/auth/pin", fmt.Sprintf(`{"profileId":%d,"pin":"0012"}`, u.ID), nil, false), 401)
	}
	w := profileRequest(h, "GET", "/auth/profiles?circleId=1", "", nil, false)
	expectStatus(t, w, 200)
	if w.Body.String() != `{"profiles":[]}` {
		t.Fatal("ambiguous household exposed profiles")
	}
	h.householdCircleID = 1
	w = profileRequest(h, "GET", "/auth/profiles?circleId=2", "", nil, false)
	expectStatus(t, w, 200)
	var payload struct {
		Profiles []map[string]interface{} `json:"profiles"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Profiles) != 1 || len(payload.Profiles[0]) != 5 || payload.Profiles[0]["displayName"] != "Alex" {
		t.Fatal(w.Body.String())
	}
	for _, secret := range []string{"username", "email", "role", "password", "pinHash", user.PINHash} {
		if strings.Contains(w.Body.String(), secret) {
			t.Fatalf("leaked %s", secret)
		}
	}
}

func TestProfileAdministration(t *testing.T) {
	h, db, admin := profileFixture(t)
	body := fmt.Sprintf(`{"displayName":"Sam","colour":%q,"pin":"0012","role":"member"}`, uModel.ProfileColours[1])
	expectStatus(t, profileRequest(h, "POST", "/users/profiles", body, nil, false), 401)
	expectStatus(t, profileRequest(h, "POST", "/users/profiles", body, &admin, true), 403)
	w := profileRequest(h, "POST", "/users/profiles", body, &admin, false)
	expectStatus(t, w, 201)
	var profile safeProfile
	if err := json.Unmarshal(w.Body.Bytes(), &profile); err != nil {
		t.Fatal(err)
	}
	var sam uModel.User
	if err := db.First(&sam, profile.ID).Error; err != nil {
		t.Fatal(err)
	}
	if sam.Password != "" || sam.Email != "" || sam.IsChild() || sam.ParentUserID != nil || auth.Matches(sam.PINHash, "0012") != nil {
		t.Fatal("invalid adult profile")
	}
	path := fmt.Sprintf("/users/profiles/%d/pin", sam.ID)
	expectStatus(t, profileRequest(h, "POST", "/users/profiles", body, &sam, false), 403)
	expectStatus(t, profileRequest(h, "PUT", path, `{"newPin":"1234"}`, &sam, false), 403)
	expectStatus(t, profileRequest(h, "PUT", path, `{"newPin":"1234"}`, &admin, true), 403)
	if err := db.Model(&sam).Updates(map[string]interface{}{"pin_failed_attempts": 4, "pin_locked_until": time.Now().UTC().Add(time.Minute)}).Error; err != nil {
		t.Fatal(err)
	}
	expectStatus(t, profileRequest(h, "PUT", path, `{"newPin":"1234"}`, &admin, false), 204)
	sam = uModel.User{ID: sam.ID}
	if err := db.First(&sam, sam.ID).Error; err != nil {
		t.Fatal(err)
	}
	if sam.PINFailedAttempts != 0 || sam.PINLockedUntil != nil || auth.Matches(sam.PINHash, "1234") != nil {
		t.Fatal("reset failed")
	}
	if err := db.Model(&cModel.UserCircle{}).Where("user_id = ?", sam.ID).Update("circle_id", 2).Error; err != nil {
		t.Fatal(err)
	}
	expectStatus(t, profileRequest(h, "PUT", path, `{"newPin":"1234"}`, &admin, false), 404)
}

func TestOwnPINChangeRules(t *testing.T) {
	h, db, user := profileFixture(t)
	change := func(body string) *httptest.ResponseRecorder {
		return profileRequest(h, "PUT", "/users/pin", body, &user, false)
	}
	expectStatus(t, change(`{"newPin":"1234"}`), 401)
	expectStatus(t, change(`{"currentPin":"9999","newPin":"1234"}`), 401)
	expectStatus(t, change(`{"currentPin":"0012","newPin":"1234"}`), 204)
	password, err := auth.EncodePassword("made-up-password")
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&user).Updates(map[string]interface{}{"pin_hash": "", "password": password}).Error; err != nil {
		t.Fatal(err)
	}
	expectStatus(t, change(`{"newPin":"1234"}`), 401)
	expectStatus(t, change(`{"currentPassword":"wrong","newPin":"1234"}`), 401)
	expectStatus(t, change(`{"currentPassword":"made-up-password","newPin":"1234"}`), 204)
	if err := db.Model(&user).Updates(map[string]interface{}{"pin_hash": "", "password": ""}).Error; err != nil {
		t.Fatal(err)
	}
	expectStatus(t, change(`{"newPin":"0012"}`), 204)
}

func TestProfilePreferences(t *testing.T) {
	h, _, user := profileFixture(t)
	for _, body := range []string{`{"colour":"#ffffff"}`, `{"language":"fr"}`} {
		expectStatus(t, profileRequest(h, "PUT", "/users", body, &user, false), 400)
	}
	// A profile with no selected circle avoids storage reconciliation in this focused test.
	user.CircleID = 0
	w := profileRequest(h, "PUT", "/users", fmt.Sprintf(`{"colour":%q,"language":"ar"}`, uModel.ProfileColours[2]), &user, false)
	expectStatus(t, w, 200)
	if !strings.Contains(w.Body.String(), `"language":"ar"`) || !strings.Contains(w.Body.String(), uModel.ProfileColours[2]) {
		t.Fatal(w.Body.String())
	}
}

func TestProfilePINMFAChallenge(t *testing.T) {
	h, db, user := profileFixture(t)
	if err := db.Model(&user).Update("mfa_enabled", true).Error; err != nil {
		t.Fatal(err)
	}
	w := profileRequest(h, "POST", "/auth/pin", fmt.Sprintf(`{"profileId":%d,"pin":"0012"}`, user.ID), nil, false)
	expectStatus(t, w, 200)
	var challenge struct {
		Required bool   `json:"mfaRequired"`
		Token    string `json:"sessionToken"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &challenge); err != nil {
		t.Fatal(err)
	}
	if !challenge.Required || challenge.Token == "" || strings.Contains(w.Body.String(), "access_token") || len(w.Result().Cookies()) != 0 {
		t.Fatal("MFA bypassed")
	}
	var session uModel.MFASession
	if err := db.Where("session_token = ?", challenge.Token).First(&session).Error; err != nil {
		t.Fatal(err)
	}
	if session.AuthMethod != "pin" || session.UserID != user.ID {
		t.Fatal("invalid MFA session")
	}
}
