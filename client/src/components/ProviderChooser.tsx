import { FlagBadge } from '@/components/FlagBadge'
import { PlanNotice } from '@/components/PlanNotice'
import { api, isApiError } from '@/lib/api'
import type { AuthProviderDto, Flag, HonestyOutcome } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const PLAN_CODES = ['ASAN_LOGIN', 'E_NONRESIDENT', 'FOREIGN_ESIGN'] as const

const FALLBACK_PROVIDERS: AuthProviderDto[] = [
  {
    code: 'EMAIL',
    available: true,
    flag: 'ONLINE',
    identificationLevelIfCompleted: 'BASIC',
    message: 'Email registration is live (identification level 1).',
  },
  {
    code: 'ASAN_LOGIN',
    available: false,
    flag: 'PLANNED',
    identificationLevelIfCompleted: 'LEGAL',
    message: 'ASAN Login / SİMA is not connected. Completing it later would raise identification to LEGAL without dropping profile data.',
  },
  {
    code: 'E_NONRESIDENT',
    available: false,
    flag: 'PLANNED',
    identificationLevelIfCompleted: 'LEGAL',
    message: 'e-qeyri-rezident / virtual FİN is not connected. Continue via a representative (TZ §7.2).',
  },
  {
    code: 'FOREIGN_ESIGN',
    available: false,
    flag: 'PLANNED',
    identificationLevelIfCompleted: 'BASIC',
    message: 'Foreign e-signatures are not on a trust list. This channel does not raise identification to LEGAL.',
  },
]

export function ProviderChooser({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useTranslation()
  const [outcome, setOutcome] = useState<HonestyOutcome | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const providers = useQuery({
    queryKey: ['auth-providers'],
    queryFn: () => api.authProviders() as Promise<AuthProviderDto[]>,
  })

  async function activate(code: string, available: boolean) {
    setPending(code)
    setOutcome(null)
    try {
      if (code === 'ASAN_LOGIN') {
        const data = (await api.asanLogin()) as HonestyOutcome
        setOutcome({
          available: Boolean(data.available),
          flag: (data.flag as Flag) || 'PLANNED',
          message: data.message,
          code: data.code,
        })
        return
      }
      if (code === 'FOREIGN_ESIGN') {
        const data = (await api.startForeignEsign()) as HonestyOutcome
        setOutcome({
          available: Boolean(data.available),
          flag: (data.flag as Flag) || 'PLANNED',
          message: data.message,
          code: data.code,
        })
        return
      }
      if (code === 'E_NONRESIDENT') {
        if (!signedIn) {
          setOutcome({
            available: false,
            flag: 'PLANNED',
            message: t('phase3.eNonresidentSignInFirst'),
            next: 'representative',
          })
          return
        }
        const data = (await api.startENonresident()) as HonestyOutcome
        setOutcome({
          available: Boolean(data.available),
          flag: (data.flag as Flag) || 'PLANNED',
          message: data.message,
          next: data.next,
          code: data.code,
        })
        return
      }
      if (!available) {
        setOutcome({ available: false, flag: 'PLANNED', message: t('phase3.notLive') })
      }
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

  const rows = providers.data ?? (providers.isError ? FALLBACK_PROVIDERS : [])
  const email = rows.find((p) => p.code === 'EMAIL')
  const shells = rows.filter((p) => PLAN_CODES.includes(p.code as (typeof PLAN_CODES)[number]))

  return (
    <div className="space-y-3">
      <p className="label" style={{ marginBottom: 0 }}>
        {t('phase3.providersTitle')}
      </p>
      {email ? (
        <div className="optcard sel" style={{ cursor: 'default' }}>
          <span className="radio" />
          <span>
            <span className="font-medium">{t('phase3.emailLive')}</span>
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <FlagBadge flag={email.flag} />
              <span className="cap">{email.message}</span>
            </span>
          </span>
        </div>
      ) : null}
      {shells.map((item) => (
        <button
          key={item.code}
          type="button"
          className="optcard"
          disabled={pending === item.code}
          onClick={() => void activate(item.code, item.available)}
        >
          <span className="radio" />
          <span>
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {t(`phase3.provider.${item.code}`)}
              <FlagBadge flag={item.flag} />
              {item.available ? null : <span className="cap">{t('phase3.availableFalse')}</span>}
            </span>
            <span className="cap mt-1 block">{item.message}</span>
          </span>
        </button>
      ))}
      {outcome ? (
        <PlanNotice available={outcome.available} flag={outcome.flag} message={outcome.message} />
      ) : null}
    </div>
  )
}
