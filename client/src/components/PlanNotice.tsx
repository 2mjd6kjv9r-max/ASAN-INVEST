import { FlagBadge } from '@/components/FlagBadge'
import type { Flag } from '@/lib/types'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function PlanNotice({
  available = false,
  flag = 'PLANNED',
  message,
  children,
}: {
  available?: boolean
  flag?: Flag
  message: string
  children?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="warn" role="status">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <FlagBadge flag={flag} />
          {available ? null : <span className="cap">{t('phase3.availableFalse')}</span>}
        </div>
        <p className="mt-2">{message}</p>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </div>
  )
}
