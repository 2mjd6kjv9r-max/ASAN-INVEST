import { cn } from '@/lib/cn'
import type { InvestorVisibleStatus, StageDisplayStatus } from '@/lib/types'
import { useTranslation } from 'react-i18next'

export function StatusBadge({
  status,
  className,
}: {
  status: InvestorVisibleStatus | StageDisplayStatus | string
  className?: string
}) {
  const { t } = useTranslation()
  const color =
    status === 'COMPLETED' || status === 'OPEN'
      ? 'var(--accent)'
      : status === 'REJECTED' || status === 'PROBLEMATIC'
        ? 'var(--danger)'
        : status === 'WAITING_YOUR_RESPONSE'
          ? 'var(--warn)'
          : 'var(--ink-500)'

  const key = `status.${status}`
  const label = t(key, { defaultValue: status.replaceAll('_', ' ') })

  return (
    <span className={cn('st', className)}>
      <i style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  )
}
