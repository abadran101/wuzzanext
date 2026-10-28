import { Language } from '@mui/icons-material'
import {
  ListItemContent,
  ListItemDecorator,
  MenuItem,
  Typography,
} from '@mui/joy'
import { useTranslation } from 'react-i18next'

import { useLocalization } from '../contexts/LocalizationContext'
import { useUserProfile } from '../queries/UserQueries'
import { apiClient } from '../utils/ApiClient'

// One tap between English and Arabic in the user menu, saved to the person
// like the language choice in settings.
export default function LanguageMenuItem() {
  const { t } = useTranslation('profiles')
  const { data: userProfile, refetch } = useUserProfile()
  const { isRTL, setProfileLanguage } = useLocalization()
  const nextLanguage = isRTL ? 'en' : 'ar'

  const switchLanguage = async () => {
    setProfileLanguage(nextLanguage)
    try {
      const response = await apiClient.put(
        '/users',
        JSON.stringify({
          displayName: userProfile.displayName,
          timezone: userProfile.timezone,
          colour: userProfile.colour,
          language: nextLanguage,
        }),
      )
      if (!response.ok) throw new Error('Unable to save language')
      await refetch()
    } catch {
      setProfileLanguage(userProfile.language || '')
    }
  }

  return (
    <MenuItem
      onClick={switchLanguage}
      sx={{
        borderRadius: 'var(--joy-radius-sm)',
        '&:hover': {
          backgroundColor: 'var(--joy-palette-neutral-softHoverBg)',
        },
      }}
    >
      <ListItemDecorator sx={{ color: 'var(--joy-palette-neutral-500)' }}>
        <Language />
      </ListItemDecorator>
      <ListItemContent>
        <Typography
          level='body-sm'
          lang={nextLanguage}
          sx={{ fontWeight: 500 }}
        >
          {nextLanguage === 'ar' ? 'العربية' : 'English'}
        </Typography>
        <Typography
          level='body-xs'
          sx={{ color: 'var(--joy-palette-text-tertiary)' }}
        >
          {t('switchLanguage')}
        </Typography>
      </ListItemContent>
    </MenuItem>
  )
}
