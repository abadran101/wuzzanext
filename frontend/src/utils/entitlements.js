// All accounts have access to every feature. Keep these exports for callers.
export const FREE_HISTORY_DAYS = Infinity
export const FREE_REMINDER_LIMIT = Infinity
export const FREE_PROJECT_LIMIT = Infinity
export const FREE_QUICK_FILTER_LIMIT = Infinity

export const canCreateProject = () => true
export const canCreateQuickFilter = () => true
export const isDueDateReminder = () => true
export const isFreeReminderTemplate = () => true
export const sanitizeRemindersForPlan = templates =>
  Array.isArray(templates) ? templates : []
export const clampHistoryDaysForPlan = days => days
export const isPlusHistoryWindow = () => false
export const historyCutoffMs = () => null
export const partitionHistoryByPlan = entries => ({
  visible: Array.isArray(entries) ? entries : [],
  lockedCount: 0,
  cutoff: null,
})
