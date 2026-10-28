import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { TranslateChores } from '../utils/Fetcher'
import {
  choreNeedsTranslation,
  chunk,
  translatedChoreText,
  translationTarget,
} from '../utils/TranslationText'
import { useResource } from './ResourceQueries'

// Chore cards ask one by one; the asks are collected for a moment and sent to
// the server together, so a list of chores costs one request.
const BATCH_DELAY_MS = 25
const waiting = new Map() // target -> Map(choreId -> [{ resolve, reject }])
let flushTimer = null

const sendBatch = async (target, ids, callers) => {
  try {
    const response = await TranslateChores(ids, target)
    if (!response.ok) throw new Error(`translation ${response.status}`)
    const body = await response.json()
    const byId = new Map((body?.res || []).map(entry => [entry.id, entry]))
    for (const id of ids) {
      for (const caller of callers.get(id)) caller.resolve(byId.get(id) ?? null)
    }
  } catch (error) {
    for (const id of ids) {
      for (const caller of callers.get(id)) caller.reject(error)
    }
  }
}

const flush = () => {
  flushTimer = null
  const batches = [...waiting.entries()]
  waiting.clear()
  for (const [target, callers] of batches) {
    for (const ids of chunk([...callers.keys()])) {
      sendBatch(target, ids, callers)
    }
  }
}

const loadChoreTranslation = (choreId, target) =>
  new Promise((resolve, reject) => {
    if (!waiting.has(target)) waiting.set(target, new Map())
    const callers = waiting.get(target)
    if (!callers.has(choreId)) callers.set(choreId, [])
    callers.get(choreId).push({ resolve, reject })
    if (!flushTimer) flushTimer = setTimeout(flush, BATCH_DELAY_MS)
  })

// useChoreTranslation gives a chore's name and details in the app language
// when the server has translation turned on. Until an answer arrives, or when
// anything fails, the original text is shown. Only display uses this: edits
// and saved chores always keep the original text.
export const useChoreTranslation = chore => {
  const { i18n } = useTranslation()
  const { data: resource } = useResource()
  const target = translationTarget(i18n.resolvedLanguage || i18n.language)
  const choreId = chore?.id
  const enabled = Boolean(
    resource?.translation_enabled &&
    target &&
    Number.isInteger(choreId) &&
    choreId > 0 &&
    choreNeedsTranslation(chore, target),
  )

  const { data } = useQuery({
    queryKey: [
      'choreTranslation',
      target,
      choreId,
      chore?.name,
      chore?.description || '',
    ],
    queryFn: () => loadChoreTranslation(choreId, target),
    enabled,
    retry: false,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  return translatedChoreText(chore, enabled ? data : null)
}
