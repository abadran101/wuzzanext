import { CheckRounded } from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import Logo from '../../Logo'
import { useUserProfile } from '../../queries/UserQueries'
import { haptic } from '../../utils/Onboarding'
import { authButtonSx } from '../Authorization/authStyles'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const READY_KEYS = [
  'workspaceReady.readyShared',
  'workspaceReady.readyRecurring',
  'workspaceReady.readyCapture',
  'workspaceReady.readyReminders',
]

// Confirm the workspace is ready before entering the task list.
const WorkspaceReadyView = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: userProfile } = useUserProfile()

  const handleContinue = () => {
    haptic('medium')
    navigate('/', { replace: true })
  }

  return (
    <Box
      component='main'
      sx={{
        minHeight: 'calc(100dvh - var(--safe-area-inset-top, 0px))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 3,
        pb: 3,
        bgcolor: 'background.body',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          my: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 1.5,
            mb: 4,
            animation: `readyIn 520ms ${EASE} both`,
            '@keyframes readyIn': {
              from: { opacity: 0, transform: 'translateY(12px)' },
              to: { opacity: 1, transform: 'none' },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              '&::before': {
                content: '""',
                position: 'absolute',
                width: 170,
                height: 170,
                borderRadius: '50%',
                bgcolor: 'primary.softBg',
                opacity: 0.6,
                filter: 'blur(30px)',
              },
              '& > *': { position: 'relative' },
            }}
          >
            <Logo size='84px' />
          </Box>
          <Typography
            level='h1'
            sx={{
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            {userProfile?.displayName
              ? t('workspaceReady.allSetNamed', {
                  name: userProfile.displayName.split(' ')[0],
                })
              : t('workspaceReady.allSet')}
          </Typography>
          <Typography
            level='body-md'
            sx={{ color: 'text.secondary', maxWidth: '30ch' }}
          >
            {t('workspaceReady.subtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {READY_KEYS.map((key, index) => (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.75,
                py: 1.25,
                borderRadius: '14px',
                bgcolor: 'background.surface',
                border: '1px solid',
                borderColor: 'divider',
                // Each line checks itself off in turn: the small "it's done"
                // beat this screen exists for.
                animation: `readyTick 460ms ${EASE} ${180 + index * 120}ms both`,
                '@keyframes readyTick': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'none' },
                },
                '@media (prefers-reduced-motion: reduce)': {
                  animation: 'none',
                },
              }}
            >
              <Box
                sx={{
                  flex: '0 0 auto',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'success.500',
                  color: 'common.white',
                  '& svg': { fontSize: '1rem' },
                }}
              >
                <CheckRounded />
              </Box>
              <Typography level='body-sm' sx={{ fontWeight: 600 }}>
                {t(key)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Button size='lg' fullWidth onClick={handleContinue} sx={authButtonSx}>
          {t('workspaceReady.continue')}
        </Button>
      </Box>
    </Box>
  )
}

export default WorkspaceReadyView
