import { persistLocale } from '@/lib/i18n'
import { cn } from '@/lib/cn'
import { useTranslation } from 'react-i18next'

const LOCALES = [
  { id: 'az', label: 'AZ' },
  { id: 'en', label: 'EN' },
  { id: 'ru', label: 'RU' },
  { id: 'tr', label: 'TR' },
  { id: 'ar', label: 'AR' },
] as const

export function LanguageSwitch() {
  const { i18n, t } = useTranslation()
  return (
    <div role="group" aria-label={t('nav.language')} className="flex items-center gap-1">
      {LOCALES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            'rounded-sm px-1.5 py-0.5 text-xs font-semibold',
            i18n.language.startsWith(item.id) ? 'bg-navy text-white' : 'text-navy hover:bg-navy-50',
          )}
          aria-pressed={i18n.language.startsWith(item.id)}
          lang={item.id}
          onClick={() => {
            void i18n.changeLanguage(item.id)
            persistLocale(item.id)
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
