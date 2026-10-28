package circle

import (
	"strings"

	"donetick.com/core/internal/auth"
	"github.com/gin-gonic/gin"
)

var menuItemNames = []string{"archived", "things", "labels", "reportIssue"}

type menuItems struct {
	MemberItems []string `json:"memberItems"`
}

func (h *Handler) menuCircle(c *gin.Context, write bool) (int, bool) {
	user, ok := auth.CurrentUser(c)
	if !ok {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return 0, false
	}
	userID := user.ID
	if write {
		actual, authenticated := auth.GetActualUser(c)
		if !authenticated {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			return 0, false
		}
		_, impersonating := c.Get(auth.ImpersonatedUserKey)
		if impersonating || c.GetHeader(auth.ImpersonateUserIDHeader) != "" {
			c.JSON(403, gin.H{"error": "Forbidden"})
			return 0, false
		}
		userID = actual.ID
	}
	allowed, err := h.circleRepo.CanAccessMenuItems(c, user.CircleID, userID, write)
	if err != nil {
		c.JSON(500, gin.H{"error": "Unable to read menu items"})
		return 0, false
	}
	if !allowed {
		c.JSON(403, gin.H{"error": "Forbidden"})
		return 0, false
	}
	return user.CircleID, true
}

func (h *Handler) GetMenuItems(c *gin.Context) {
	circleID, ok := h.menuCircle(c, false)
	if !ok {
		return
	}
	circle, err := h.circleRepo.GetCircleByID(c, circleID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Unable to read menu items"})
		return
	}
	items := make([]string, 0)
	if circle.MemberMenuItems != "" {
		items = strings.Split(circle.MemberMenuItems, ",")
	}
	c.JSON(200, menuItems{MemberItems: items})
}

func (h *Handler) PutMenuItems(c *gin.Context) {
	circleID, ok := h.menuCircle(c, true)
	if !ok {
		return
	}
	var req menuItems
	if c.ShouldBindJSON(&req) != nil || req.MemberItems == nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	selected := make(map[string]bool)
	for _, item := range req.MemberItems {
		valid := false
		for _, name := range menuItemNames {
			if item == name {
				valid = true
			}
		}
		if !valid {
			c.JSON(400, gin.H{"error": "Unknown menu item"})
			return
		}
		selected[item] = true
	}
	items := make([]string, 0)
	for _, name := range menuItemNames {
		if selected[name] {
			items = append(items, name)
		}
	}
	if err := h.circleRepo.SetMemberMenuItems(c, circleID, strings.Join(items, ",")); err != nil {
		c.JSON(500, gin.H{"error": "Unable to save menu items"})
		return
	}
	c.JSON(200, menuItems{MemberItems: items})
}
