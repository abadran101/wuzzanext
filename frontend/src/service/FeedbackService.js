import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

import { getAppVersion, getDeviceContext } from '../utils/DeviceInfo'
import { isOfficialDonetickInstance } from '../utils/FeatureToggle'

const STATE_KEY = 'feedbackState'

// Eligibility thresholds for the automatic sentiment prompt.
const MIN_COMPLETIONS = 7
const MIN_DAYS_SINCE_SIGNUP = 7
// Apple allows three review prompts per user per year, so anything above ~120
// days leaves part of that allowance unused.
const COOLDOWN_DAYS = 90
// A soft opt-out lapses: someone who dismissed the prompt during a busy week,
// or who reviewed an old version, is a fair candidate again a year later. An
// explicit "stop asking me" never lapses.
const OPT_OUT_LAPSE_DAYS = 365
// A recent crash/API failure poisons the sentiment reading, so hold off.
const ERROR_QUIET_PERIOD_MS = 10 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000

const defaultState = {
  completions: 0,
  // null until the first prompt is shown/snoozed.
  lastPromptedAt: null,
  lastPromptedVersion: null,
  // Cumulative across the device's lifetime, unlike lastPromptedAt/Version
  // which only remember the most recent showing.
  shownCount: 0,
  dismissCount: 0,
  reviewRequestedAt: null,
  lastSentiment: null,
  optedOut: false,
  // When the opt-out was set, and what caused it. Anything other than
  // 'explicit' lapses after OPT_OUT_LAPSE_DAYS.
  optedOutAt: null,
  optedOutReason: null,
  // Developer Settings escape hatch; never set in normal use.
  devForced: false,
}

let cachedState = null

const persist = async () => {
  try {
    await Preferences.set({
      key: STATE_KEY,
      value: JSON.stringify(cachedState),
    })
  } catch (error) {
    console.warn('FeedbackService: unable to persist state', error)
  }
}

/**
 * Expires a soft opt-out that has outlived OPT_OUT_LAPSE_DAYS. Returns the same
 * object when nothing changed, so the caller can tell whether to persist.
 */
const clearLapsedOptOut = state => {
  if (!state.optedOut || state.optedOutReason === 'explicit') return state
  // State written before opt-outs carried a timestamp. Start the clock now
  // rather than expiring it on sight, so nobody gets re-prompted immediately
  // because of the upgrade.
  if (!state.optedOutAt) return { ...state, optedOutAt: Date.now() }
  if (Date.now() - state.optedOutAt < OPT_OUT_LAPSE_DAYS * DAY_MS) return state
  return {
    ...state,
    optedOut: false,
    optedOutAt: null,
    optedOutReason: null,
    // Otherwise the next single dismissal would immediately re-trip the
    // three-strikes rule.
    dismissCount: 0,
  }
}

const readState = async () => {
  if (cachedState) return cachedState
  try {
    const { value } = await Preferences.get({ key: STATE_KEY })
    cachedState = { ...defaultState, ...(value ? JSON.parse(value) : {}) }
  } catch (error) {
    console.warn('FeedbackService: unable to read state', error)
    cachedState = { ...defaultState }
  }
  const normalized = clearLapsedOptOut(cachedState)
  if (normalized !== cachedState) {
    cachedState = normalized
    await persist()
  }
  return cachedState
}

const writeState = async patch => {
  const current = await readState()
  cachedState = { ...current, ...patch }
  await persist()
  return cachedState
}

export const getFeedbackState = () => readState()

/**
 * Counts a completed task towards prompt eligibility. Called from the single
 * network choke point for completions so offline completions are counted when
 * they sync rather than twice.
 */
export const recordTaskCompleted = async () => {
  const state = await readState()
  // Stop writing once we are well past the threshold; nothing reads the exact
  // number beyond reporting it as context.
  if (state.completions > MIN_COMPLETIONS * 100) return
  await writeState({ completions: state.completions + 1 })
}

// ---------------------------------------------------------------------------
// Recent error breadcrumbs (in memory only, never persisted)
// ---------------------------------------------------------------------------

const recentErrors = []
const MAX_ERRORS = 5

export const recordFeedbackError = message => {
  if (!message) return
  recentErrors.push({ at: Date.now(), message: String(message).slice(0, 300) })
  if (recentErrors.length > MAX_ERRORS) recentErrors.shift()
}

let errorListenersInstalled = false

export const installFeedbackErrorListeners = () => {
  if (errorListenersInstalled || typeof window === 'undefined') return
  errorListenersInstalled = true
  window.addEventListener('error', event => {
    recordFeedbackError(event?.message)
  })
  window.addEventListener('unhandledrejection', event => {
    recordFeedbackError(event?.reason?.message || event?.reason)
  })
}

const hasRecentError = () =>
  recentErrors.some(error => Date.now() - error.at < ERROR_QUIET_PERIOD_MS)

// ---------------------------------------------------------------------------
// Context collection
// ---------------------------------------------------------------------------

