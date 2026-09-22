import { cn } from '@/lib/cn'
import type { Flag } from '@/lib/types'
import { useTranslation } from 'react-i18next'

const dots: Record<Flag, string> = {
  AUTO: 'auto',
  ONLINE: 'online',
  PHYSICAL: 'physical',
  PLANNED: 'planned',
}

const tones: Record<Flag, string> = {
  AUTO: 'b-green',
  ONLINE: 'b-blue',
  PHYSICAL: 'b-yellow',
  PLANNED: 'b-gray',
}

export function FlagBadge({ flag, className }: { flag: Flag; className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={cn('badge', tones[flag], className)} title={t(`flags.${flag}_hint`)}>
      <span className={cn('flag-dot', dots[flag])} aria-hidden="true" />
      <span>{t(`flags.${flag}`)}</span>
    </span>
  )
}
