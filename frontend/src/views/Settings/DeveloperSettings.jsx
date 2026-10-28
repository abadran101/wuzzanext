import { LocalNotifications } from '@capacitor/local-notifications'
import { Refresh, Token } from '@mui/icons-material'
import { Box, Button, Card, Chip, Divider, Typography } from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { networkManager } from '../../hooks/NetworkManager'
import useConfirmationModal from '../../hooks/useConfirmationModal'
import { useSSEContext } from '../../hooks/useSSEContext'
import { useUserProfile } from '../../queries/UserQueries'
import {
  evaluatePromptEligibility,
  isFeedbackSubmissionConfigured,
  isRawChatWebhookConfigured,
  resetFeedbackState,
  setDevForcedPrompt,
} from '../../service/FeedbackService'
import { useNotification } from '../../service/NotificationProvider'
import { resetPolicyUpdate } from '../../service/PolicyUpdateService'
import { apiClient } from '../../utils/ApiClient'
import { commandQueue } from '../../utils/CommandQueue'
import { RefreshToken } from '../../utils/Fetcher'
import { offlineDB } from '../../utils/OfflineDB'
import { syncEngine } from '../../utils/SyncEngine'
import { getRefreshTokenExpiry, isNative } from '../../utils/TokenStorage'
import FeedbackModal from '../Modals/FeedbackModal'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import PolicyUpdateModal from '../Modals/PolicyUpdateModal'

