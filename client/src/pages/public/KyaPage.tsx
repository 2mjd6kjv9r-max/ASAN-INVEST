import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/app/providers'
import { FlagBadge } from '@/components/FlagBadge'
import { Alert, Button, ButtonLink, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'
import { api, isApiError } from '@/lib/api'
import type { Flag, KyaEvaluateResult } from '@/lib/types'
import { pickName } from '@/lib/types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function KyaPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [form, setForm] = useState({
    sector: 'chemicals',
    territory: 'sumqayit',
    volumeAmount: '4500000.00',
    volumeCurrency: 'AZN',
    foreignWorkers: '',
    description: '',
    confirmedParameters: true,
  })
  const [pending, setPending] = useState<KyaEvaluateResult | null>(null)
  const [result, setResult] = useState<KyaEvaluateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const evaluate = useMutation({
    mutationFn: (confirmed: boolean) =>
      api.kyaEvaluate({
        ...form,
        foreignWorkers: form.foreignWorkers ? Number(form.foreignWorkers) : null,
        confirmedParameters: confirmed,
        siParameters: form.description ? { description: form.description, sector: form.sector, territory: form.territory } : undefined,
      }) as Promise<KyaEvaluateResult>,
    onSuccess: (data) => {
      if (data.needsConfirmation) setPending(data)
      else {
        setPending(null)
        setResult(data)
      }
    },
    onError: (err) => setError(isApiError(err) ? err.message : t('common.error')),
  })

  const save = useMutation({
    mutationFn: () =>
      api.kyaSave({
        ...form,
        foreignWorkers: form.foreignWorkers ? Number(form.foreignWorkers) : null,
        confirmedParameters: true,
      }) as Promise<KyaEvaluateResult>,
    onSuccess: setResult,
    onError: (err) => {
      if (isApiError(err) && err.code === 'IDENTIFICATION_LEVEL') setError(t('auth.level2'))
      else setError(isApiError(err) ? err.message : t('common.error'))
    },
  })

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t('kya.title')} subtitle={t('kya.subtitle')} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form
        className="card space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          evaluate.mutate(!form.description)
        }}
      >
        <Field label={t('route.qSector')}>
          <Input value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
        </Field>
        <Field label={t('route.qTerritory')}>
          <Input value={form.territory} onChange={(e) => setForm((f) => ({ ...f, territory: e.target.value }))} />
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
        <Field label={t('kya.foreignWorkers')}>
          <Input value={form.foreignWorkers} onChange={(e) => setForm((f) => ({ ...f, foreignWorkers: e.target.value }))} inputMode="numeric" />
        </Field>
        <Field label={t('kya.description')} hint={t('kya.confirmHint')}>
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Field>
        <Button type="submit" loading={evaluate.isPending}>
          {t('common.continue')}
        </Button>
      </form>

      {pending?.needsConfirmation ? (
        <section className="card space-y-3">
          <h2 className="text-lg">{t('kya.confirmTitle')}</h2>
          <pre className="overflow-auto rounded-lg p-3 text-xs" style={{ background: 'var(--sunken)' }}>{JSON.stringify(pending.extracted, null, 2)}</pre>
          <Button type="button" onClick={() => evaluate.mutate(true)}>
            {t('common.confirm')}
          </Button>
        </section>
      ) : null}

      {result?.procedures ? (
        <section className="card space-y-3">
          <ul className="space-y-3">
            {result.procedures.map((item) => (
              <li key={item.code} className="flex flex-wrap items-center justify-between gap-2 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
                <div>
                  <p className="font-semibold">{pickName(item.names, i18n.language, item.code)}</p>
                  <p className="text-sm text-muted">{item.reason}</p>
                </div>
                {item.flag ? <FlagBadge flag={item.flag as Flag} /> : null}
              </li>
            ))}
          </ul>
          {user ? (
            <Button type="button" onClick={() => save.mutate()} loading={save.isPending}>
              {t('kya.persist')}
            </Button>
          ) : (
            <ButtonLink to="/login">{t('kya.guestView')}</ButtonLink>
          )}
        </section>
      ) : null}
    </div>
  )
}
