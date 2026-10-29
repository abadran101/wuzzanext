// Points and the weekly leaderboard (task 010, owner's choices of 2026-10-29):
// a new chore is worth 1 star unless its creator changes it, and the
// leaderboard counts the household's calendar week, Monday to Sunday by
// default, starting from zero on its first day.

export const DEFAULT_CHORE_POINTS = 1
export const DEFAULT_WEEK_START = 1 // 0 Sunday to 6 Saturday
export const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6]
export const COMPLETED_STATUS = 1

// Midnight, local time, on the first day of the week that holds `now`.
export const startOfWeek = (
  now = new Date(),
  weekStart = DEFAULT_WEEK_START,
) => {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() - weekStart + 7) % 7))
  return start
}

// The seven days of that week, first day first.
export const weekDays = (now = new Date(), weekStart = DEFAULT_WEEK_START) => {
  const start = startOfWeek(now, weekStart)
  return WEEK_DAYS.map(offset => {
    const day = new Date(start)
    day.setDate(start.getDate() + offset)
    return day
  })
}

// A chore that waited for a thumbs up counts when it was approved.
export const earnedAt = entry => entry?.approvedAt || entry?.performedAt

// Only finished chores count: not skipped, waiting for a thumbs up or sent back.
export const countsForPoints = entry => entry?.status === COMPLETED_STATUS

export const isInWeek = (
  entry,
  now = new Date(),
  weekStart = DEFAULT_WEEK_START,
) => {
  const at = earnedAt(entry)
  if (!countsForPoints(entry) || !at) return false
  const time = new Date(at).getTime()
  const start = startOfWeek(now, weekStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return time >= start.getTime() && time < end.getTime()
}
