package user

import (
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"donetick.com/core/internal/auth"
	cModel "donetick.com/core/internal/circle/model"
	uModel "donetick.com/core/internal/user/model"
	uRepo "donetick.com/core/internal/user/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type safeProfile struct {
	ID          int    `json:"id"`
	DisplayName string `json:"displayName"`
	Image       string `json:"image"`
	Colour      string `json:"colour"`
	PINEnabled  bool   `json:"pinEnabled"`
}

func (h *Handler) safeProfile(user uModel.User) safeProfile {
	return safeProfile{ID: user.ID, DisplayName: user.DisplayName, Image: h.signer.SignIfLocal(user.Image), Colour: user.Colour, PINEnabled: user.PINHash != ""}
}

func validPIN(pin string) bool {
	if len(pin) != 4 {
		return false
	}
	for i := range pin {
		if pin[i] < '0' || pin[i] > '9' {
			return false
		}
	}
	return true
}

func (h *Handler) profiles(c *gin.Context) {
	circleID, err := h.userRepo.HouseholdCircle(c, h.householdCircleID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Unable to load profiles"})
		return
	}
	users, err := h.userRepo.HouseholdProfiles(c, circleID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Unable to load profiles"})
		return
	}
	profiles := make([]safeProfile, 0, len(users))
	for _, user := range users {
		profiles = append(profiles, h.safeProfile(user))
	}
	c.JSON(200, gin.H{"profiles": profiles})
}

func (h *Handler) pinLogin(c *gin.Context) {
	var req struct {
		ProfileID int    `json:"profileId"`
		PIN       string `json:"pin"`
	}
	if c.ShouldBindJSON(&req) != nil || req.ProfileID <= 0 || !validPIN(req.PIN) {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	circleID, err := h.userRepo.HouseholdCircle(c, h.householdCircleID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Authentication failed"})
		return
	}
	user, locked, err := h.userRepo.CheckProfilePIN(c, circleID, req.ProfileID, func(hash string) bool { return auth.Matches(hash, req.PIN) == nil })
	if locked != nil {
		c.Header("Retry-After", strconv.Itoa(int(math.Ceil(time.Until(*locked).Seconds()))))
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Profile temporarily locked"})
		return
	}
	if err != nil {
		c.JSON(401, gin.H{"error": "Invalid credentials"})
		return
	}
	auth.NewAuthHandler(h.tokenService, h.userRepo, h.jwtAuth, h.mfaService).CompleteLogin(c, &uModel.UserDetails{User: *user}, "pin")
}

func (h *Handler) changePIN(c *gin.Context) {
	actual, ok := auth.GetActualUser(c)
	if !ok {
		c.Status(401)
		return
	}
	var req struct {
		CurrentPIN      string `json:"currentPin"`
		CurrentPassword string `json:"currentPassword"`
		NewPIN          string `json:"newPin"`
	}
	if c.ShouldBindJSON(&req) != nil || !validPIN(req.NewPIN) {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	user, err := h.userRepo.GetUserByID(c, actual.ID)
	if err != nil || user.Disabled {
		c.Status(401)
		return
	}
	if user.PINHash != "" {
		if !validPIN(req.CurrentPIN) || auth.Matches(user.PINHash, req.CurrentPIN) != nil {
			c.Status(401)
			return
		}
	} else if user.Password != "" && (req.CurrentPassword == "" || auth.Matches(user.Password, req.CurrentPassword) != nil) {
		c.Status(401)
		return
	}
	hash, err := auth.EncodePassword(req.NewPIN)
	if err != nil {
		c.Status(500)
		return
	}
	if err := h.userRepo.ChangeProfilePIN(c, user, hash); err != nil {
		c.Status(409)
		return
	}
	c.Status(204)
}

// Administrative profile actions require the authenticated identity; an
// impersonated identity must never confer household administration rights.
func (h *Handler) profileAdmin(c *gin.Context) (int, int, bool) {
	actual, ok := auth.GetActualUser(c)
	if !ok {
		c.Status(401)
		return 0, 0, false
	}
	_, impersonating := c.Get(auth.ImpersonatedUserKey)
	if impersonating || c.GetHeader(auth.ImpersonateUserIDHeader) != "" {
		c.Status(403)
		return 0, 0, false
	}
	circleID, err := h.userRepo.HouseholdCircle(c, h.householdCircleID)
	if err != nil {
		c.Status(500)
		return 0, 0, false
	}
	if !h.userRepo.IsProfileAdmin(c, circleID, actual.ID) {
		c.Status(403)
		return 0, 0, false
	}
	return circleID, actual.ID, true
}

func (h *Handler) createProfile(c *gin.Context) {
	circleID, adminID, ok := h.profileAdmin(c)
	if !ok {
		return
	}
	var req struct {
		DisplayName string          `json:"displayName"`
		Colour      string          `json:"colour"`
		PIN         string          `json:"pin"`
		Role        cModel.UserRole `json:"role"`
	}
	if c.ShouldBindJSON(&req) != nil || strings.TrimSpace(req.DisplayName) == "" || len(req.DisplayName) > 100 || !uModel.IsProfileColour(req.Colour) || !validPIN(req.PIN) || (req.Role != cModel.UserRoleAdmin && req.Role != cModel.UserRoleMember) {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	hash, err := auth.EncodePassword(req.PIN)
	if err != nil {
		c.Status(500)
		return
	}
	user := uModel.User{Username: "profile-" + uuid.NewString(), DisplayName: strings.TrimSpace(req.DisplayName), Colour: req.Colour, PINHash: hash, CircleID: circleID, UserType: uModel.UserTypeParent, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}
	if err := h.userRepo.CreateHouseholdProfile(c, circleID, adminID, &user, req.Role); err != nil {
		if errors.Is(err, uRepo.ErrProfilePermission) {
			c.Status(403)
		} else {
			c.Status(500)
		}
		return
	}
	c.JSON(201, h.safeProfile(user))
}

func (h *Handler) resetProfilePIN(c *gin.Context) {
	circleID, adminID, ok := h.profileAdmin(c)
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	var req struct {
		NewPIN string `json:"newPin"`
	}
	if err != nil || id <= 0 || c.ShouldBindJSON(&req) != nil || !validPIN(req.NewPIN) {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	hash, err := auth.EncodePassword(req.NewPIN)
	if err != nil {
		c.Status(500)
		return
	}
	if err := h.userRepo.ResetHouseholdPIN(c, circleID, adminID, id, hash); err != nil {
		if errors.Is(err, uRepo.ErrProfilePermission) {
			c.Status(403)
		} else {
			c.Status(404)
		}
		return
	}
	c.Status(204)
}
