import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FlagBadge } from '@/components/FlagBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, Button, ButtonLink, EmptyState, ErrorState, Field, Input, Kpi, PageHeader, Select, Skeleton, Textarea } from '@/components/ui'
import { api, isApiError } from '@/lib/api'
import type { ApplicationDto, ApplicationType, CabinetDashboard, DocumentDto, NotificationDto, ProjectDetail, ProjectListItem, Representation, User } from '@/lib/types'
import { pickName } from '@/lib/types'
import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'

export function CabinetHomePage() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['cabinet'], queryFn: () => api.cabinet() as Promise<CabinetDashboard> })
  if (query.isLoading) return <Skeleton className="h-40" />
  if (query.isError) return <ErrorState message={t('common.error')} onRetry={() => void query.refetch()} />
  const data = query.data
  if (!data) return null
  const grouped = new Map<string, CabinetDashboard['applications']>()
  for (const app of data.applications) {
    const list = grouped.get(app.investorStatus) ?? []
    list.push(app)
    grouped.set(app.investorStatus, list)
  }
  return (
    <div className="space-y-6">
      <PageHeader title={t('cabinet.next')} />
      <div className="kpi-grid kpi-2">
        <Kpi label={t('cabinet.applications')} value={String(data.applications.length)} />
        <Kpi label={t('status.WAITING_YOUR_RESPONSE')} value={String(grouped.get('WAITING_YOUR_RESPONSE')?.length ?? 0)} />
      </div>
      <section className="card">
        <p className="cap">{data.nextStep.projectName}</p>
        <h2 style={{ marginTop: 4 }}>{data.nextStep.title}</h2>
        <p style={{ marginTop: 8 }}>{data.nextStep.action}</p>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">{t('cabinet.applications')}</h2>
          <ButtonLink to="/cabinet/applications/new" variant="secondary">
            {t('cabinet.newApplication')}
          </ButtonLink>
        </div>
        <p className="mb-2 text-sm text-muted">{t('cabinet.grouped')}</p>
        {data.applications.length === 0 ? <EmptyState title={t('common.empty')} /> : null}
        {[...grouped.entries()].map(([status, items]) => (
          <div key={status} className="mb-4">
            <StatusBadge status={status} />
            <ul className="tbl-wrap mt-2">
              {items.map((item) => (
                <li key={item.id} className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
                  <Link to={`/cabinet/applications/${item.id}`}>
                    {item.publicNumber || item.id} · {item.type}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}

export function ProjectsPage() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() as Promise<ProjectListItem[]> })
  return (
    <div className="space-y-4">
      <PageHeader
        title={t('cabinet.projects')}
        action={<ButtonLink to="/cabinet/projects/new">{t('cabinet.newProject')}</ButtonLink>}
      />
      {query.isLoading ? <Skeleton className="h-32" /> : null}
      {query.data?.length === 0 ? <EmptyState title={t('common.empty')} /> : null}
      <ul className="space-y-3">
        {query.data?.map((project) => (
          <li key={project.id} className="card hover-lift">
            <Link to={`/cabinet/projects/${project.id}`} className="font-semibold">
              {project.name}
            </Link>
            <p className="text-sm text-muted">
              {project.volumeAmount} {project.volumeCurrency}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProjectNewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', sector: 'chemicals', territory: 'baku', volumeAmount: '1000000.00', volumeCurrency: 'AZN', kyaResultId: '' })
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="card max-w-xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void api
          .createProject({ ...form, kyaResultId: form.kyaResultId || null })
          .then((row) => navigate(`/cabinet/projects/${(row as { id: string }).id}`))
          .catch((err) => setError(isApiError(err) ? err.message : t('common.error')))
      }}
    >
      <PageHeader title={t('cabinet.newProject')} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Field label="Name">
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      </Field>
      <Field label="Sector code">
        <Input value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
      </Field>
      <Field label="Territory code">
        <Input value={form.territory} onChange={(e) => setForm((f) => ({ ...f, territory: e.target.value }))} />
      </Field>
      <Field label={t('common.amount')}>
        <Input value={form.volumeAmount} onChange={(e) => setForm((f) => ({ ...f, volumeAmount: e.target.value }))} />
      </Field>
      <Field label="KYA result id">
        <Input value={form.kyaResultId} onChange={(e) => setForm((f) => ({ ...f, kyaResultId: e.target.value }))} required />
      </Field>
      <Button type="submit">{t('common.submit')}</Button>
    </form>
  )
}

export function ProjectPassportPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const query = useQuery({ queryKey: ['project', id], queryFn: () => api.project(id!) as Promise<ProjectDetail>, enabled: Boolean(id) })
  if (query.isLoading) return <Skeleton className="h-40" />
  if (query.isError) return <ErrorState message={t('common.error')} onRetry={() => void query.refetch()} />
  const project = query.data
  if (!project) return null
  return (
    <div className="space-y-4">
      <PageHeader title={project.name} subtitle={t('cabinet.passport')} />
      <ol className="space-y-3">
        {project.stages.map((stage) => (
          <li key={stage.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{pickName(stage.procedure.names, i18n.language, stage.procedure.code)}</p>
                <p className="text-sm text-muted">{stage.expectedDurationDays ? `${stage.expectedDurationDays} days` : null}</p>
              </div>
              <div className="flex items-center gap-2">
                <FlagBadge flag={stage.flag} />
                <StatusBadge status={stage.displayStatus} />
              </div>
            </div>
            {stage.displayStatus === 'LOCKED' ? <p className="mt-2 text-sm text-muted">{t('cabinet.lockedWhy')}</p> : null}
            {stage.displayStatus === 'OPEN' ? (
              <ButtonLink className="mt-3" to={`/cabinet/applications/new?stageId=${stage.id}&projectId=${project.id}&source=PASSPORT_STAGE`} variant="secondary">
                {t('cabinet.newApplication')}
              </ButtonLink>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function ApplicationsPage() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['applications'], queryFn: () => api.applications() as Promise<ApplicationDto[]> })
  return (
    <div className="space-y-4">
      <PageHeader
        title={t('cabinet.applications')}
        action={<ButtonLink to="/cabinet/applications/new">{t('cabinet.newApplication')}</ButtonLink>}
      />
      {query.data?.length === 0 ? <EmptyState title={t('common.empty')} /> : null}
      <ul className="tbl-wrap">
        {query.data?.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <Link to={`/cabinet/applications/${item.id}`}>
              {item.publicNumber || item.id}
            </Link>
            <StatusBadge status={item.investorStatus} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ApplicationNewPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const types = useQuery({ queryKey: ['application-types'], queryFn: () => api.applicationTypes() as Promise<ApplicationType[]> })
  const [typeCode, setTypeCode] = useState('consultation')
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="card max-w-xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const params = new URLSearchParams(window.location.search)
        void api
          .createApplication({
            typeCode,
            source: params.get('source') || 'NEW_APPLICATION',
            stageId: params.get('stageId') || undefined,
            projectId: params.get('projectId') || undefined,
            answers: {},
          })
          .then((row) => navigate(`/cabinet/applications/${(row as ApplicationDto).id}`))
          .catch((err) => {
            if (isApiError(err) && err.code === 'IDENTIFICATION_LEVEL') setError(t('auth.level2'))
            else if (isApiError(err) && err.code === 'CAPITAL_BLOCKED') setError(err.message)
            else setError(isApiError(err) ? err.message : t('common.error'))
          })
      }}
    >
      <PageHeader title={t('cabinet.newApplication')} />
      {error ? (
        <Alert tone="warning">
          {error} {error === t('auth.level2') ? <Link to="/route">Marşrutum</Link> : null}
        </Alert>
      ) : null}
      <Field label="Type">
        <Select value={typeCode} onChange={(e) => setTypeCode(e.target.value)}>
          {types.data?.map((item) => (
            <option key={item.code} value={item.code}>
              {pickName(item.names, i18n.language, item.code)}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit">{t('common.continue')}</Button>
    </form>
  )
}

export function ApplicationDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['application', id], queryFn: () => api.application(id!) as Promise<ApplicationDto>, enabled: Boolean(id) })
  const types = useQuery({ queryKey: ['application-types'], queryFn: () => api.applicationTypes() as Promise<ApplicationType[]> })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const app = query.data
  const schema = useMemo(() => types.data?.find((item) => item.code === app?.type.code)?.formSchema, [types.data, app?.type])

  useEffect(() => {
    const raw = query.data?.answers
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const next: Record<string, string> = {}
      for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (value != null) next[key] = String(value)
      }
      setAnswers(next)
    }
  }, [query.data?.id, query.data?.answers])

  if (query.isLoading) return <Skeleton className="h-40" />
  if (!app) return <ErrorState message={t('cabinet.applications')} />

  const fields = schema?.fields ?? []

  return (
    <div className="space-y-4">
      <PageHeader title={app.publicNumber || app.id} subtitle={app.nextStep ?? undefined} />
      <StatusBadge status={app.investorStatus} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {app.snapshot ? <Alert tone="info">Snapshot is immutable after submit (FR-APP-04).</Alert> : null}
      <form
        className="card space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void api.patchApplication(app.id, answers).then(() => void client.invalidateQueries({ queryKey: ['application', id] }))
        }}
      >
        {fields.length === 0 ? <p className="text-sm text-muted">No extra fields are configured for this type.</p> : null}
        {fields.map((field) => (
          <Field key={field.name} label={typeof field.label === 'string' ? field.label : field.name}>
            <Input value={answers[field.name] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [field.name]: e.target.value }))} required={field.required} disabled={Boolean(app.snapshot)} />
          </Field>
        ))}
        {!app.snapshot ? (
          <div className="flex gap-2">
            <Button type="submit">{t('common.save')}</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void api
                  .validateApplication(app.id)
                  .then(() => setError(null))
                  .catch((err) => setError(isApiError(err) ? err.message : t('common.error')))
              }
            >
              {t('cabinet.validate')}
            </Button>
            <Button
              type="button"
              onClick={() =>
                void api
                  .submitApplication(app.id)
                  .then(() => void client.invalidateQueries({ queryKey: ['application', id] }))
                  .catch((err) => {
                    if (isApiError(err) && err.code === 'IDENTIFICATION_LEVEL') setError(t('auth.level2'))
                    else setError(isApiError(err) ? err.message : t('common.error'))
                  })
              }
            >
              {t('cabinet.snapshot')}
            </Button>
          </div>
        ) : null}
      </form>
      {app.submittedAt && app.investorStatus !== 'WITHDRAWN' ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            void api.withdrawApplication(app.id, reason).then(() => void client.invalidateQueries({ queryKey: ['application', id] }))
          }}
        >
          <Field label={t('cabinet.withdrawReason')}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} required />
          </Field>
          <Button type="submit" variant="danger">
            {t('cabinet.withdraw')}
          </Button>
        </form>
      ) : null}
      <section className="card space-y-2">
        <h2 className="text-lg">{t('cabinet.messages')}</h2>
        <ul className="space-y-2 text-sm">
          {app.messages?.map((item) => (
            <li key={item.id}>{item.body}</li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void api.postMessage(app.id, message).then(() => {
              setMessage('')
              void client.invalidateQueries({ queryKey: ['application', id] })
            })
          }}
        >
          <Input value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button type="submit">{t('common.submit')}</Button>
        </form>
      </section>
    </div>
  )
}

