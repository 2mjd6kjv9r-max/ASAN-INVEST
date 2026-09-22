import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/providers'
import { Alert, Button, ButtonLink, Field, Input, PageHeader, Select } from '@/components/ui'
import { api, isApiError } from '@/lib/api'
import { readGuestAnswers, readGuestToken, writeGuestAnswers } from '@/lib/guest'
import type { Classification, RouteResult } from '@/lib/types'
import { pickName } from '@/lib/types'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

type Answers = {
  country: string
  sector: string
  volumeAmount: string
  volumeCurrency: 'AZN' | 'USD' | 'EUR'
  territory: string
  nationalityType: 'resident' | 'non_resident'
  hasESignature: boolean
}

const empty: Answers = {
  country: '',
  sector: '',
  volumeAmount: '500000.00',
  volumeCurrency: 'AZN',
  territory: '',
  nationalityType: 'non_resident',
  hasESignature: false,
}

export function RoutePage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({ ...empty, ...((readGuestAnswers().route as Answers) ?? {}) })
  const [result, setResult] = useState<RouteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const classifications = useQuery({
    queryKey: ['classifications'],
    queryFn: () => api.classifications() as Promise<Classification[]>,
  })

  const byKind = useMemo(() => {
    const rows = classifications.data ?? []
    return {
      country: rows.filter((r) => r.kind === 'COUNTRY'),
      sector: rows.filter((r) => r.kind === 'SECTOR'),
      region: rows.filter((r) => r.kind === 'REGION'),
    }
  }, [classifications.data])

  const calculate = useMutation({
    mutationFn: () =>
      api.routeCalculate({
        country: answers.country,
        sector: answers.sector,
        volumeAmount: answers.volumeAmount,
        volumeCurrency: answers.volumeCurrency,
        territory: answers.territory,
        hasESignature: answers.hasESignature,
        nationalityType: answers.nationalityType,
        guestSessionToken: readGuestToken(),
      }) as Promise<RouteResult>,
    onSuccess: (data) => {
      setResult(data)
      writeGuestAnswers({ ...readGuestAnswers(), route: answers })
      const token = readGuestToken()
      if (token) void api.patchGuest(token, { route: answers })
    },
    onError: (err) => setError(isApiError(err) ? err.message : t('common.error')),
  })

  const save = useMutation({
    mutationFn: () => api.routeSave(answers) as Promise<RouteResult>,
    onSuccess: (data) => setResult(data),
    onError: (err) => setError(isApiError(err) ? err.message : t('common.error')),
  })

  const steps = [
    {
      title: t('route.qCountry'),
      body: (
        <Field label={t('route.qCountry')}>
          <Select value={answers.country} onChange={(e) => setAnswers((a) => ({ ...a, country: e.target.value }))}>
            <option value="">—</option>
            {byKind.country.map((item) => (
              <option key={item.code} value={item.code}>
                {pickName(item.names, i18n.language, item.code)}
              </option>
            ))}
          </Select>
        </Field>
      ),
      valid: Boolean(answers.country),
    },
    {
      title: t('route.qSector'),
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {byKind.sector.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`rounded-sm border p-4 text-left ${answers.sector === item.code ? 'border-navy bg-navy-50' : 'border-line bg-white'}`}
              onClick={() => setAnswers((a) => ({ ...a, sector: item.code }))}
            >
              <span className="font-semibold text-navy">{pickName(item.names, i18n.language, item.code)}</span>
            </button>
          ))}
        </div>
      ),
      valid: Boolean(answers.sector),
    },
    {
      title: t('route.qVolume'),
      body: (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('common.amount')}>
            <Input value={answers.volumeAmount} onChange={(e) => setAnswers((a) => ({ ...a, volumeAmount: e.target.value }))} inputMode="decimal" />
          </Field>
          <Field label={t('common.currency')}>
            <Select
              value={answers.volumeCurrency}
              onChange={(e) => setAnswers((a) => ({ ...a, volumeCurrency: e.target.value as Answers['volumeCurrency'] }))}
            >
              <option>AZN</option>
              <option>USD</option>
              <option>EUR</option>
            </Select>
          </Field>
        </div>
      ),
      valid: /^\d+(\.\d{1,2})?$/.test(answers.volumeAmount),
    },
    {
      title: t('route.qTerritory'),
      body: (
        <Field label={t('route.qTerritory')}>
          <Select value={answers.territory} onChange={(e) => setAnswers((a) => ({ ...a, territory: e.target.value }))}>
            <option value="">—</option>
            {byKind.region.map((item) => (
              <option key={item.code} value={item.code}>
                {pickName(item.names, i18n.language, item.code)}
              </option>
            ))}
          </Select>
        </Field>
      ),
      valid: Boolean(answers.territory),
    },
    {
      title: t('route.qResident'),
      body: (
        <div className="flex gap-3">
          <Button variant={answers.nationalityType === 'resident' ? 'primary' : 'secondary'} type="button" onClick={() => setAnswers((a) => ({ ...a, nationalityType: 'resident' }))}>
            {t('route.resident')}
          </Button>
          <Button variant={answers.nationalityType === 'non_resident' ? 'primary' : 'secondary'} type="button" onClick={() => setAnswers((a) => ({ ...a, nationalityType: 'non_resident' }))}>
            {t('route.nonResident')}
          </Button>
        </div>
      ),
      valid: true,
    },
    {
      title: t('route.qSign'),
      body: (
        <div className="flex gap-3">
          <Button variant={answers.hasESignature ? 'primary' : 'secondary'} type="button" onClick={() => setAnswers((a) => ({ ...a, hasESignature: true }))}>
            {t('route.yes')}
          </Button>
          <Button variant={!answers.hasESignature ? 'primary' : 'secondary'} type="button" onClick={() => setAnswers((a) => ({ ...a, hasESignature: false }))}>
            {t('route.no')}
          </Button>
        </div>
      ),
      valid: true,
    },
  ]

  const current = steps[step]!

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t('route.title')} subtitle={t('route.subtitle')} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {!result ? (
        <section className="space-y-4 rounded-sm border border-line bg-white p-5">
          <p className="text-sm text-muted">
            {step + 1} / {steps.length}
          </p>
          <h2 className="text-xl">{current.title}</h2>
          {current.body}
          <div className="flex gap-3">
            {step > 0 ? (
              <Button variant="secondary" type="button" onClick={() => setStep((s) => s - 1)}>
                {t('common.back')}
              </Button>
            ) : null}
            {step < steps.length - 1 ? (
              <Button type="button" disabled={!current.valid} onClick={() => setStep((s) => s + 1)}>
                {t('common.next')}
              </Button>
            ) : (
              <Button type="button" loading={calculate.isPending} onClick={() => calculate.mutate()}>
                {t('common.continue')}
              </Button>
            )}
          </div>
        </section>
      ) : (
        <RouteResultView result={result} onSave={() => (user ? save.mutate() : navigate('/register'))} canSave={Boolean(user)} saving={save.isPending} />
      )}
    </div>
  )
}

