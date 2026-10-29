package chore

import (
	"testing"

	"github.com/stretchr/testify/require"

	chModel "donetick.com/core/internal/chore/model"
	cModel "donetick.com/core/internal/circle/model"
	pModel "donetick.com/core/internal/project/model"
	uModel "donetick.com/core/internal/user/model"
)

// A completion waiting for approval must not announce the task's name to admins
// and managers who cannot see it, such as those outside a restricted project.
func TestPendingApprovalRecipientsStayInsideTheAudience(t *testing.T) {
	const owner, colleague, outsideAdmin, insideManager = 1, 2, 3, 4
	member := func(id int, role cModel.UserRole) *cModel.UserCircleDetail {
		return &cModel.UserCircleDetail{UserCircle: cModel.UserCircle{UserID: id, CircleID: 1, Role: role, IsActive: true}}
	}
	circleUsers := []*cModel.UserCircleDetail{
		member(owner, cModel.UserRoleMember), member(colleague, cModel.UserRoleMember),
		member(outsideAdmin, cModel.UserRoleAdmin), member(insideManager, cModel.UserRoleManager),
	}
	submitter := &uModel.User{ID: colleague}

	// The chore's creator has since left the project, so only the manager inside it hears.
	project := &pModel.Project{ID: 7, CircleID: 1, CreatedBy: colleague, IsPrivate: true, SharedWithMembers: true}
	project.SetMembers([]int{colleague, insideManager})
	inProject := &chModel.Chore{ID: 1, CircleID: 1, CreatedBy: owner, ProjectID: &project.ID, Project: project, IsPrivate: true,
		AssignedTo: intPtr(colleague), Assignees: []chModel.ChoreAssignees{{UserID: colleague}}}
	require.Equal(t, []int{insideManager}, pendingApprovalRecipients(inProject, submitter, circleUsers))

	project.SetMembers([]int{colleague})
	require.Empty(t, pendingApprovalRecipients(inProject, submitter, circleUsers), "nobody outside the project hears about it")

	selfGiven := &chModel.Chore{ID: 2, CircleID: 1, CreatedBy: colleague,
		AssignedTo: intPtr(colleague), Assignees: []chModel.ChoreAssignees{{UserID: colleague}}}
	require.ElementsMatch(t, []int{outsideAdmin, insideManager}, pendingApprovalRecipients(selfGiven, submitter, circleUsers),
		"chores everybody can see keep the fallback to every admin and manager")
}

// Whoever gave out the chore is told about the completion even when they are
// not an admin, since they are the one who approves it.
func TestPendingApprovalRecipientsTellTheCreator(t *testing.T) {
	const alex, sam, admin = 1, 2, 3
	circleUsers := []*cModel.UserCircleDetail{
		{UserCircle: cModel.UserCircle{UserID: alex, CircleID: 1, Role: cModel.UserRoleMember, IsActive: true}},
		{UserCircle: cModel.UserCircle{UserID: sam, CircleID: 1, Role: cModel.UserRoleMember, IsActive: true}},
		{UserCircle: cModel.UserCircle{UserID: admin, CircleID: 1, Role: cModel.UserRoleAdmin, IsActive: true}},
	}
	chore := &chModel.Chore{ID: 1, CircleID: 1, CreatedBy: alex,
		AssignedTo: intPtr(sam), Assignees: []chModel.ChoreAssignees{{UserID: sam}}}
	require.Equal(t, []int{alex}, pendingApprovalRecipients(chore, &uModel.User{ID: sam}, circleUsers))

	circleUsers[0].IsActive = false
	require.Equal(t, []int{admin}, pendingApprovalRecipients(chore, &uModel.User{ID: sam}, circleUsers),
		"a creator who left the circle can't approve, so the admins hear")
}

func TestCanApprove(t *testing.T) {
	const alex, sam, kim, admin = 1, 2, 3, 4
	circleUsers := []*cModel.UserCircleDetail{
		{UserCircle: cModel.UserCircle{UserID: alex, CircleID: 1, Role: cModel.UserRoleMember, IsActive: true}},
		{UserCircle: cModel.UserCircle{UserID: sam, CircleID: 1, Role: cModel.UserRoleMember, IsActive: true}},
		{UserCircle: cModel.UserCircle{UserID: kim, CircleID: 1, Role: cModel.UserRoleMember, IsActive: false}},
		{UserCircle: cModel.UserCircle{UserID: admin, CircleID: 1, Role: cModel.UserRoleAdmin, IsActive: true}},
	}
	chore := &chModel.Chore{ID: 1, CircleID: 1, CreatedBy: alex,
		AssignedTo: intPtr(sam), Assignees: []chModel.ChoreAssignees{{UserID: sam}}}
	require.True(t, chore.CanApprove(alex, circleUsers), "the creator approves")
	require.True(t, chore.CanApprove(admin, circleUsers), "an admin approves")
	require.False(t, chore.CanApprove(sam, circleUsers), "the assignee does not approve their own work")
	require.False(t, chore.CanApprove(99, circleUsers), "nobody from outside the circle")

	byKim := &chModel.Chore{ID: 2, CircleID: 1, CreatedBy: kim}
	require.False(t, byKim.CanApprove(kim, circleUsers), "a creator who left the circle")

	project := &pModel.Project{ID: 7, CircleID: 1, CreatedBy: sam, IsPrivate: true, SharedWithMembers: true}
	project.SetMembers([]int{sam})
	hidden := &chModel.Chore{ID: 3, CircleID: 1, CreatedBy: alex, ProjectID: &project.ID, Project: project}
	require.False(t, hidden.CanApprove(alex, circleUsers), "a creator who can no longer see the chore")
	require.False(t, hidden.CanApprove(admin, circleUsers), "an admin outside a restricted project")
}
