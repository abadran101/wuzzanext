import { App } from '@capacitor/app'
import {
  CircularProgress,
  Modal,
  ModalDialog,
  Snackbar,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import PropTypes from 'prop-types'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../contexts/LocalizationContext'
import { useUserProfile } from '../queries/UserQueries'
import { apiClient } from '../utils/ApiClient'
import { offlineDB } from '../utils/OfflineDB'
import { canSwitchPerson, isIdle } from '../utils/ProfileSession'
import { syncEngine } from '../utils/SyncEngine'
import { clearAllTokens } from '../utils/TokenStorage'

const ProfileSessionContext = createContext(null)
export const useProfileSession = () => useContext(ProfileSessionContext)

export default function ProfileSessionManager({ children }) {
  const { t } = useTranslation('profiles')
  const queryClient = useQueryClient()
  const { data: profile } = useUserProfile()
  const { setProfileLanguage } = useLocalization()
  const [sharedTablet, setSharedTabletState] = useState(
    () => localStorage.getItem('sharedTablet') === 'true',
  )
  const [blocked, setBlocked] = useState(false)
  const [switchingVisible, setSwitchingVisible] = useState(false)
  const [initialInput] = useState(
    () => Number(localStorage.getItem('profileLastInput')) || Date.now(),
  )
  const lastInput = useRef(initialInput)
  const switching = useRef(false)

  useEffect(() => {
    if (profile?.id) {
      lastInput.current =
        Number(localStorage.getItem('profileLastInput')) || Date.now()
    }
  }, [profile?.id])

  useEffect(() => {
    setProfileLanguage(profile?.language || '')
  }, [profile?.language, setProfileLanguage])

  const setSharedTablet = value => {
    localStorage.setItem('sharedTablet', String(value))
    lastInput.current = Date.now()
    localStorage.setItem('profileLastInput', String(lastInput.current))
    setSharedTabletState(value)
  }

  const switchPerson = useCallback(async () => {
    if (switching.current) return false
    switching.current = true
    setSwitchingVisible(true)
    try {
      if (syncEngine.inFlight) await syncEngine.inFlight
      const allowed = await canSwitchPerson({
        getPending: () => offlineDB.getCommands(),
        sync: () => syncEngine.sync(),
        online: navigator.onLine,
      })
      if (!allowed) {
        setBlocked(true)
        return false
      }
      // Stop active queries before removing cached data. Never delete the outbox.
      await queryClient.cancelQueries()
      if ((await offlineDB.getCommands()).length) {
        setBlocked(true)
        return false
      }
      await offlineDB.clearServerData()
      try {
        const { unregisterPushNotifications } =
          await import('../CapacitorListener')
        await unregisterPushNotifications()
      } catch {
        /* A device without push can still switch. */
      }
      try {
        await apiClient.post('/auth/logout', undefined, {
          credentials: 'include',
          skipAuthRecovery: true,
        })
      } catch {
        /* Local sign-out works without a server connection. */
      }
      const { clearImageCache } = await import('../utils/ImageCache')
      const { clearWidgetData } = await import('../service/WidgetService')
      await clearImageCache()
      await clearWidgetData()
      await clearAllTokens()
      localStorage.removeItem('impersonatedUserId')
      queryClient.clear()
      setProfileLanguage('')
      window.location.replace('/login')
      return true
    } catch {
      setBlocked(true)
      return false
    } finally {
      switching.current = false
      setSwitchingVisible(false)
    }
  }, [queryClient, setProfileLanguage])

  useEffect(() => {
    if (!sharedTablet || !profile) return undefined
    const check = () => {
      if (isIdle(lastInput.current)) void switchPerson()
    }
    const input = () => {
      // Check before recording input so the first touch after backgrounding
      // cannot reset an already expired session.
      check()
      lastInput.current = Date.now()
      localStorage.setItem('profileLastInput', String(lastInput.current))
    }
    const visible = () => {
      if (document.visibilityState === 'visible') check()
    }
    window.addEventListener('pointerdown', input, true)
    window.addEventListener('keydown', input, true)
    document.addEventListener('visibilitychange', visible)
    const timer = setInterval(check, 1000)
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) check()
    })
    return () => {
      clearInterval(timer)
      window.removeEventListener('pointerdown', input, true)
      window.removeEventListener('keydown', input, true)
      document.removeEventListener('visibilitychange', visible)
      void listener.then(handle => handle.remove())
    }
  }, [sharedTablet, profile, switchPerson])

  return (
    <ProfileSessionContext.Provider
      value={{ switchPerson, sharedTablet, setSharedTablet }}
    >
      {children}
      <Modal open={switchingVisible}>
        <ModalDialog sx={{ alignItems: 'center' }}>
          <CircularProgress />
          <Typography>{t('switchPerson')}</Typography>
        </ModalDialog>
      </Modal>
      <Snackbar open={blocked} onClose={() => setBlocked(false)}>
        {t('switchBlocked')}
      </Snackbar>
    </ProfileSessionContext.Provider>
  )
}

ProfileSessionManager.propTypes = { children: PropTypes.node }
