import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useChores } from '../queries/ChoreQueries'
import { useUserProfile } from '../queries/UserQueries'
import {
  cancelChoreReminders,
  canScheduleNotification,
  REMINDERS_CHANGED_EVENT,
  scheduleChoreReminders,
} from '../views/Chores/LocalNotificationScheduler'
import { useAuth } from './useAuth.jsx'

/**
 * Keeps the Android app's due-task reminders in step with the chores, from
 * any screen (task 018). The chores come from the offline copy, so reminders
 * follow changes made offline too. Only the signed-in person's chores remind;
 * signing out (or a session running out) cancels them, and switching person
 * replaces them with the new person's.
 */
const useChoreReminders = () => {
  const isNative = Capacitor.isNativePlatform()
  const { isAuthenticated } = useAuth()
  const { i18n, t } = useTranslation('common')
  const { data: userProfile } = useUserProfile({
    enabled: isNative && isAuthenticated,
  })
  const { data } = useChores(false, { enabled: isNative && isAuthenticated })
  const [settingsChange, setSettingsChange] = useState(0)

  useEffect(() => {
    if (!isNative) return undefined
    const bump = () => setSettingsChange(n => n + 1)
    window.addEventListener(REMINDERS_CHANGED_EVENT, bump)
    return () => window.removeEventListener(REMINDERS_CHANGED_EVENT, bump)
  }, [isNative])

  const userId = userProfile?.id
  const chores = data?.res

  useEffect(() => {
    if (!isNative) return
    const run = async () => {
      if (!isAuthenticated) {
        await cancelChoreReminders()
        return
      }
      if (!userId || !chores) return
      if (!(await canScheduleNotification())) {
        await cancelChoreReminders()
        return
      }
      await scheduleChoreReminders({ chores, userId, t })
    }
    run().catch(error => console.error('Error scheduling reminders:', error))
  }, [
    isNative,
    isAuthenticated,
    userId,
    chores,
    t,
    i18n.language,
    settingsChange,
  ])
}

export default useChoreReminders
