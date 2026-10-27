export const PROFILE_COLOURS = [
  '#ef767a',
  '#f4a261',
  '#e9c46a',
  '#8ab17d',
  '#2a9d8f',
  '#69a2d5',
  '#a78bca',
  '#df92b3',
]

export const updatePIN = (pin, key) =>
  key === 'delete'
    ? pin.slice(0, -1)
    : /^\d$/.test(key)
      ? (pin + key).slice(0, 4)
      : pin

export const retryDeadline = (value, now = Date.now()) => {
  const seconds = Number(value)
  return value && Number.isFinite(seconds)
    ? now + Math.max(0, seconds) * 1000
    : Math.max(now, Date.parse(value) || now + 60000)
}

export const lockSeconds = (deadline, now = Date.now()) =>
  Math.max(0, Math.ceil((deadline - now) / 1000))

export const isIdle = (lastInput, now = Date.now()) => now - lastInput >= 300000

export const canSwitchPerson = async ({ getPending, online, sync }) => {
  if (!(await getPending()).length) return true
  if (!online) return false
  try {
    await sync()
  } catch {
    return false
  }
  return !(await getPending()).length
}
