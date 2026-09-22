import { cn } from '@/lib/cn'
import type { Flag } from '@/lib/types'
import { useTranslation } from 'react-i18next'

const styles: Record<Flag, string> = {
  AUTO: 'border-[var(--color-flag-auto)] text-[var(--color-flag-auto)] bg-emerald-50',
  ONLINE: 'border-[var(--color-flag-online)] text-[var(--color-flag-online)] bg-blue-50',
  PHYSICAL: 'border-[var(--color-flag-physical)] text-[var(--color-flag-physical)] bg-amber-50',
  PLANNED: 'border-[var(--color-flag-planned)] text-[var(--color-flag-planned)] bg-slate-100',
}

const icons: Record<Flag, string> = {
  AUTO: '●',
  ONLINE: '◐',
  PHYSICAL: '▲',
  PLANNED: '○',
}

export function FlagBadge({ flag, className }: { flag: Flag; className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold tracking-wide',
        styles[flag],
        className,
      )}
      title={t(`flags.${flag}_hint`)}
    >
      <span aria-hidden="true">{icons[flag]}</span>
      <span>{t(`flags.${flag}`)}</span>
    </span>
  )
}
