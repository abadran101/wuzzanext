import 'moment/locale/ar'
import 'moment/locale/cs'
import 'moment/locale/he'
import 'moment/locale/ru'
import 'moment/locale/ja'
import 'moment/locale/es'
import 'moment/locale/pl'
import 'moment/locale/it'

import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'
import moment from 'moment'
import { initReactI18next } from 'react-i18next'

// Arabic dates keep Western digits, so dates formatted for the server or for
// inputs (YYYY-MM-DD) stay the same in every language. updateLocale also
// makes Arabic the global locale, so switch back; LocalizationContext picks
// the person's language.
moment.updateLocale('ar', {
  preparse: text => text,
  postformat: text => text,
})
moment.locale('en')

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    ns: [
      'profiles',
      'auth',
      'common',
      'settings',
      'chores',
      'labels',
      'history',
      'filters',
      'things',
      'projects',
      'timer',
      'points',
      'rewards',
    ],
    defaultNS: 'common',

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    react: {
      useSuspense: true,
    },
  })

export default i18n
