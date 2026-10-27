import { BackspaceOutlined } from '@mui/icons-material'
import { Avatar, Box, Button, IconButton, Typography } from '@mui/joy'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { resolvePhotoURL } from '../../utils/Helpers'
import {
  lockSeconds,
  retryDeadline,
  updatePIN,
} from '../../utils/ProfileSession'

const FacesPicker = ({ onLogin, onPassword, profiles }) => {
  const { t } = useTranslation('profiles')
  const [selected, setSelected] = useState(null)
  const [pin, setPIN] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [locks, setLocks] = useState({})
  const [now, setNow] = useState(() => Date.now())
  const [shake, setShake] = useState(0)
  const submitting = useRef(false)
  const panel = useRef(null)
  const remaining = lockSeconds(locks[selected?.id] || 0, now)

  useEffect(() => {
    if (selected) panel.current?.focus()
  }, [selected])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])

  const press = async key => {
    if (submitting.current || remaining || !selected?.pinEnabled) return
    const next = updatePIN(pin, key)
    setPIN(next)
    setError('')
    if (next.length !== 4) return
    submitting.current = true
    setBusy(true)
    try {
      const result = await onLogin({ profileId: selected.id, pin: next })
      if (!result.success) {
        if (result.status === 429) {
          setLocks(previous => ({
            ...previous,
            [selected.id]: retryDeadline(result.retryAfter),
          }))
          setNow(Date.now())
        } else {
          setError(result.status === 401 ? 'wrongPIN' : 'failed')
          setShake(previous => previous + 1)
        }
      }
    } catch {
      setError('failed')
    } finally {
      setPIN('')
      setBusy(false)
      submitting.current = false
    }
  }

  return (
    <Box
      ref={panel}
      tabIndex={-1}
      onKeyDown={event => {
        if (
          selected &&
          (/^[0-9]$/.test(event.key) || event.key === 'Backspace')
        ) {
          event.preventDefault()
          void press(event.key === 'Backspace' ? 'delete' : event.key)
        }
      }}
      sx={{ display: 'grid', gap: 2, textAlign: 'center' }}
    >
      <Typography level='h2'>{t('choosePerson')}</Typography>
      {!selected ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 2,
          }}
        >
          {profiles.map(profile => (
            <Button
              key={profile.id}
              variant='plain'
              onClick={() => {
                setSelected(profile)
                setError('')
                setPIN('')
              }}
              sx={{ flexDirection: 'column', gap: 1, py: 2 }}
            >
              <Avatar
                src={resolvePhotoURL(profile.image)}
                sx={{
                  bgcolor: profile.colour,
                  color: '#18212b',
                  width: 88,
                  height: 88,
                  fontSize: 36,
                }}
              >
                {profile.displayName?.charAt(0)}
              </Avatar>
              {profile.displayName}
            </Button>
          ))}
        </Box>
      ) : (
        <>
          <Avatar
            src={resolvePhotoURL(selected.image)}
            sx={{
              bgcolor: selected.colour,
              mx: 'auto',
              width: 88,
              height: 88,
              fontSize: 36,
            }}
          >
            {selected.displayName?.charAt(0)}
          </Avatar>
          <Typography level='h3'>{selected.displayName}</Typography>
          {selected.pinEnabled ? (
            <>
              <Typography
                key={shake}
                dir='ltr'
                aria-label={t('pinDigits', { count: pin.length })}
                sx={{
                  fontSize: 32,
                  letterSpacing: 8,
                  '@keyframes pinShake': {
                    '25%, 75%': { transform: 'translateX(-8px)' },
                    '50%': { transform: 'translateX(8px)' },
                  },
                  animation: shake ? 'pinShake 300ms' : 'none',
                }}
              >
                {'●'.repeat(pin.length)}
                {'○'.repeat(4 - pin.length)}
              </Typography>
              <Typography role='status'>
                {remaining
                  ? t('locked', { count: remaining })
                  : error
                    ? t(error)
                    : t('enterPIN')}
              </Typography>
              <Box
                dir='ltr'
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1,
                  maxWidth: 320,
                  width: '100%',
                  mx: 'auto',
                }}
              >
                {[
                  '1',
                  '2',
                  '3',
                  '4',
                  '5',
                  '6',
                  '7',
                  '8',
                  '9',
                  null,
                  '0',
                  'delete',
                ].map((key, index) =>
                  key === null ? (
                    <span key={index} />
                  ) : (
                    <IconButton
                      key={key}
                      variant='soft'
                      disabled={busy || remaining > 0}
                      onClick={() => press(key)}
                      aria-label={key === 'delete' ? t('delete') : key}
                      sx={{ minHeight: 64, fontSize: 28 }}
                    >
                      {key === 'delete' ? <BackspaceOutlined /> : key}
                    </IconButton>
                  ),
                )}
              </Box>
            </>
          ) : (
            <Typography role='status'>{t('askAdmin')}</Typography>
          )}
          <Button
            variant='plain'
            disabled={busy}
            onClick={() => {
              setSelected(null)
              setPIN('')
              setError('')
            }}
          >
            {t('back')}
          </Button>
        </>
      )}
      <Button variant='plain' size='sm' disabled={busy} onClick={onPassword}>
        {t('passwordSignIn')}
      </Button>
    </Box>
  )
}

export default FacesPicker

FacesPicker.propTypes = {
  profiles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      displayName: PropTypes.string.isRequired,
      image: PropTypes.string,
      colour: PropTypes.string,
      pinEnabled: PropTypes.bool,
    }),
  ).isRequired,
  onLogin: PropTypes.func.isRequired,
  onPassword: PropTypes.func.isRequired,
}
