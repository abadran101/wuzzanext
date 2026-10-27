import { Box, IconButton } from '@mui/joy'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import { PROFILE_COLOURS } from '../utils/ProfileSession'

export default function ProfileColourPicker({ onChange, value }) {
  const { t } = useTranslation('profiles')
  return (
    <Box
      role='group'
      aria-label={t('colour')}
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
    >
      {PROFILE_COLOURS.map((colour, index) => (
        <IconButton
          key={colour}
          aria-label={t('colourNumber', { number: index + 1 })}
          aria-pressed={value === colour}
          onClick={() => onChange(colour)}
          sx={{
            bgcolor: colour,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border:
              value === colour
                ? '3px solid currentColor'
                : '3px solid transparent',
            '&:hover': { bgcolor: colour, opacity: 0.8 },
          }}
        >
          {value === colour ? '✓' : ''}
        </IconButton>
      ))}
    </Box>
  )
}

ProfileColourPicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
}
