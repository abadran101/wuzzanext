import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useNotification } from '../service/NotificationProvider'
import { syncEngine } from '../utils/SyncEngine'

// When a queued change loses to a newer one, the outbox drops it and this
// says so once, naming the chores (owner, 2026-10-30; task 017).
export function useReplacedChangesNote() {
  const { i18n, t } = useTranslation('common')
  const { showNotification } = useNotification()
  // The provider hands out a new function on every render; subscribe once.
  const latest = useRef({ i18n, showNotification, t })
  useEffect(() => {
    latest.current = { i18n, showNotification, t }
  })

  useEffect(
    () =>
      syncEngine.onSyncStateChange(state => {
        const replaced = state?.replaced
        if (!replaced?.count) return
        const { i18n, showNotification, t } = latest.current
        let names = replaced.names.join(', ')
        try {
          names = new Intl.ListFormat(i18n.language, {
            type: 'conjunction',
          }).format(replaced.names)
        } catch {
          // keep the plain list
        }
        showNotification({
          type: 'warning',
          message: t('sync.replaced', {
            count: replaced.count,
            names: names || '—',
          }),
        })
      }),
    [],
  )
}