const DeveloperSettings = () => {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const { confirmModalConfig, showConfirmation } = useConfirmationModal()
  const { data: userProfile } = useUserProfile()
  const {
    error: sseError,
    getConnectionStatus,
    getDebugInfo,
    isConnected,
    isConnecting,
    lastEvent,
  } = useSSEContext()

  const [accessTokenExpiry, setAccessTokenExpiry] = useState(null)
  const [refreshTokenExpiry, setRefreshTokenExpiry] = useState(null)
  const [timeLeft, setTimeLeft] = useState({
    access: null,
    refresh: null,
  })
  const [isNativePlatform, setIsNativePlatform] = useState(false)
  const [sseDebugInfo, setSSEDebugInfo] = useState(null)
  const [timeSinceLastHeartbeat, setTimeSinceLastHeartbeat] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRefreshingDirect, setIsRefreshingDirect] = useState(false)
  const [scheduledNotifications, setScheduledNotifications] = useState([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isResettingSync, setIsResettingSync] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [policyModalOpen, setPolicyModalOpen] = useState(false)
  const [feedbackEligibility, setFeedbackEligibility] = useState(null)
  const [syncDiagnostics, setSyncDiagnostics] = useState({
    cursor: null,
    lastSync: null,
    pendingCount: 0,
    failedCount: 0,
    syncing: false,
    syncError: null,
    isOnline: networkManager.isOnline,
    isNetworkOn: networkManager.isNetworkOn,
    offlineSince: networkManager.offlineSince,
    lastChecked: networkManager.lastChecked,
  })

  const { showNotification } = useNotification()

  const refreshSyncDiagnostics = useCallback(async () => {
    try {
      const [cursor, lastSync, pendingCommands, failedCommands] =
        await Promise.all([
          offlineDB.getSyncCursor(),
          offlineDB.getLastSyncTime(),
          commandQueue.getPending(),
          commandQueue.getFailed(),
        ])

      setSyncDiagnostics(prev => ({
        ...prev,
        cursor,
        lastSync,
        pendingCount: pendingCommands.length,
        failedCount: failedCommands.length,
        isOnline: networkManager.isOnline,
        isNetworkOn: networkManager.isNetworkOn,
        offlineSince: networkManager.offlineSince,
        lastChecked: networkManager.lastChecked,
      }))
    } catch (error) {
      console.error('Failed to load sync diagnostics:', error)
    }
  }, [])

  useEffect(() => {
    setIsNativePlatform(isNative())

    const loadTokenData = async () => {
      const accessExpiry = localStorage.getItem('token_expiry')
      setAccessTokenExpiry(accessExpiry)

      if (isNative()) {
        const refreshExpiry = await getRefreshTokenExpiry()
        setRefreshTokenExpiry(refreshExpiry)
      }
    }

    const loadScheduledNotifications = async () => {
      if (isNative()) {
        setIsLoadingNotifications(true)
        try {
          const pending = await LocalNotifications.getPending()
          // Sort by schedule time (earliest first)
          const sorted = pending.notifications.sort((a, b) => {
            const timeA = a.schedule?.at ? new Date(a.schedule.at).getTime() : 0
            const timeB = b.schedule?.at ? new Date(b.schedule.at).getTime() : 0
            return timeA - timeB
          })
          setScheduledNotifications(sorted)
        } catch (error) {
          console.error('Error loading scheduled notifications:', error)
        } finally {
          setIsLoadingNotifications(false)
        }
      }
    }

    loadTokenData()
    loadScheduledNotifications()
    refreshSyncDiagnostics()
  }, [refreshSyncDiagnostics])

  useEffect(() => {
    const unsubscribeSync = syncEngine.onSyncStateChange(state => {
      setSyncDiagnostics(prev => ({
        ...prev,
        syncing:
          typeof state.syncing === 'boolean' ? state.syncing : prev.syncing,
        syncError: Object.prototype.hasOwnProperty.call(state, 'error')
          ? state.error
          : prev.syncError,
        lastSync: state.lastSync ?? prev.lastSync,
      }))
    })

    networkManager.registerNetworkListener(() => {
      setSyncDiagnostics(prev => ({
        ...prev,
        isOnline: networkManager.isOnline,
        isNetworkOn: networkManager.isNetworkOn,
        offlineSince: networkManager.offlineSince,
        lastChecked: networkManager.lastChecked,
      }))
    })

    const interval = setInterval(() => {
      refreshSyncDiagnostics()
    }, 5000)

    return () => {
      unsubscribeSync()
      clearInterval(interval)
    }
  }, [refreshSyncDiagnostics])

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()

      let accessTime = null
      if (accessTokenExpiry) {
        const accessExpiryDate = new Date(accessTokenExpiry)
        const diff = accessExpiryDate - now
        accessTime = diff > 0 ? diff : 0
      }

      let refreshTime = null
      if (refreshTokenExpiry) {
        const refreshExpiryDate = new Date(refreshTokenExpiry)
        const diff = refreshExpiryDate - now
        refreshTime = diff > 0 ? diff : 0
      }

      setTimeLeft({
        access: accessTime,
        refresh: refreshTime,
      })

      if (getDebugInfo) {
        const debugInfo = getDebugInfo()
        setSSEDebugInfo(debugInfo)
        setTimeSinceLastHeartbeat(debugInfo.timeSinceLastHeartbeat)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [accessTokenExpiry, refreshTokenExpiry, getDebugInfo])

  const formatTimeLeft = milliseconds => {
    if (milliseconds === null) return t('text.nA')
    if (milliseconds === 0) return t('text.expired')

    const totalSeconds = Math.floor(milliseconds / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

    return parts.join(' ')
  }

  const getExpiryStatus = milliseconds => {
    if (milliseconds === null) return 'neutral'
    if (milliseconds === 0) return 'danger'
    if (milliseconds < 5 * 60 * 1000) return 'warning' // Less than 5 minutes
    return 'success'
  }

  const handleRefreshToken = async () => {
    setIsRefreshing(true)
    try {
      const result = await apiClient.refreshToken()

      if (result.success) {
        showNotification({
          type: 'success',
          message: t('developer.tokenRefreshed'),
        })

        // Reload token expiry data
        const accessExpiry = localStorage.getItem('token_expiry')
        setAccessTokenExpiry(accessExpiry)

        if (isNativePlatform) {
          const refreshExpiry = await getRefreshTokenExpiry()
          setRefreshTokenExpiry(refreshExpiry)
        }
      } else {
        showNotification({
          type: 'error',
          message: t('text.tokenRefreshFailedError', { error: result.error }),
        })
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('text.tokenRefreshErrorError', { error: error.message }),
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDirectRefreshToken = async () => {
    setIsRefreshingDirect(true)
    try {
      const response = await RefreshToken()

      if (response.ok) {
        const data = await response.json()
        showNotification({
          type: 'success',
          message: t('developer.endpointCalled'),
        })

        // Reload token expiry data
        const accessExpiry = localStorage.getItem('token_expiry')
        setAccessTokenExpiry(accessExpiry)

        if (isNativePlatform) {
          const refreshExpiry = await getRefreshTokenExpiry()
          setRefreshTokenExpiry(refreshExpiry)
        }

        console.log('Refresh token response:', data)
      } else {
        const error = await response.text()
        showNotification({
          type: 'error',
          message: t('text.refreshTokenEndpointFailedStatusError', {
            status: response.status,
            error,
          }),
        })
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('text.refreshTokenEndpointErrorError', {
          error: error.message,
        }),
      })
    } finally {
      setIsRefreshingDirect(false)
    }
  }

  const handleRefreshNotifications = async () => {
    if (!isNativePlatform) return

    setIsLoadingNotifications(true)
    try {
      const pending = await LocalNotifications.getPending()
      // Sort by schedule time (earliest first)
      const sorted = pending.notifications.sort((a, b) => {
        const timeA = a.schedule?.at ? new Date(a.schedule.at).getTime() : 0
        const timeB = b.schedule?.at ? new Date(b.schedule.at).getTime() : 0
        return timeA - timeB
      })
      setScheduledNotifications(sorted)
      showNotification({
        type: 'success',
        message: t('developer.loadedNotifications', { count: sorted.length }),
      })
    } catch (error) {
      console.error('Error loading scheduled notifications:', error)
      showNotification({
        type: 'error',
        message: t('text.errorLoadingNotificationsError', {
          error: error.message,
        }),
      })
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  const handleResetDatabaseAndResync = async () => {
    showConfirmation(
      t('text.thisWillClearLocalOfflineDataAndPendingCommandsThenStartAFul'),
      t('text.clearLocalDBReSync'),
      async () => {
        setIsResettingSync(true)
        try {
          await offlineDB.clearAll()

          showNotification({
            type: 'success',
            message: t('developer.clearDbCleared'),
          })

          const didSync = await syncEngine.sync()
          if (didSync) {
            await queryClient.invalidateQueries()
            showNotification({
              type: 'success',
              message: t('developer.clearDbDone'),
            })
          } else {
            showNotification({
              type: 'warning',
              message: t(
                'text.databaseClearedFullSyncDidNotRunLikelyOfflineOrAlreadySyncin',
              ),
            })
          }
        } catch (error) {
          console.error('Failed to reset database and resync:', error)
          showNotification({
            type: 'error',
            message: t('text.resetresyncFailedError', { error: error.message }),
          })
        } finally {
          await refreshSyncDiagnostics()
          setIsResettingSync(false)
        }
      },
      t('text.clearReSync'),
      t('common.cancel'),
      'danger',
    )
  }

  const refreshFeedbackEligibility = useCallback(async () => {
    const result = await evaluatePromptEligibility({ userProfile })
    setFeedbackEligibility(result)
    return result
  }, [userProfile])

  useEffect(() => {
    refreshFeedbackEligibility()
  }, [refreshFeedbackEligibility])

  const handleForceFeedbackPrompt = async () => {
    await setDevForcedPrompt(true)
    await refreshFeedbackEligibility()
    showNotification({
      type: 'success',
      message: t('text.nextVisitToMyChoresWillShowThePromptAfter4s'),
    })
  }

  const handleForcePolicyUpdate = async () => {
    await resetPolicyUpdate()
    showNotification({
      type: 'success',
      message: t('text.nextVisitToMyChoresWillShowThePolicyNoticeAfter15s'),
    })
  }

  const handleResetFeedbackState = async () => {
    await resetFeedbackState()
    await refreshFeedbackEligibility()
    showNotification({
      type: 'success',
      message: t('text.feedbackStateClearedCompletionsCooldownOptout'),
    })
  }

  const getNotificationStatusColor = scheduleTime => {
    if (!scheduleTime) return 'neutral'

    const now = new Date()
    const scheduledDate = new Date(scheduleTime)
    const diffMs = scheduledDate - now

    if (diffMs < 0) return 'danger' // Past due
    if (diffMs < 5 * 60 * 1000) return 'warning' // Less than 5 minutes
    if (diffMs < 60 * 60 * 1000) return 'primary' // Less than 1 hour
    return 'success' // More than 1 hour
  }

  const formatDateTime = timestamp => {
    if (!timestamp) return t('text.nA')
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className='grid gap-4 py-4' id='developer'>
      <Typography level='h3'>
        {t('overview.sections.developer.title')}
      </Typography>
      <Divider />
      <Typography level='body-md'>
        {t('developer.intro')}
        {t('developer.stateThisinformationisusefulfor')}
      </Typography>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography level='title-lg'>
              {t('developer.AuthenticationTokens')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size='sm'
                variant='soft'
                startDecorator={<Refresh />}
                onClick={handleRefreshToken}
                loading={isRefreshing}
                disabled={isRefreshing || isRefreshingDirect}
              >
                {t('developer.RefreshToken')}
              </Button>
              <Button
                size='sm'
                variant='outlined'
                color='neutral'
                startDecorator={<Token />}
                onClick={handleDirectRefreshToken}
                loading={isRefreshingDirect}
                disabled={isRefreshing || isRefreshingDirect}
              >
                {t('developer.CallRefreshEndpoint')}
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('apiTokens.accessToken')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Typography level='body-sm'>{t('developer.TimeLeft')}</Typography>
              <Chip color={getExpiryStatus(timeLeft.access)} variant='soft'>
                {formatTimeLeft(timeLeft.access)}
              </Chip>
            </Box>
            {accessTokenExpiry && (
              <Typography level='body-xs' sx={{ mt: 0.5 }} color='neutral'>
                {t('developer.Expires')}{' '}
                {new Date(accessTokenExpiry).toLocaleString()}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('developer.RefreshToken')}
            </Typography>
            {isNativePlatform ? (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography level='body-sm'>
                    {t('developer.TimeLeft')}
                  </Typography>
                  <Chip
                    color={getExpiryStatus(timeLeft.refresh)}
                    variant='soft'
                  >
                    {formatTimeLeft(timeLeft.refresh)}
                  </Chip>
                </Box>
                {refreshTokenExpiry && (
                  <Typography level='body-xs' sx={{ mt: 0.5 }} color='neutral'>
                    {t('developer.Expires')}{' '}
                    {new Date(refreshTokenExpiry).toLocaleString()}
                  </Typography>
                )}
              </>
            ) : (
              <Typography level='body-sm' color='neutral'>
                {t('developer.refreshCookieNote')}
              </Typography>
            )}
          </Box>
        </Box>
      </Card>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography level='title-lg'>
            {t('developer.PlatformInformation')}
          </Typography>

          <Box>
            <Typography level='body-sm'>
              {t('developer.Platform')}{' '}
              <Chip variant='soft' size='sm'>
                {isNativePlatform ? t('text.native') : t('text.web')}
              </Chip>
            </Typography>
          </Box>
        </Box>
      </Card>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography level='title-lg'>
              {t('developer.SyncNetworkDiagnostics')}
            </Typography>
            <Button
              size='sm'
              variant='soft'
              startDecorator={<Refresh />}
              onClick={refreshSyncDiagnostics}
            >
              {t('common.refresh')}
            </Button>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>
              {t('developer.NetworkStatus')}
            </Typography>
            <Typography level='body-sm'>
              {t('developer.Connection')}{' '}
              <Chip
                size='sm'
                variant='soft'
                color={syncDiagnostics.isOnline ? 'success' : 'danger'}
              >
                {syncDiagnostics.isOnline
                  ? t('text.online')
                  : t('text.offline')}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              {t('developer.DeviceNetwork')}{' '}
              <Chip
                size='sm'
                variant='soft'
                color={
                  syncDiagnostics.isNetworkOn === false
                    ? 'danger'
                    : syncDiagnostics.isNetworkOn === true
                      ? 'success'
                      : 'neutral'
                }
              >
                {syncDiagnostics.isNetworkOn === false
                  ? t('bridge.disconnectedTitle')
                  : syncDiagnostics.isNetworkOn === true
                    ? t('text.connected')
                    : t('text.unknown')}
              </Chip>
            </Typography>
            <Typography level='body-xs' color='neutral'>
              {t('developer.OfflineSince')}{' '}
              {formatDateTime(syncDiagnostics.offlineSince)}
            </Typography>
            <Typography level='body-xs' color='neutral'>
              {t('developer.LastNetworkCheck')}{' '}
              {formatDateTime(syncDiagnostics.lastChecked)}
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>
              {t('developer.SyncOffsetInformation')}
            </Typography>
            <Typography level='body-sm'>
              {t('developer.SyncCursor')}{' '}
              <Chip size='sm' variant='soft'>
                {syncDiagnostics.cursor ?? t('text.nA')}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              {t('developer.LastSync')}{' '}
              <Chip size='sm' variant='soft' color='primary'>
                {formatDateTime(syncDiagnostics.lastSync)}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              {t('developer.SyncState')}{' '}
              <Chip
                size='sm'
                variant='soft'
                color={syncDiagnostics.syncing ? 'warning' : 'success'}
              >
                {syncDiagnostics.syncing ? t('text.syncing') : t('text.idle')}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              {t('developer.PendingCommands')}{' '}
              <Chip size='sm' variant='soft' color='warning'>
                {syncDiagnostics.pendingCount}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              {t('developer.FailedCommands')}{' '}
              <Chip
                size='sm'
                variant='soft'
                color={syncDiagnostics.failedCount > 0 ? 'danger' : 'success'}
              >
                {syncDiagnostics.failedCount}
              </Chip>
            </Typography>
            {syncDiagnostics.syncError && (
              <Typography level='body-sm' color='danger'>
                {t('developer.SyncError')} {syncDiagnostics.syncError}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>
              {t('developer.RecoveryActions')}
            </Typography>
            <Typography level='body-xs' color='warning'>
              {t('developer.Clearslocalofflinecachesynccursor')}
            </Typography>
            <Box>
              <Button
                size='sm'
                color='danger'
                variant='soft'
                onClick={handleResetDatabaseAndResync}
                loading={isResettingSync}
                disabled={isResettingSync || syncDiagnostics.syncing}
              >
                {t('developer.ClearDBFullReSync')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography level='title-lg'>
              {t('developer.FeedbackPrompt')}
            </Typography>
            <Button
              size='sm'
              variant='soft'
              startDecorator={<Refresh />}
              onClick={refreshFeedbackEligibility}
            >
              {t('common.refresh')}
            </Button>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>
              {t('developer.PromptEligibility')}
            </Typography>
            <Typography level='body-sm'>
              {t('developer.Wouldautoshow')}{' '}
              <Chip
                size='sm'
                variant='soft'
                color={feedbackEligibility?.eligible ? 'success' : 'neutral'}
              >
                {feedbackEligibility?.eligible ? t('text.yes') : t('text.no')}
              </Chip>
              {feedbackEligibility?.forced && (
                <Chip size='sm' variant='soft' color='warning' sx={{ ml: 1 }}>
                  {t('developer.Forced')}
                </Chip>
              )}
            </Typography>
            {feedbackEligibility?.blockers?.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {feedbackEligibility.blockers.map(blocker => (
                  <Typography key={blocker} level='body-xs' color='neutral'>
                    • {blocker}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>{t('developer.State')}</Typography>
            <Typography level='body-sm'>
              {t('developer.Completionscounted')}{' '}
              <Chip size='sm' variant='soft'>
                {feedbackEligibility?.state?.completions ?? t('text.nA')}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              {t('developer.Lastsentiment')}{' '}
              <Chip size='sm' variant='soft'>
                {feedbackEligibility?.state?.lastSentiment ??
                  t('notifications.targetNone')}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              {t('developer.Dismissals')}{' '}
              <Chip size='sm' variant='soft'>
                {feedbackEligibility?.state?.dismissCount ?? 0}
              </Chip>
            </Typography>
            <Typography level='body-sm'>
              {t('developer.Optedout')}{' '}
              <Chip
                size='sm'
                variant='soft'
                color={
                  feedbackEligibility?.state?.optedOut ? 'danger' : 'success'
                }
              >
                {feedbackEligibility?.state?.optedOut
                  ? t('text.yes')
                  : t('text.no')}
              </Chip>
            </Typography>
            <Typography level='body-xs' color='neutral'>
              {t('developer.Lastprompted')}{' '}
              {formatDateTime(feedbackEligibility?.state?.lastPromptedAt)}
              {feedbackEligibility?.state?.lastPromptedVersion
                ? t('text.onVersion', {
                    version: feedbackEligibility.state.lastPromptedVersion,
                  })
                : ''}
            </Typography>
            <Typography level='body-xs' color='neutral'>
              {t('developer.Currentversion')}{' '}
              {feedbackEligibility?.version ?? t('text.nA')}{' '}
              {t('developer.Webhook')}{' '}
              {isFeedbackSubmissionConfigured()
                ? t('text.configured')
                : t('text.nOTConfiguredSubmissionsLogToConsole')}
            </Typography>
            {isRawChatWebhookConfigured() && (
              <Typography level='body-xs' color='danger'>
                {t(
                  'developer.VITEFEEDBACKWEBHOOKURLpointsstraightataDiscordSlack',
                )}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level='title-sm'>{t('developer.Actions')}</Typography>
            <Typography level='body-xs' color='neutral'>
              {t('developer.Forcenextpromptbypasseseverygate')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size='sm'
                variant='soft'
                onClick={() => setFeedbackModalOpen(true)}
              >
                {t('developer.OpenFlow')}
              </Button>
              <Button
                size='sm'
                variant='outlined'
                color='neutral'
                onClick={handleForceFeedbackPrompt}
              >
                {t('developer.ForceNextPrompt')}
              </Button>
              <Button
                size='sm'
                variant='soft'
                color='danger'
                onClick={handleResetFeedbackState}
              >
                {t('developer.ResetState')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography level='title-lg'>
            {t('developer.PolicyUpdateNotice')}
          </Typography>
          <Divider />
          <Typography level='body-sm' color='neutral'>
            {t('developer.ShownonceperPOLICYVERSIONtoaccounts')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size='sm'
              variant='soft'
              onClick={() => setPolicyModalOpen(true)}
            >
              {t('developer.OpenNotice')}
            </Button>
            <Button
              size='sm'
              variant='outlined'
              color='neutral'
              onClick={handleForcePolicyUpdate}
            >
              {t('developer.ForceNextPrompt')}
            </Button>
          </Box>
        </Box>
      </Card>

      {isNativePlatform && (
        <Card variant='outlined'>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography level='title-lg'>
                {t('developer.ScheduledLocalNotifications')}
              </Typography>
              <Button
                size='sm'
                variant='soft'
                startDecorator={<Refresh />}
                onClick={handleRefreshNotifications}
                loading={isLoadingNotifications}
                disabled={isLoadingNotifications}
              >
                {t('common.refresh')}
              </Button>
            </Box>

            <Divider />

            {scheduledNotifications.length === 0 ? (
              <Typography level='body-sm' color='neutral'>
                {t('developer.Noschedulednotifications')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography level='body-sm'>
                  {t('developer.Totalscheduled')}{' '}
                  <Chip variant='soft' size='sm'>
                    {scheduledNotifications.length}
                  </Chip>
                </Typography>

                <Divider />

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {scheduledNotifications.map((notification, index) => {
                    const scheduleTime = notification.schedule?.at
                    const scheduledDate = scheduleTime
                      ? new Date(scheduleTime)
                      : null
                    const now = new Date()
                    const timeUntil = scheduledDate ? scheduledDate - now : null

                    return (
                      <Card
                        key={notification.id || index}
                        variant='soft'
                        size='sm'
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                          }}
                        >
                          <Typography level='title-sm'>
                            {notification.title || t('text.noTitle')}
                          </Typography>
                          <Typography level='body-xs' color='neutral'>
                            {notification.body || t('text.noBody')}
                          </Typography>

                          <Box
                            sx={{
                              display: 'flex',
                              gap: 1,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              mt: 0.5,
                            }}
                          >
                            {scheduledDate && (
                              <>
                                <Chip
                                  size='sm'
                                  variant='soft'
                                  color={getNotificationStatusColor(
                                    scheduleTime,
                                  )}
                                >
                                  {timeUntil && timeUntil > 0
                                    ? formatTimeLeft(timeUntil)
                                    : t('text.pastDue')}
                                </Chip>
                                <Typography level='body-xs' color='neutral'>
                                  {scheduledDate.toLocaleString()}
                                </Typography>
                              </>
                            )}
                            {notification.extra?.choreId && (
                              <Chip size='sm' variant='outlined'>
                                {t('developer.ChoreID')}{' '}
                                {notification.extra.choreId}
                              </Chip>
                            )}
                          </Box>
                        </Box>
                      </Card>
                    )
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Card>
      )}

      <Card variant='outlined'>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography level='title-lg'>
            {t('developer.ServerSentEventsSSE')}
          </Typography>

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('developer.ConnectionStatus')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Chip
                color={
                  isConnected ? 'success' : isConnecting ? 'warning' : 'neutral'
                }
                variant='soft'
              >
                {getConnectionStatus
                  ? getConnectionStatus().toUpperCase()
                  : t('text.unknown')}
              </Chip>
            </Box>
            {sseError && (
              <Typography level='body-sm' color='danger' sx={{ mt: 0.5 }}>
                {t('developer.Error')} {sseError}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('developer.LastEventReceived')}
            </Typography>
            {lastEvent ? (
              <>
                <Typography level='body-sm'>
                  {t('developer.Type')}{' '}
                  <Chip variant='soft' size='sm'>
                    {lastEvent.type}
                  </Chip>
                </Typography>
                <Typography level='body-xs' color='neutral' sx={{ mt: 0.5 }}>
                  {t('developer.Received')}{' '}
                  {lastEvent.timestamp
                    ? new Date(lastEvent.timestamp).toLocaleString()
                    : t('text.nA')}
                </Typography>
              </>
            ) : (
              <Typography level='body-sm' color='neutral'>
                {t('developer.Noeventsreceivedyet')}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('developer.HeartbeatStatus')}
            </Typography>
            {sseDebugInfo?.lastHeartbeat ? (
              <>
                <Typography level='body-sm'>
                  {t('developer.LastHeartbeat')}{' '}
                  {new Date(sseDebugInfo.lastHeartbeat).toLocaleString()}
                </Typography>
                <Typography level='body-sm' sx={{ mt: 0.5 }}>
                  {t('developer.TimeSinceLastHeartbeat')}{' '}
                  <Chip
                    variant='soft'
                    size='sm'
                    color={
                      timeSinceLastHeartbeat > 120000 ? 'warning' : 'success'
                    }
                  >
                    {formatTimeLeft(timeSinceLastHeartbeat)}
                  </Chip>
                </Typography>
              </>
            ) : (
              <Typography level='body-sm' color='neutral'>
                {t('developer.Noheartbeatreceivedyet')}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('developer.ReconnectionSchedule')}
            </Typography>
            {sseDebugInfo ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {sseDebugInfo.nextReconnectTime ? (
                  <>
                    <Typography level='body-sm'>
                      {t('developer.NextReconnect')}{' '}
                      {new Date(
                        sseDebugInfo.nextReconnectTime,
                      ).toLocaleString()}
                    </Typography>
                    <Typography level='body-sm'>
                      {t('developer.TimeUntilReconnect')}{' '}
                      <Chip variant='soft' size='sm' color='warning'>
                        {formatTimeLeft(sseDebugInfo.timeUntilReconnect)}
                      </Chip>
                    </Typography>
                    <Typography level='body-sm'>
                      {t('developer.CurrentDelay')}{' '}
                      <Chip variant='soft' size='sm'>
                        {formatTimeLeft(sseDebugInfo.currentReconnectDelay)}
                      </Chip>
                    </Typography>
                  </>
                ) : (
                  <Typography level='body-sm' color='neutral'>
                    {t('developer.Noreconnectionscheduled')}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography level='body-sm' color='neutral'>
                {t('developer.noReconnectInfo')}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('developer.TimeoutConfiguration')}
            </Typography>
            {sseDebugInfo ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography level='body-sm'>
                  {t('developer.HeartbeatTimeout')}{' '}
                  <Chip variant='soft' size='sm'>
                    {formatTimeLeft(sseDebugInfo.heartbeatTimeout)}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  {t('developer.MonitorInterval')}{' '}
                  <Chip variant='soft' size='sm'>
                    {formatTimeLeft(sseDebugInfo.heartbeatMonitorInterval)}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  {t('developer.MonitorTimeout')}{' '}
                  <Chip variant='soft' size='sm'>
                    {formatTimeLeft(sseDebugInfo.heartbeatMonitorTimeout)}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  {t('developer.CircuitBreakerReset')}{' '}
                  <Chip variant='soft' size='sm'>
                    {formatTimeLeft(sseDebugInfo.circuitBreakerResetTime)}
                  </Chip>
                </Typography>
              </Box>
            ) : (
              <Typography level='body-sm' color='neutral'>
                {t('developer.noTimeoutInfo')}
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography level='title-sm' mb={1}>
              {t('developer.DebugInformation')}
            </Typography>
            {sseDebugInfo ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography level='body-sm'>
                  {t('developer.ReconnectAttempts')}{' '}
                  <Chip variant='soft' size='sm'>
                    {sseDebugInfo.reconnectAttempts} /{' '}
                    {sseDebugInfo.maxReconnectAttempts}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  {t('developer.CircuitBreaker')}{' '}
                  <Chip
                    variant='soft'
                    size='sm'
                    color={
                      sseDebugInfo.isCircuitBreakerOpen ? 'danger' : 'success'
                    }
                  >
                    {sseDebugInfo.isCircuitBreakerOpen
                      ? t('text.oPEN')
                      : t('text.cLOSED')}
                  </Chip>
                </Typography>
                <Typography level='body-sm'>
                  {t('developer.ConnectionState')}{' '}
                  <Chip variant='soft' size='sm'>
                    {sseDebugInfo.connectionState === 0
                      ? t('text.cONNECTING')
                      : sseDebugInfo.connectionState === 1
                        ? t('text.oPEN')
                        : t('text.cLOSED')}
                  </Chip>
                </Typography>
              </Box>
            ) : (
              <Typography level='body-sm' color='neutral'>
                {t('developer.noDebugInfo')}
              </Typography>
            )}
          </Box>
        </Box>
      </Card>

      <FeedbackModal
        open={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false)
          refreshFeedbackEligibility()
        }}
      />

      {/* Preview only — deliberately does not acknowledge, so opening it here
          never suppresses the real notice. */}
      <PolicyUpdateModal
        open={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
      />

      <ConfirmationModal config={confirmModalConfig} />
    </div>
  )
}

export default DeveloperSettings
