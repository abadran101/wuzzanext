import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Sheet,
  Switch,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ProfileColourPicker from '../../components/ProfileColourPicker'
import { useProfileSession } from '../../components/ProfileSessionManager'
import { useMenuVisibility } from '../../queries/MenuVisibilityQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { apiClient } from '../../utils/ApiClient'
import { MENU_ITEM_NAMES } from '../../utils/MenuVisibility'
import { PROFILE_COLOURS } from '../../utils/ProfileSession'

export default function HouseholdProfileSettings() {
  const menu = useMenuVisibility()
  const { t } = useTranslation('profiles')
  const { data: profile, refetch } = useUserProfile()
  const { data: members } = useCircleMembers()
  const { setSharedTablet, sharedTablet } = useProfileSession()
  const [colour, setColour] = useState(profile?.colour || PROFILE_COLOURS[0])
  const [language, setLanguage] = useState(profile?.language || '')
  const [current, setCurrent] = useState('')
  const [newPIN, setNewPIN] = useState('')
  const [changePIN, setChangePIN] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [profiles, setProfiles] = useState([])
  const [name, setName] = useState('')
  const [familyColour, setFamilyColour] = useState(PROFILE_COLOURS[0])
  const [familyPIN, setFamilyPIN] = useState('')
  const [admin, setAdmin] = useState(false)
  const [resetID, setResetID] = useState(null)
  const [resetPIN, setResetPIN] = useState('')
  const isAdmin =
    !localStorage.getItem('impersonatedUserId') &&
    members?.res?.some(
      member => member.userId === profile?.id && member.role === 'admin',
    )
  const loadProfiles = async () => {
    const response = await apiClient.get('/auth/profiles', {
      skipAuthRecovery: true,
    })
    if (!response.ok) throw new Error()
    setProfiles((await response.json()).profiles || [])
  }
  useEffect(() => {
    if (!isAdmin) return undefined
    let active = true
    apiClient
      .get('/auth/profiles', { skipAuthRecovery: true })
      .then(async response => {
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (active) setProfiles(data.profiles || [])
      })
      .catch(() => {
        if (active) setMessage('failed')
      })
    return () => {
      active = false
    }
  }, [isAdmin])
  const save = async (endpoint, body, method = 'put') => {
    setBusy(true)
    setMessage('')
    try {
      const response = await apiClient[method](endpoint, JSON.stringify(body), {
        skipAuthRecovery: true,
      })
      if (!response.ok) throw new Error()
      await refetch()
      if (isAdmin) await loadProfiles()
      setCurrent('')
      setNewPIN('')
      setFamilyPIN('')
      setResetPIN('')
      setName('')
      setChangePIN(false)
      setMessage('saved')
    } catch {
      setMessage('failed')
    } finally {
      setBusy(false)
    }
  }
  const pinProps = {
    type: 'password',
    slotProps: {
      input: {
        inputMode: 'numeric',
        pattern: '[0-9]{4}',
        maxLength: 4,
        dir: 'ltr',
        autoComplete: 'new-password',
      },
    },
  }
  const cleanPIN = value => value.replace(/[^0-9]/g, '').slice(0, 4)
  const field = (label, element) => (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      {element}
    </FormControl>
  )
  return (
    <Box sx={{ display: 'grid', gap: 2, mt: 2, maxWidth: 680 }}>
      <Sheet
        variant='outlined'
        sx={{ p: 2, borderRadius: 'lg', display: 'grid', gap: 2 }}
      >
        <Typography level='h3'>{t('profile')}</Typography>
        {field(
          t('colour'),
          <ProfileColourPicker value={colour} onChange={setColour} />,
        )}
        {field(
          t('language'),
          <Select value={language} onChange={(_, value) => setLanguage(value)}>
            <Option value=''>{t('deviceLanguage')}</Option>
            <Option value='en'>{t('english')}</Option>
            <Option value='ar'>{t('arabic')}</Option>
          </Select>,
        )}
        <Button
          loading={busy}
          onClick={() =>
            save('/users', {
              displayName: profile.displayName,
              timezone: profile.timezone,
              colour,
              language,
            })
          }
        >
          {t('save')}
        </Button>
        <Button variant='soft' onClick={() => setChangePIN(value => !value)}>
          {t('changePIN')}
        </Button>
        {changePIN && (
          <Box
            component='form'
            onSubmit={event => {
              event.preventDefault()
              void save('/users/pin', {
                [profile.pinEnabled ? 'currentPin' : 'currentPassword']:
                  current,
                newPin: newPIN,
              })
            }}
            sx={{ display: 'grid', gap: 2 }}
          >
            {field(
              t(profile.pinEnabled ? 'currentPIN' : 'password'),
              <Input
                required
                type='password'
                value={current}
                onChange={event => setCurrent(event.target.value)}
                slotProps={{
                  input: {
                    autoComplete: 'current-password',
                    ...(profile.pinEnabled
                      ? {
                          inputMode: 'numeric',
                          pattern: '[0-9]{4}',
                          maxLength: 4,
                          dir: 'ltr',
                        }
                      : {}),
                  },
                }}
              />,
            )}
            {field(
              t('newPIN'),
              <Input
                {...pinProps}
                required
                value={newPIN}
                onChange={event => setNewPIN(cleanPIN(event.target.value))}
              />,
            )}
            <Button
              type='submit'
              loading={busy}
              disabled={newPIN.length !== 4 || !current}
            >
              {t('save')}
            </Button>
          </Box>
        )}
        <Switch
          checked={sharedTablet}
          onChange={event => setSharedTablet(event.target.checked)}
          endDecorator={t('sharedTablet')}
        />
        <Typography level='body-sm'>{t('sharedTabletHint')}</Typography>
      </Sheet>
      {isAdmin && (
        <Sheet
          id='family'
          variant='outlined'
          sx={{ p: 2, borderRadius: 'lg', display: 'grid', gap: 2 }}
        >
          <Typography level='h3'>{t('family')}</Typography>
          <Typography level='h4'>{t('memberMenu')}</Typography>
          {MENU_ITEM_NAMES.map(item => (
            <Switch
              key={item}
              checked={menu.memberItems.includes(item)}
              disabled={!menu.isReady || menu.isSaving}
              endDecorator={t(
                `common:navigation.${item === 'reportIssue' ? 'reportBug' : item}`,
              )}
              onChange={async event => {
                const selected = event.target.checked
                  ? [...menu.memberItems, item]
                  : menu.memberItems.filter(name => name !== item)
                setMessage('')
                try {
                  await menu.save(selected)
                  setMessage('saved')
                } catch {
                  setMessage('failed')
                }
              }}
            />
          ))}
          <Box
            component='form'
            onSubmit={event => {
              event.preventDefault()
              void save(
                '/users/profiles',
                {
                  displayName: name.trim(),
                  colour: familyColour,
                  pin: familyPIN,
                  role: admin ? 'admin' : 'member',
                },
                'post',
              )
            }}
            sx={{ display: 'grid', gap: 2 }}
          >
            {field(
              t('name'),
              <Input
                required
                value={name}
                onChange={event => setName(event.target.value)}
                slotProps={{ input: { maxLength: 100 } }}
              />,
            )}
            <ProfileColourPicker
              value={familyColour}
              onChange={setFamilyColour}
            />
            {field(
              t('newPIN'),
              <Input
                {...pinProps}
                required
                value={familyPIN}
                onChange={event => setFamilyPIN(cleanPIN(event.target.value))}
              />,
            )}
            <Switch
              checked={admin}
              onChange={event => setAdmin(event.target.checked)}
              endDecorator={t('admin')}
            />
            <Button
              type='submit'
              loading={busy}
              disabled={!name.trim() || familyPIN.length !== 4}
            >
              {t('addPerson')}
            </Button>
          </Box>
          <Box
            component='form'
            onSubmit={event => {
              event.preventDefault()
              void save(`/users/profiles/${resetID}/pin`, { newPin: resetPIN })
            }}
            sx={{ display: 'grid', gap: 2 }}
          >
            {field(
              t('person'),
              <Select
                value={resetID}
                onChange={(_, value) => setResetID(value)}
              >
                {profiles.map(person => (
                  <Option key={person.id} value={person.id}>
                    {person.displayName}
                  </Option>
                ))}
              </Select>,
            )}
            {field(
              t('newPIN'),
              <Input
                {...pinProps}
                required
                value={resetPIN}
                onChange={event => setResetPIN(cleanPIN(event.target.value))}
              />,
            )}
            <Button
              type='submit'
              loading={busy}
              disabled={!resetID || resetPIN.length !== 4}
            >
              {t('resetPIN')}
            </Button>
          </Box>
        </Sheet>
      )}
      <Typography role='status'>{message ? t(message) : ''}</Typography>
    </Box>
  )
}
