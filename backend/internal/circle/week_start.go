package circle

import "github.com/gin-gonic/gin"

// weekStart is the first day of the household's points week (task 010):
// 0 Sunday to 6 Saturday, Monday by default.
type weekStart struct {
	WeekStart *int `json:"weekStart"`
}

func (h *Handler) GetWeekStart(c *gin.Context) {
	circleID, ok := h.menuCircle(c, false)
	if !ok {
		return
	}
	circle, err := h.circleRepo.GetCircleByID(c, circleID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Unable to read the week start"})
		return
	}
	c.JSON(200, weekStart{WeekStart: &circle.WeekStart})
}

func (h *Handler) PutWeekStart(c *gin.Context) {
	circleID, ok := h.menuCircle(c, true)
	if !ok {
		return
	}
	var req weekStart
	if c.ShouldBindJSON(&req) != nil || req.WeekStart == nil || *req.WeekStart < 0 || *req.WeekStart > 6 {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}
	if err := h.circleRepo.SetWeekStart(c, circleID, *req.WeekStart); err != nil {
		c.JSON(500, gin.H{"error": "Unable to save the week start"})
		return
	}
	c.JSON(200, req)
}