/**
 * Everything we attach to a submission without asking the user for it.
 */
export const collectFeedbackContext = async ({ feature, userProfile } = {}) => {
  const [version, device, state, isCloud] = await Promise.all([
    getAppVersion(),
    getDeviceContext(),
    readState(),
    isOfficialDonetickInstance().catch(() => false),
  ])

  const signupDate = userProfile?.createdAt || userProfile?.created_at
  const daysSinceSignup = signupDate
    ? Math.floor((Date.now() - new Date(signupDate).getTime()) / DAY_MS)
    : null

  return {
    appVersion: version,
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    deviceModel: device.deviceModel,
    osVersion: device.osVersion,
    locale:
      localStorage.getItem('i18nextLng') || navigator.language || 'unknown',
    hosting: isCloud ? 'cloud' : 'self-hosted',
    feature: feature || 'unknown',
    tasksCompleted: state.completions,
    daysSinceSignup,
    userId: userProfile?.id ?? null,
    subscription: userProfile?.subscription ?? null,
    recentErrors: recentErrors.map(error => error.message),
    submittedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

const OPT_OUT_REASONS = {
  dismissed: 'dismissed the prompt 3 times',
  reviewed: 'a store review was already requested',
  explicit: 'asked not to be prompted again',
}

/** Spells out an opt-out for Developer Settings, including when it lapses. */
const describeOptOut = state => {
  const reason = OPT_OUT_REASONS[state.optedOutReason] || 'reason unknown'
  if (state.optedOutReason === 'explicit') return `${reason} (permanent)`
  if (!state.optedOutAt) return reason
  const daysLeft = Math.ceil(
    OPT_OUT_LAPSE_DAYS - (Date.now() - state.optedOutAt) / DAY_MS,
  )
  return `${reason} (lapses in ${daysLeft} days)`
}

/**
 * Stable identifiers for each gate, safe to send to analytics. The human
 * strings in `blockers` are for Developer Settings and change freely; these
 * don't, so historical funnels stay comparable.
 */
export const PROMPT_BLOCKERS = {
  OPTED_OUT: 'opted_out',
  TOO_FEW_COMPLETIONS: 'too_few_completions',
  RECENT_ERROR: 'recent_error',
  NEW_ACCOUNT: 'new_account',
  COOLDOWN: 'cooldown',
  SAME_VERSION: 'same_version',
}

/**
 * Runs every gate and reports which ones failed, so Developer Settings can
 * explain why the prompt is or isn't showing rather than just saying "no".
 *
 * Gates are evaluated in rough order of how permanent they are, so
 * `blockerCodes[0]` is the most meaningful single reason to report.
 */
export const evaluatePromptEligibility = async ({ userProfile } = {}) => {
  const state = await readState()
  const version = await getAppVersion()

  if (!isFeedbackSubmissionConfigured()) {
    return {
      eligible: false,
      forced: false,
      blockers: ['No feedback webhook configured'],
      blockerCodes: ['unconfigured'],
      state,
      version,
    }
  }

  if (state.devForced) {
    return {
      eligible: true,
      forced: true,
      blockers: [],
      blockerCodes: [],
      state,
      version,
    }
  }

  const failed = []
  const fail = (code, detail) => failed.push({ code, detail })

  if (state.optedOut) {
    fail(PROMPT_BLOCKERS.OPTED_OUT, `User opted out: ${describeOptOut(state)}`)
  }
  if (state.completions < MIN_COMPLETIONS) {
    fail(
      PROMPT_BLOCKERS.TOO_FEW_COMPLETIONS,
      `Only ${state.completions} completions, needs ${MIN_COMPLETIONS}`,
    )
  }
  if (hasRecentError()) {
    fail(
      PROMPT_BLOCKERS.RECENT_ERROR,
      'An error occurred in the last 10 minutes',
    )
  }

  // The profile shape varies by source, so accept either spelling rather than
  // letting the gate silently never apply.
  const signupDate = userProfile?.createdAt || userProfile?.created_at
  if (signupDate) {
    const days = (Date.now() - new Date(signupDate).getTime()) / DAY_MS
    if (days < MIN_DAYS_SINCE_SIGNUP) {
      fail(
        PROMPT_BLOCKERS.NEW_ACCOUNT,
        `Account is ${Math.floor(days)} days old, needs ${MIN_DAYS_SINCE_SIGNUP}`,
      )
    }
  }

  if (state.lastPromptedAt) {
    const daysSincePrompt = (Date.now() - state.lastPromptedAt) / DAY_MS
    if (daysSincePrompt < COOLDOWN_DAYS) {
      fail(
        PROMPT_BLOCKERS.COOLDOWN,
        `Cooldown: ${Math.ceil(COOLDOWN_DAYS - daysSincePrompt)} days remaining`,
      )
    }
  }

  // Never ask twice on the same build, even after the cooldown expires.
  if (state.lastPromptedVersion && state.lastPromptedVersion === version) {
    fail(
      PROMPT_BLOCKERS.SAME_VERSION,
      `Already prompted on this version (${version})`,
    )
  }

  return {
    eligible: failed.length === 0,
    forced: false,
    blockers: failed.map(item => item.detail),
    blockerCodes: failed.map(item => item.code),
    state,
    version,
  }
}

/** Developer Settings: bypass every gate on the next eligibility check. */
export const setDevForcedPrompt = forced => writeState({ devForced: !!forced })

/** Developer Settings: back to a never-prompted, zero-completions user. */
export const resetFeedbackState = async () => {
  cachedState = { ...defaultState }
  try {
    await Preferences.remove({ key: STATE_KEY })
  } catch (error) {
    console.warn('FeedbackService: unable to clear state', error)
  }
  return cachedState
}

export const markPromptShown = async () => {
  const [version, state] = await Promise.all([getAppVersion(), readState()])
  return writeState({
    lastPromptedAt: Date.now(),
    lastPromptedVersion: version,
    shownCount: state.shownCount + 1,
    // A forced prompt is spent once shown, otherwise it would fire on every
    // visit to My Chores.
    devForced: false,
  })
}

export const markPromptDismissed = async () => {
  const state = await readState()
  const dismissCount = state.dismissCount + 1
  // Three dismissals in a row is an answer, but not a permanent one.
  if (dismissCount < 3) return writeState({ dismissCount })
  return writeState({
    dismissCount,
    optedOut: true,
    optedOutAt: Date.now(),
    optedOutReason: 'dismissed',
  })
}

export const markSentiment = async sentiment =>
  writeState({ lastSentiment: sentiment, dismissCount: 0 })

/** The user asking outright, which is the one opt-out that never lapses. */
export const optOutOfFeedbackPrompts = () =>
  writeState({
    optedOut: true,
    optedOutAt: Date.now(),
    optedOutReason: 'explicit',
  })

// ---------------------------------------------------------------------------
// Optional feedback submission
// ---------------------------------------------------------------------------

const WEBHOOK_URL = import.meta.env.VITE_FEEDBACK_WEBHOOK_URL

/**
 * A chat-provider webhook pasted straight into the env var. That can't work —
 * the app posts its own schema, which Discord rejects with "Cannot send an
 * empty message" (50006) — and it would publish the webhook to every user,
 * since VITE_ vars are baked into the bundle. Relay through workers/feedback.
 */
const isRawChatWebhook = url =>
  /^https:\/\/(discord(app)?\.com\/api\/webhooks|hooks\.slack\.com)/i.test(
    url || '',
  )

export const isFeedbackSubmissionConfigured = () =>
  Boolean(WEBHOOK_URL) && !isRawChatWebhook(WEBHOOK_URL)

/** Developer Settings: flag the misconfiguration in the UI, not just the log. */
export const isRawChatWebhookConfigured = () => isRawChatWebhook(WEBHOOK_URL)

/** Reports whether the configured server is the upstream cloud service. */
export const isCloudInstance = () =>
  isOfficialDonetickInstance().catch(() => false)

export const SUBMIT_RESULT = {
  SENT: 'sent',
  FAILED: 'failed',
  UNCONFIGURED: 'unconfigured',
  MISCONFIGURED: 'misconfigured',
  SELF_HOSTED: 'self-hosted',
}

/** Sends feedback only to an explicitly configured webhook. */
export const submitFeedback = async ({
  category,
  feature,
  message,
  sentiment,
  userProfile,
}) => {
  const context = await collectFeedbackContext({ feature, userProfile })
  const payload = {
    source: 'donetick-app',
    sentiment,
    category: category || null,
    message: message?.trim() || null,
    context,
  }

  if (!WEBHOOK_URL) {
    console.info('FeedbackService: no webhook configured, feedback:', payload)
    return { result: SUBMIT_RESULT.UNCONFIGURED }
  }

  if (isRawChatWebhook(WEBHOOK_URL)) {
    console.error(
      'FeedbackService: VITE_FEEDBACK_WEBHOOK_URL points directly at a ' +
        'Discord/Slack webhook. Discord will reject this with 50006 ' +
        '("Cannot send an empty message") because the app posts its own ' +
        'schema, and the URL would ship inside the public bundle. Deploy ' +
        'workers/feedback and point the variable at the Worker instead.',
      payload,
    )
    return { result: SUBMIT_RESULT.MISCONFIGURED }
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return {
      result: response.ok ? SUBMIT_RESULT.SENT : SUBMIT_RESULT.FAILED,
    }
  } catch (error) {
    console.warn('FeedbackService: submission failed', error)
    return { result: SUBMIT_RESULT.FAILED }
  }
}

export const FEEDBACK_CATEGORIES = [
  'bugs',
  'missingFeature',
  'tooComplicated',
  'slow',
  'notifications',
  'ai',
  'other',
]

export const SENTIMENTS = {
  LOVE: 'love',
  OKAY: 'okay',
  ISSUES: 'issues',
}
