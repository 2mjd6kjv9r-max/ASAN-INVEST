import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/providers'
import { Alert, Button, ButtonLink, Field, Input, PageHeader, Select } from '@/components/ui'
import { api, isApiError } from '@/lib/api'
import type { Classification, IncentiveResult } from '@/lib/types'
import { pickName } from '@/lib/types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function IncentivePage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [form, setForm] = useState({
    sector: 'chemicals',
    activity: '',
    volumeAmount: '1200000.00',
    volumeCurrency: 'AZN',
    territory: 'ganja',
    inAgropark: false,
    inIndustrialPark: false,
  })
  const [result, setResult] = useState<IncentiveResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const classifications = useQuery({
    queryKey: ['classifications'],
    queryFn: () => api.classifications() as Promise<Classification[]>,
  })

  const evaluate = useMutation({
    mutationFn: () => api.incentiveEvaluate(form) as Promise<IncentiveResult>,
    onSuccess: setResult,
    onError: (err) => setError(isApiError(err) ? err.message : t('common.error')),
  })
  const save = useMutation({
    mutationFn: () => api.incentiveSave(form) as Promise<IncentiveResult>,
    onSuccess: setResult,
  })

  const sectors = (classifications.data ?? []).filter((c) => c.kind === 'SECTOR')
  const activities = (classifications.data ?? []).filter((c) => c.kind === 'ACTIVITY')
  const regions = (classifications.data ?? []).filter((c) => c.kind === 'REGION')

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t('inc.title')} subtitle={t('inc.subtitle')} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form
        className="space-y-4 rounded-sm border border-line bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault()
          evaluate.mutate()
        }}
      >
        <Field label={t('route.qSector')}>
          <Select value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}>
            {sectors.map((item) => (
              <option key={item.code} value={item.code}>
                {pickName(item.names, i18n.language, item.code)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('inc.activity')}>
          <Select value={form.activity} onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value }))}>
            <option value="">—</option>
            {activities.map((item) => (
              <option key={item.code} value={item.code}>
                {pickName(item.names, i18n.language, item.code)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('common.amount')}>
            <Input value={form.volumeAmount} onChange={(e) => setForm((f) => ({ ...f, volumeAmount: e.target.value }))} />
          </Field>
          <Field label={t('common.currency')}>
            <Select value={form.volumeCurrency} onChange={(e) => setForm((f) => ({ ...f, volumeCurrency: e.target.value }))}>
              <option>AZN</option>
              <option>USD</option>
              <option>EUR</option>
            </Select>
          </Field>
        </div>
        <Field label={t('route.qTerritory')}>
          <Select value={form.territory} onChange={(e) => setForm((f) => ({ ...f, territory: e.target.value }))}>
            {regions.map((item) => (
              <option key={item.code} value={item.code}>
                {pickName(item.names, i18n.language, item.code)}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.inAgropark} onChange={(e) => setForm((f) => ({ ...f, inAgropark: e.target.checked }))} />
          {t('inc.agro')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.inIndustrialPark} onChange={(e) => setForm((f) => ({ ...f, inIndustrialPark: e.target.checked }))} />
          {t('inc.industrial')}
        </label>
        <Button type="submit" loading={evaluate.isPending}>
          {t('common.continue')}
        </Button>
      </form>
      {result ? (
        <section className="space-y-3 rounded-sm border border-line bg-white p-5">
          <p className="text-lg font-semibold text-navy">{t(`inc.${result.outcome}`)}</p>
          <p>{i18n.language === 'az' ? result.explanationAz : result.explanationEn}</p>
          <p className="text-sm">
            <strong>{t('inc.legal')}:</strong> {result.legalCitation}
          </p>
          {result.estimatedSavingNote ? <Alert tone="info">{result.estimatedSavingNote}</Alert> : null}
          {result.alternatives.length > 0 ? (
            <ul className="list-disc pl-5 text-sm">
              {result.alternatives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm text-muted">{t('estimatedNote')}</p>
          {user ? (
            <Button type="button" onClick={() => save.mutate()} loading={save.isPending}>
              {t('common.save')}
            </Button>
          ) : (
            <ButtonLink to="/login">{t('kya.guestView')}</ButtonLink>
          )}
        </section>
      ) : null}
    </div>
  )
}
