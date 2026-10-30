import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Card, Container, Link, Stack, Typography } from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { apiClient } from '../utils/ApiClient'

const About = () => {
  const { t } = useTranslation('common')
  const native = Capacitor.isNativePlatform()
  const [sourceUrl, setSourceUrl] = useState(
    native ? null : '/wuzzanext-source.tar.gz',
  )

  useEffect(() => {
    if (!native) return
    let active = true
    apiClient
      .init()
      .then(() => {
        const server = apiClient.getApiURL().replace(/\/api\/v1\/?$/, '')
        if (active) setSourceUrl(`${server}/wuzzanext-source.tar.gz`)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [native])

  const openLink = url => async event => {
    if (native) {
      event.preventDefault()
      await Browser.open({ url })
    }
  }

  return (
    <Container maxWidth='sm' sx={{ py: 4 }}>
      <Card variant='outlined'>
        <Stack spacing={2}>
          <Typography level='h3'>{t('about.title')}</Typography>
          <Typography>
            {t('about.basedOn')}{' '}
            <Link
              href='https://github.com/donetick/donetick'
              onClick={openLink('https://github.com/donetick/donetick')}
              target='_blank'
              rel='noopener noreferrer'
            >
              Donetick
            </Link>
          </Typography>
          <Link
            href='https://www.gnu.org/licenses/agpl-3.0.html'
            onClick={openLink('https://www.gnu.org/licenses/agpl-3.0.html')}
            target='_blank'
            rel='noopener noreferrer'
          >
            {t('about.license')}
          </Link>
          <Link
            href={sourceUrl || undefined}
            disabled={!sourceUrl}
            onClick={sourceUrl ? openLink(sourceUrl) : undefined}
          >
            {t('about.downloadSource')}
          </Link>
          <Link href='/' color='neutral' level='body-sm'>
            {t('about.openApp')}
          </Link>
        </Stack>
      </Card>
    </Container>
  )
}

export default About
