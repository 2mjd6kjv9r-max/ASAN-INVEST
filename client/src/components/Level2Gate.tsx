import { PlanNotice } from '@/components/PlanNotice'
import { Button, ButtonLink } from '@/components/ui'
import { api, isApiError } from '@/lib/api'
import type { HonestyOutcome, User } from '@/lib/types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function Level2Gate({ user, compact = false }: { user?: User | null; compact?: boolean }) {
  const { t } = useTranslation()
  const [outcome, setOutcome] = useState<HonestyOutcome | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  async function wait(channel: 'asan' | 'enonresident') {
    setPending(channel)
    try {
      const data = (
        channel === 'asan' ? await api.asanLogin() : await api.startENonresident()
      ) as HonestyOutcome
      setOutcome({
        available: Boolean(data.available),
        flag: data.flag || 'PLANNED',
        message: data.message,
        next: data.next,
        virtualFin: data.virtualFin,
      })
    } catch (err) {
      setOutcome({
        available: false,
        flag: 'PLANNED',
        message: isApiError(err) ? err.message : t('common.error'),
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-3">
      <PlanNotice available={false} message={t('auth.level2')}>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/cabinet/profile" variant="secondary">
            {t('phase3.representative')}
          </ButtonLink>
          {user ? (
            <>
              <Button type="button" variant="secondary" loading={pending === 'asan'} onClick={() => void wait('asan')}>
                {t('phase3.waitAsan')}
              </Button>
              <Button type="button" variant="secondary" loading={pending === 'enonresident'} onClick={() => void wait('enonresident')}>
                {t('phase3.waitEsign')}
              </Button>
            </>
          ) : (
            <ButtonLink to="/login" variant="secondary">
              {t('phase3.waitEsign')}
            </ButtonLink>
          )}
          {compact ? null : <ButtonLink to="/route">{t('nav.route')}</ButtonLink>}
        </div>
      </PlanNotice>
      {user?.virtualFin ? (
        <p className="text-sm">
          <span className="font-medium">{t('phase3.virtualFin')}: </span>
          {user.virtualFin}
          <span className="cap mt-1 block">{t('phase3.virtualFinNote')}</span>
        </p>
      ) : null}
      {outcome ? <PlanNotice available={outcome.available} flag={outcome.flag} message={outcome.message} /> : null}
    </div>
  )
}
