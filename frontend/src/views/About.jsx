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
  const [commit, setCommit] = useState(null)
  const [apkReady, setApkReady] = useState(false)

  // The server build stamps its commit (task 019); the owner may also have
  // placed the signed Android app for download. Web only: the app is installed.
  useEffect(() => {
    if (native) return
    let active = true
    fetch('/health')
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (active && body?.commit && body.commit !== 'dev') {
          setCommit(body.commit.slice(0, 12))
        }
      })
      .catch(() => {})
    fetch('/download/wuzzanext.apk', { method: 'HEAD' })
      .then(res => {
        if (active) setApkReady(res.ok)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [native])

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
          {apkReady && (
            <Link href='/download/wuzzanext.apk' download>
              {t('about.downloadApp')}
            </Link>
          )}
          {commit && (
            <Typography level='body-sm' textColor='neutral.500'>
              {t('about.runningCommit', { commit })}
            </Typography>
          )}
          <Link href='/' color='neutral' level='body-sm'>
            {t('about.openApp')}
          </Link>
        </Stack>
      </Card>
    </Container>
  )
}

export default About
