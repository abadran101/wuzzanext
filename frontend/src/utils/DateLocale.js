import i18n from 'i18next'

const EN_WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const EN_WEEKDAY_PAIRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// The app language for Intl date formatting. English keeps the browser's own
// format (undefined), as before; Arabic keeps Western digits, like the moment
// dates (see i18n/config.js).
export const dateLocale = (
  language = i18n.resolvedLanguage || i18n.language,
) => {
  if (!language || language.startsWith('en')) return undefined
  return language.startsWith('ar') ? 'ar-u-nu-latn' : language
}

const isEnglish = locale => !locale || locale.startsWith('en')

// One letter per weekday in calendar headers; English as before (S M T ...,
// or the given English labels).
export const weekdayLetter = (date, locale, english = EN_WEEKDAY_LETTERS) =>
  isEnglish(locale)
    ? english[date.getDay()]
    : new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date)

// Short month name in the year view (Jan, Feb ... in English).
export const shortMonth = (date, locale) =>
  new Intl.DateTimeFormat(isEnglish(locale) ? 'en' : locale, {
    month: 'short',
  }).format(date)
