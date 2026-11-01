import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import murmurhash from 'murmurhash'

import { dateLocale } from '../../utils/DateLocale'
import { planReminders, reminderText } from '../../utils/ReminderPlan'

// Settings → Notifications fires this when the device switch changes, so the
// reminders follow it at once (task 018).
export const REMINDERS_CHANGED_EVENT = 'wuzzanext:reminders-changed'

const getNotificationPreferences = async () => {
  try {
    const ret = await Preferences.get({ key: 'notificationPreferences' })
    return JSON.parse(ret.value) || {}
  } catch {
    return {}
  }
}

// Reminders show only in the Android app, when Android allows notifications
// and the person has not switched them off in Settings → Notifications.
const canScheduleNotification = async () => {
  if (Capacitor.isNativePlatform() === false) {
    return false
  }
  const notificationPreferences = await getNotificationPreferences()
  if (notificationPreferences.granted === false) {
    return false
  }
  try {
    const permission = await LocalNotifications.checkPermissions()
    return permission.display === 'granted'
  } catch {
    return false
  }
}

const reminderId = (choreId, template) => {
  const hash = murmurhash.v3(`${choreId}-${template.value}-${template.unit}`)
  // Use Math.abs() with modulo to ensure positive ID within Java int range
  // This guarantees the ID is always positive and within 1 to 2^31-1
  return Math.abs(hash) % 2147483647
}

const cancelPendingNotifications = async () => {
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
    }
  } catch (error) {
    console.error('Error cancelling pending notifications:', error)
  }
}

// One run at a time, so a cancel from an older run never removes what a newer
// one scheduled.
let queue = Promise.resolve()
const serial = task => {
  queue = queue.then(task, task)
  return queue
}

const cancelChoreReminders = () => serial(cancelPendingNotifications)

// Replaces every pending reminder with the ones still ahead for this person.
const scheduleChoreReminders = ({ chores, t, userId }) =>
  serial(async () => {
    await cancelPendingNotifications()
    const locale = dateLocale()
    const notifications = planReminders({
      chores,
      userId,
      idFor: reminderId,
      text: fields => reminderText({ t, locale, ...fields }),
    })
    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }
    return notifications
  })

export { cancelChoreReminders, canScheduleNotification, scheduleChoreReminders }
