import { Capacitor } from '@capacitor/core'
import {
  ChevronRight,
  Feedback,
  Group,
  InfoOutlined,
  ReportProblem,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Chip,
  Container,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Stack,
  Typography,
} from '@mui/joy'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { SETTINGS_SECTIONS } from '../../constants/settingsSections'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { isFeedbackSubmissionConfigured } from '../../service/FeedbackService'
import { isParentUser } from '../../utils/UserHelpers'
import ErrorReportModal from '../Modals/ErrorReportModal'
import FeedbackModal from '../Modals/FeedbackModal'

const SettingsOverview = () => {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()
  const { data: userProfile } = useUserProfile()
  const { data: members } = useCircleMembers()
  const isAdmin =
    !localStorage.getItem('impersonatedUserId') &&
    members?.res?.some(
      member => member.userId === userProfile?.id && member.role === 'admin',
    )
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)
  const settingsCards = [
    ...(isAdmin
      ? [
          {
            id: 'family',
            title: t('profiles:family'),
            icon: <Group />,
            onSelect: () => navigate('/settings/profile#family'),
          },
        ]
      : []),
    ...SETTINGS_SECTIONS.filter(
      section => !section.nativeOnly || Capacitor.isNativePlatform(),
    ).map(({ icon: Icon, id, isBeta }) => ({
      id,
      title: t(`overview.sections.${id}.title`),
      description:
        id === 'account' ? null : t(`overview.sections.${id}.description`),
      icon: <Icon />,
      isBeta,
    })),
    {
      id: 'about',
      title: t('common:about.title'),
      description: t('common:about.description'),
      icon: <InfoOutlined />,
      onSelect: () => navigate('/about'),
    },
    ...(isFeedbackSubmissionConfigured()
      ? [
          {
            id: 'feedback',
            title: t('overview.sections.feedback.title'),
            description: t('overview.sections.feedback.description'),
            icon: <Feedback />,
            onSelect: () => setFeedbackOpen(true),
          },
        ]
      : []),
    {
      id: 'bugreport',
      title: t('overview.sections.bugReport.title'),
      description: t('overview.sections.bugReport.description'),
      icon: <ReportProblem />,
      onSelect: () => setBugReportOpen(true),
    },
  ]

  const handleCardClick = setting => {
    if (setting.onSelect) {
      setting.onSelect()
      return
    }
    navigate(`/settings/${setting.id}`)
  }

  const parentOnlyIds = SETTINGS_SECTIONS.filter(
    section => section.parentOnly,
  ).map(section => section.id)

  // Filter settings based on user type
  const getAvailableSettings = () => {
    if (isParentUser(userProfile)) {
      // Parent users can access all settings
      return settingsCards
    } else {
      // Child users can only access basic settings
      return settingsCards.filter(
        setting => !parentOnlyIds.includes(setting.id),
      )
    }
  }

  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {/* <EmojiEvents sx={{ fontSize: '2rem', color: '#FFD700' }} /> */}
        <Stack sx={{ flex: 1 }}>
          <Typography
            level='h3'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            {t('overview.title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('overview.subtitle')}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ mx: 'auto' }}>
        <List
          sx={{
            '--List-gap': '0px',
            '--ListItem-paddingY': '16px',
            '--ListItem-paddingX': '20px',
          }}
        >
          {getAvailableSettings().map((setting, index) => (
            <ListItem key={setting.id} sx={{ p: 0 }}>
              <ListItemButton
                onClick={() => handleCardClick(setting)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'background.level1',
                  },
                  py: 2.5,
                  px: 3,
                  borderRadius: 'lg',
                  mb: 1,
                }}
              >
                <ListItemDecorator>
                  <Avatar
                    variant='soft'
                    color='neutral'
                    sx={{ '--Avatar-size': '48px' }}
                  >
                    {setting.icon}
                  </Avatar>
                </ListItemDecorator>
                <ListItemContent sx={{ ml: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <Typography level='title-md' sx={{ fontWeight: 'lg' }}>
                      {setting.title}
                    </Typography>
                    {setting.isBeta && (
                      <Chip
                        variant='outlined'
                        size='sm'
                        sx={{
                          height: '20px',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          color: 'warning.main',
                          borderColor: 'warning.main',
                        }}
                      >
                        {t('common.earlyAccess')}
                      </Chip>
                    )}
                  </Box>
                  {setting.description && (
                    <Typography
                      level='body-sm'
                      color='neutral'
                      sx={{ lineHeight: 1.4 }}
                    >
                      {setting.description}
                    </Typography>
                  )}
                </ListItemContent>
                <ChevronRight
                  sx={{ color: 'text.tertiary', fontSize: '20px' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />

      {/* No error to pass: the report is about something the user saw, not
          something the app threw, so the modal collects diagnostics only. */}
      <ErrorReportModal
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />
    </Container>
  )
}

export default SettingsOverview
