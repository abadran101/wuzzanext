package translation

import (
	"net/http"

	auth "donetick.com/core/internal/auth"
	chRepo "donetick.com/core/internal/chore/repo"
	"github.com/gin-gonic/gin"
)

const maxChoresPerRequest = 100

type Handler struct {
	service *Service
	chores  *chRepo.ChoreRepository
}

func NewHandler(service *Service, chores *chRepo.ChoreRepository) *Handler {
	return &Handler{service: service, chores: chores}
}

type choreTranslationsReq struct {
	IDs    []int  `json:"ids" binding:"required"`
	Target string `json:"target" binding:"required"`
}

type fieldTranslation struct {
	Status Status `json:"status"`
	Text   string `json:"text,omitempty"`
}

type choreTranslation struct {
	ID          int               `json:"id"`
	Name        fieldTranslation  `json:"name"`
	Description *fieldTranslation `json:"description,omitempty"`
}

// translateChores answers the name and details of the chores the user may see,
// in the target language. Only those two fields are ever sent; ids the user
// cannot see are left out of the answer.
func (h *Handler) translateChores(c *gin.Context) {
	currentUser, ok := auth.CurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	var req choreTranslationsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	if req.Target != "en" && req.Target != "ar" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported language"})
		return
	}
	if len(req.IDs) == 0 || len(req.IDs) > maxChoresPerRequest {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Between 1 and 100 chores per request"})
		return
	}
	if !h.service.Enabled() {
		c.JSON(http.StatusOK, gin.H{"enabled": false, "res": []choreTranslation{}})
		return
	}

	chores, err := h.chores.GetChoreTexts(c, req.IDs, currentUser.ID, currentUser.CircleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error getting chores"})
		return
	}

	items := make([]Item, 0, len(chores)*2)
	hasDescription := make([]bool, len(chores))
	for i, chore := range chores {
		items = append(items, Item{Text: chore.Name, Format: FormatText})
		if chore.Description != nil && *chore.Description != "" {
			hasDescription[i] = true
			items = append(items, Item{Text: *chore.Description, Format: FormatHTML})
		}
	}
	outcomes := h.service.Translate(c, items, req.Target)

	res := make([]choreTranslation, 0, len(chores))
	next := 0
	for i, chore := range chores {
		name := outcomes[next]
		next++
		out := choreTranslation{ID: chore.ID, Name: fieldTranslation{Status: name.Status, Text: name.Text}}
		if hasDescription[i] {
			desc := outcomes[next]
			next++
			out.Description = &fieldTranslation{Status: desc.Status, Text: desc.Text}
		}
		res = append(res, out)
	}
	c.JSON(http.StatusOK, gin.H{"enabled": true, "res": res})
}

func Routes(r *gin.Engine, h *Handler, multiAuthMiddleware *auth.MultiAuthMiddleware) {
	routes := r.Group("api/v1/translations")
	routes.Use(multiAuthMiddleware.MiddlewareFunc())
	{
		routes.POST("/chores", h.translateChores)
	}
}
