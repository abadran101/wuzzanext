import { Sync, SyncDisabled } from '@mui/icons-material'
import {
  Box,
  Card,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  Switch,
  Typography,
} from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { useSSEContext } from '../hooks/useSSEContext'
import SSEConnectionStatus from './SSEConnectionStatus'

const SSESettings = () => {
  const { t } = useTranslation('settings')
  const {
    error,
    getConnectionStatus,
    isConnected,
    isConnecting,
    isSSEEnabled,
    toggleSSEEnabled,
  } = useSSEContext()

  const handleToggle = () => {
    const currentlyEnabled = isSSEEnabled()
    toggleSSEEnabled(!currentlyEnabled)
  }

  const getStatusDescription = () => {
    if (!isSSEEnabled()) {
      return t('realtime.disabledDescription')
    }

    if (isConnected) {
      return t('realtime.connectedDescription')
    }

    if (isConnecting) {
      return t('realtime.connectingDescription')
    }

    if (error) {
      return t('realtime.errorDescription', { error })
    }

    return t('realtime.disconnectedDescription')
  }

  return (
    <Card sx={{ mt: 2, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {isSSEEnabled() ? (
          <Sync color={isConnected ? 'success' : 'disabled'} />
        ) : (
          <SyncDisabled color='disabled' />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography level='title-md'>{t('realtime.titleSse')}</Typography>
          <Typography level='body-sm' color='neutral'>
            {t('realtime.subtitleSse')}
          </Typography>
        </Box>
        {isSSEEnabled() && <SSEConnectionStatus variant='chip' />}
      </Box>

      <FormControl orientation='horizontal' sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <FormLabel>{t('realtime.enableLabel')}</FormLabel>
          <FormHelperText sx={{ mt: 0 }}>
            {getStatusDescription()}
          </FormHelperText>
        </Box>
        <Switch
          checked={isSSEEnabled()}
          onChange={handleToggle}
          color={isSSEEnabled() ? 'success' : 'neutral'}
          variant='solid'
          endDecorator={isSSEEnabled() ? t('common.on') : t('common.off')}
          slotProps={{ endDecorator: { sx: { minWidth: 24 } } }}
        />
      </FormControl>

      {isSSEEnabled() && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography level='body-xs' color='neutral'>
            {t('realtime.statusLabel')}
          </Typography>
          <Chip
            size='sm'
            variant='soft'
            color={
              isConnected ? 'success' : isConnecting ? 'warning' : 'danger'
            }
          >
            {getConnectionStatus()}
          </Chip>
          {error && (
            <Typography level='body-xs' color='danger'>
              {error}
            </Typography>
          )}
        </Box>
      )}
    </Card>
  )
}

export default SSESettings
