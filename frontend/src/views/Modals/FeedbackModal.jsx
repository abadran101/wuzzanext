import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormLabel,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { useResponsiveModal } from '../../hooks/useResponsiveModal.js'
import { useUserProfile } from '../../queries/UserQueries'
import {
  FEEDBACK_CATEGORIES,
  isFeedbackSubmissionConfigured,
  markSentiment,
  SENTIMENTS,
  SUBMIT_RESULT,
  submitFeedback,
} from '../../service/FeedbackService'

const STEP = {
  SENTIMENT: 'sentiment',
  DETAILS: 'details',
  THANKS: 'thanks',
}

const SENTIMENT_OPTIONS = [
  { value: SENTIMENTS.LOVE, emoji: '😍' },
  { value: SENTIMENTS.OKAY, emoji: '🙂' },
  { value: SENTIMENTS.ISSUES, emoji: '😕' },
]

/** Collects feedback for an optional configured webhook. */
const FeedbackModal = ({ onClose, onDismiss, open, source = 'settings' }) => {
  const { t } = useTranslation()
  const { ResponsiveModal } = useResponsiveModal()
  const { data: userProfile } = useUserProfile()
  const location = useLocation()

  const [step, setStep] = useState(STEP.SENTIMENT)
  const [sentiment, setSentiment] = useState(null)
  const [category, setCategory] = useState(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submissionFailed, setSubmissionFailed] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(STEP.SENTIMENT)
      setSentiment(null)
      setCategory(null)
      setMessage('')
      setSubmitting(false)
      setSubmissionFailed(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClose = () => {
    // Backing out before answering counts as a dismissal for the cooldown.
    // Abandoning the details form does not — they already told us something.
    if (step === STEP.SENTIMENT) {
      onDismiss?.()
    }
    onClose()
  }

  const handleSentiment = async value => {
    setSentiment(value)
    await markSentiment(value)

    setStep(STEP.DETAILS)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmissionFailed(false)
    const { result } = await submitFeedback({
      sentiment,
      category,
      message,
      feature: location.pathname,
      userProfile,
    })
    setSubmitting(false)

    if (result !== SUBMIT_RESULT.SENT) {
      setSubmissionFailed(true)
      setStep(STEP.DETAILS)
      return
    }
    setStep(STEP.THANKS)
  }

  const canSubmit = Boolean(category) || message.trim().length > 0

  return (
    <ResponsiveModal open={open} onClose={handleClose} size='md'>
      <Stack spacing={2}>
        {step === STEP.SENTIMENT && (
          <>
            <Typography level='h4' sx={{ fontWeight: 600 }}>
              {t('feedback.sentiment.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('feedback.sentiment.subtitle')}
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {SENTIMENT_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant='outlined'
                  color='neutral'
                  size='lg'
                  onClick={() => handleSentiment(option.value)}
                  sx={{
                    justifyContent: 'flex-start',
                    fontWeight: 500,
                    py: 1.5,
                  }}
                  startDecorator={
                    <Box component='span' sx={{ fontSize: '1.4rem' }}>
                      {option.emoji}
                    </Box>
                  }
                >
                  {t(`feedback.sentiment.options.${option.value}`)}
                </Button>
              ))}
            </Stack>
            <Button variant='plain' color='neutral' onClick={handleClose}>
              {t('feedback.later')}
            </Button>
          </>
        )}

        {step === STEP.DETAILS && (
          <>
            <Typography level='h4' sx={{ fontWeight: 600 }}>
              {t('feedback.details.title')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {FEEDBACK_CATEGORIES.map(item => (
                <Chip
                  key={item}
                  variant={category === item ? 'solid' : 'outlined'}
                  color={category === item ? 'primary' : 'neutral'}
                  size='lg'
                  onClick={() => setCategory(category === item ? null : item)}
                >
                  {t(`feedback.categories.${item}`)}
                </Chip>
              ))}
            </Box>

            <FormControl>
              <FormLabel sx={{ fontWeight: 600 }}>
                {t('feedback.details.messageLabel')}
              </FormLabel>
              <Textarea
                minRows={3}
                maxRows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('feedback.details.messagePlaceholder')}
              />
            </FormControl>

            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {t('feedback.details.contextNote')}
            </Typography>

            {submissionFailed && (
              <Typography color='danger' level='body-sm'>
                {t('about.feedbackFailed')}
              </Typography>
            )}
            <Divider />
            <Stack direction='row' spacing={1} justifyContent='flex-end'>
              <Button variant='plain' color='neutral' onClick={handleClose}>
                {t('cancel')}
              </Button>
              <Button
                variant='solid'
                color='primary'
                disabled={
                  !canSubmit || submitting || !isFeedbackSubmissionConfigured()
                }
                startDecorator={
                  submitting ? <CircularProgress size='sm' /> : null
                }
                onClick={handleSubmit}
              >
                {t('feedback.details.submit')}
              </Button>
            </Stack>
          </>
        )}

        {step === STEP.THANKS && (
          <>
            <Typography level='h4' sx={{ fontWeight: 600 }}>
              {t('feedback.thanks.title')}
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {t('feedback.thanks.subtitle')}
            </Typography>
            <Button variant='solid' color='primary' onClick={onClose}>
              {t('close')}
            </Button>
          </>
        )}
      </Stack>
    </ResponsiveModal>
  )
}

export default FeedbackModal
