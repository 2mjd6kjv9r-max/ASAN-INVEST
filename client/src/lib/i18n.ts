import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { az } from '@/i18n/az'
import { en } from '@/i18n/en'

const STORAGE = 'asan-invest.locale'

function storedLocale() {
  try {
    const value = window.localStorage.getItem(STORAGE)
    if (value === 'az' || value === 'en' || value === 'ru' || value === 'tr' || value === 'ar') return value
  } catch {
    /* ignore */
  }
  return 'az'
}

void i18n.use(initReactI18next).init({
  resources: {
    az: { translation: az },
    en: { translation: en },
    ru: { translation: en },
    tr: { translation: en },
    ar: { translation: en },
  },
  lng: typeof window === 'undefined' ? 'az' : storedLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function persistLocale(locale: string) {
  try {
    window.localStorage.setItem(STORAGE, locale)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
}

export { i18n }
