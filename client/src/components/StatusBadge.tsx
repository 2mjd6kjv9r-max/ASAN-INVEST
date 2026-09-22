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
  const tone =
    status === 'COMPLETED' || status === 'OPEN'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'REJECTED' || status === 'PROBLEMATIC'
        ? 'bg-red-50 text-red-800 border-red-200'
        : status === 'WAITING_YOUR_RESPONSE'
          ? 'bg-amber-50 text-amber-900 border-amber-200'
          : 'bg-slate-50 text-slate-800 border-slate-200'

  const key = `status.${status}`
  const label = t(key, { defaultValue: status.replaceAll('_', ' ') })

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium', tone, className)}>
      <span aria-hidden="true">■</span>
      {label}
    </span>
  )
}