export function ProfilePage() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['profile'], queryFn: () => api.profile() as Promise<User> })
  const reps = useQuery({ queryKey: ['representations'], queryFn: () => api.representations() as Promise<Representation[]> })
  const [companyName, setCompanyName] = useState('')
  const [repEmail, setRepEmail] = useState('')
  if (query.isLoading) return <Skeleton className="h-32" />
  return (
    <div className="space-y-6">
      <PageHeader title={t('cabinet.profile')} />
      <form
        className="card max-w-xl space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void api.updateProfile({ companyName })
        }}
      >
        <p className="text-sm text-muted">{query.data?.email}</p>
        <Field label="Company">
          <Input defaultValue={query.data?.profile?.companyName ?? ''} onChange={(e) => setCompanyName(e.target.value)} />
        </Field>
        <Button type="submit">{t('common.save')}</Button>
      </form>
      <section className="space-y-3">
        <h2 className="text-lg">Representations</h2>
        <ul>
          {reps.data?.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: '1px solid var(--line)' }}>
              <span>
                {item.representativeUser?.email} · {item.authority}
              </span>
              {!item.revokedAt ? (
                <Button type="button" variant="ghost" onClick={() => void api.revokeRepresentation(item.id)}>
                  Revoke
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void api.createRepresentation({ representativeEmail: repEmail, authority: 'VIEW' })
          }}
        >
          <Input value={repEmail} onChange={(e) => setRepEmail(e.target.value)} placeholder="representative@email" />
          <Button type="submit">{t('common.submit')}</Button>
        </form>
      </section>
    </div>
  )
}

export function DocumentsPage() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['documents'], queryFn: () => api.documents() as Promise<DocumentDto[]> })
  return (
    <div className="space-y-4">
      <PageHeader title={t('cabinet.documents')} />
      <input
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void api.uploadDocument(file, 'identity-document').then(() => void query.refetch())
        }}
      />
      <ul className="tbl-wrap">
        {query.data?.map((doc) => (
          <li key={doc.id} className="px-4 py-3 text-sm" style={{ borderBottom: '1px solid var(--line)' }}>
            {doc.originalName || doc.id}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function NotificationsPage() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications() as Promise<NotificationDto[]> })
  return (
    <div className="space-y-4">
      <PageHeader title={t('cabinet.notifications')} />
      {query.data?.length === 0 ? <EmptyState title={t('common.empty')} /> : null}
      <ul className="space-y-2">
        {query.data?.map((item) => (
          <li key={item.id} className="card text-sm" style={{ padding: 16 }}>
            <p>{item.body}</p>
            {!item.readAt ? (
              <Button type="button" variant="ghost" onClick={() => void api.readNotification(item.id).then(() => void query.refetch())}>
                Mark read
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