function RouteResultView({
  result,
  onSave,
  canSave,
  saving,
}: {
  result: RouteResult
  onSave: () => void
  canSave: boolean
  saving: boolean
}) {
  const { t } = useTranslation()
  return (
    <section className="space-y-4 rounded-sm border border-line bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl">{t('route.result')}</h2>
        {result.estimated ? <span className="rounded-sm border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold">{t('route.estimated')}</span> : null}
      </div>
      {result.politeStop ? <Alert tone="warning">{result.politeStop.message}</Alert> : null}
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Route</dt>
          <dd className="font-semibold">{result.registrationRoute}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Legal form</dt>
          <dd>{result.legalForm}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Legalization</dt>
          <dd>{result.legalization}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t('route.days', { days: result.estimatedWorkingDays })}</dt>
          <dd>{t('route.contacts', { count: result.physicalContactsInAzerbaijan })}</dd>
        </div>
      </dl>
      <p>{result.visaNote}</p>
      <FeeList title={t('route.feesState')} lines={result.stateFees} empty={t('route.noFees')} />
      <FeeList title={t('route.feesPartner')} lines={result.partnerFees} empty={t('route.noFees')} />
      <p className="text-sm text-muted">{t('estimatedNote')}</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onSave} loading={saving}>
          {canSave ? t('common.save') : t('route.saveNeedsEmail')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          {t('common.print')}
        </Button>
        {!canSave ? <ButtonLink to="/register" variant="ghost">{t('nav.register')}</ButtonLink> : null}
      </div>
    </section>
  )
}

function FeeList({ title, lines, empty }: { title: string; lines: { label: string; amount: string; currency: string }[]; empty: string }) {
  return (
    <div>
      <h3 className="text-base">{title}</h3>
      {lines.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((line) => (
            <li key={`${line.label}-${line.amount}`} className="flex justify-between py-2 text-sm">
              <span>{line.label}</span>
              <span>
                {line.amount} {line.currency}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
