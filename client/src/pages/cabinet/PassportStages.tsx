import { FlagBadge } from '@/components/FlagBadge'
import { PlanNotice } from '@/components/PlanNotice'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, Button, ButtonLink, Field, Select, Textarea } from '@/components/ui'
import { api, isApiError } from '@/lib/api'
import { applicationTypeForProcedure, integrationCodeForProcedure, isBankProcedure, isZoningProcedure } from '@/lib/phase3'
import type { BankChannel, BankSubmission, Classification, Flag, IntegrationStatus, ProjectDetail, ProjectStage } from '@/lib/types'
import { pickName } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function PassportStages({ project }: { project: ProjectDetail }) {
  const { t, i18n } = useTranslation()
  const summary = project.flagSummary
  return (
    <div className="space-y-4">
      {summary ? (
        <div className="card">
          <p className="label">{t('cabinet.passport')}</p>
          <p className="v" style={{ fontSize: 22 }}>
            {t('phase3.flagSummary', { days: summary.workingDays, count: summary.physicalContacts })}
          </p>
          <p className="cap mt-2">{t('estimatedNote')}</p>
        </div>
      ) : null}
      <ol className="space-y-3">
        {project.stages.map((stage) => (
          <li key={stage.id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{pickName(stage.procedure.names, i18n.language, stage.procedure.code)}</p>
                <p className="text-sm text-muted">{stage.expectedDurationDays ? t('route.days', { days: stage.expectedDurationDays }) : null}</p>
              </div>
              <div className="flex items-center gap-2">
                <FlagBadge flag={stage.flag} />
                <StatusBadge status={stage.displayStatus} />
              </div>
            </div>
            {stage.displayStatus === 'LOCKED' ? <p className="text-sm text-muted">{t('cabinet.lockedWhy')}</p> : null}
            <StagePlanPanel projectId={project.id} stage={stage} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function StagePlanPanel({ projectId, stage }: { projectId: string; stage: ProjectStage }) {
  const { t } = useTranslation()
  const code = stage.procedure.code
  const integration = integrationCodeForProcedure(code)
  const typeCode = applicationTypeForProcedure(code)
  const canDraft = stage.displayStatus === 'OPEN'
  const draftTo = `/cabinet/applications/new?stageId=${stage.id}&projectId=${projectId}&source=PASSPORT_STAGE&typeCode=${typeCode}`

  return (
    <div className="space-y-3">
      {canDraft ? (
        <ButtonLink className="mt-1" to={draftTo} variant="secondary">
          {stage.flag === 'PLANNED' ? t('phase3.draftPlan') : t('cabinet.newApplication')}
        </ButtonLink>
      ) : null}
      {integration && stage.displayStatus === 'OPEN' ? <IntegrationPanel projectId={projectId} stageId={stage.id} code={integration} flag={stage.flag} /> : null}
      {isBankProcedure(code) ? <BankStep projectId={projectId} canSend={stage.displayStatus === 'OPEN'} /> : null}
      {isZoningProcedure(code) ? (
        <div className="space-y-3">
          <div className="zoning-pin" aria-hidden="true">
            <span className="zoning-dot" />
            <span>{t('phase3.zoningPin')}</span>
          </div>
          <PlanNotice available={false} flag={stage.flag} message={t('phase3.zoningNoCoeff')} />
        </div>
      ) : null}
    </div>
  )
}

function IntegrationPanel({
  projectId,
  stageId,
  code,
  flag,
}: {
  projectId: string
  stageId: string
  code: string
  flag: Flag
}) {
  const { t } = useTranslation()
  const status = useQuery({
    queryKey: ['integration', code],
    queryFn: () => api.integrationStatus(code) as Promise<IntegrationStatus>,
  })
  const submit = useMutation({
    mutationFn: () => api.externalSubmit(projectId, stageId) as Promise<{ available: boolean; flag: Flag; message: string }>,
  })
  const data = status.data
  if (!data) return status.isError ? <Alert tone="error">{t('common.error')}</Alert> : null
  return (
    <PlanNotice available={data.available} flag={data.flag || flag} message={data.message}>
      <p className="cap">{t('phase3.nextPrepare')}</p>
      <Button
        type="button"
        variant="secondary"
        className="mt-2"
        loading={submit.isPending}
        onClick={() => submit.mutate()}
      >
        {t('phase3.externalSubmit')}
      </Button>
      {submit.data ? (
        <p className="cap mt-2">
          {submit.data.message} ({t('phase3.availableFalse')})
        </p>
      ) : null}
      {submit.isError ? <p className="err-msg mt-2">{isApiError(submit.error) ? submit.error.message : t('common.error')}</p> : null}
    </PlanNotice>
  )
}

function BankStep({ projectId, canSend }: { projectId: string; canSend: boolean }) {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const banks = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.classifications('INSTITUTION') as Promise<Classification[]>,
  })
  const existing = useQuery({
    queryKey: ['bank-submissions', projectId],
    queryFn: () => api.bankSubmissions(projectId) as Promise<BankSubmission[]>,
  })
  const savedPacket = useQuery({
    queryKey: ['kyc-packet'],
    queryFn: () => api.kycPacket() as Promise<{ packet?: unknown }>,
  })
  const [channel, setChannel] = useState<BankChannel>('PHYSICAL_SIGNATURE')
  const [selected, setSelected] = useState<string[]>([])
  const [packet, setPacket] = useState('{"ubo":"","sourceOfFunds":"","fatcaCrs":"","activity":""}')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const current = savedPacket.data?.packet
    if (current && typeof current === 'object') setPacket(JSON.stringify(current, null, 2))
  }, [savedPacket.data])

  const pilots = (banks.data ?? []).filter((row) => row.code.startsWith('pilot-bank'))

  const send = useMutation({
    mutationFn: async () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(packet) as unknown
      } catch {
        throw new Error(t('phase3.kycInvalid'))
      }
      if (!packetHasContent(parsed)) throw new Error(t('phase3.kycEmpty'))
      await api.putKycPacket(parsed)
      return api.createBankSubmissions(projectId, { bankInstitutionIds: selected, channel }) as Promise<{
        flag: Flag
        channel: BankChannel
        submissions: unknown[]
      }>
    },
    onSuccess: () => {
      setError(null)
      void client.invalidateQueries({ queryKey: ['bank-submissions', projectId] })
      void client.invalidateQueries({ queryKey: ['kyc-packet'] })
    },
    onError: (err) => setError(isApiError(err) ? err.message : err instanceof Error ? err.message : t('common.error')),
  })

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id].slice(0, 2)))
  }

  return (
    <div className="space-y-3">
      <PlanNotice available={false} flag="PLANNED" message={t('phase3.bankNoOpen')} />
      <Field label={t('phase3.bankChannel')}>
        <Select value={channel} onChange={(e) => setChannel(e.target.value as BankChannel)}>
          <option value="PHYSICAL_SIGNATURE">{t('phase3.bankPhysical')}</option>
          <option value="REMOTE_ESIGN">{t('phase3.bankRemote')}</option>
        </Select>
      </Field>
      {channel === 'REMOTE_ESIGN' ? <p className="cap">{t('phase3.bankRemoteHint')}</p> : null}
      <div className="grid gap-2">
        {pilots.map((bank) => (
          <button
            key={bank.id}
            type="button"
            className={`optcard ${selected.includes(bank.id) ? 'sel' : ''}`}
            onClick={() => toggle(bank.id)}
          >
            <span className="radio" />
            <span className="font-medium">{pickName(bank.names, i18n.language, bank.code)}</span>
          </button>
        ))}
      </div>
      <Field label={t('phase3.kycPacket')} hint={t('phase3.kycPacketHint')}>
        <Textarea value={packet} onChange={(e) => setPacket(e.target.value)} />
      </Field>
      {error ? <Alert tone="warning">{error}</Alert> : null}
      <Button type="button" loading={send.isPending} disabled={!canSend || selected.length === 0} onClick={() => send.mutate()}>
        {t('phase3.sendBank')}
      </Button>
      {existing.data && existing.data.length > 0 ? (
        <ul className="tbl-wrap">
          {existing.data.map((row) => (
            <li key={row.applicationId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <span>
                {row.publicNumber || row.applicationId} · {row.channel || 'PHYSICAL_SIGNATURE'}
              </span>
              <FlagBadge flag={row.channel === 'REMOTE_ESIGN' ? 'PLANNED' : 'PHYSICAL'} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function packetHasContent(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number' || typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.some(packetHasContent)
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(packetHasContent)
  return false
}
