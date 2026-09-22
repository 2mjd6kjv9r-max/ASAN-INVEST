import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FlagBadge } from '@/components/FlagBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, Button, EmptyState, ErrorState, Field, Input, PageHeader, Select, Skeleton, Textarea } from '@/components/ui'
import { api, isApiError } from '@/lib/api'
import type { AnalyticsOverview, CaseDetail, CaseInternalStatus, CaseListItem, EvaluationDto, Flag, FlagChangeEvent, Procedure } from '@/lib/types'
import { pickName } from '@/lib/types'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const STATUSES: CaseInternalStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'REGISTERED',
  'IN_EVALUATION',
  'WAITING_ADDITIONAL_INFO',
  'ASSIGNED_FOR_EXECUTION',
  'UNDER_REVIEW',
  'INTER_AGENCY_COORDINATION',
  'RESULT_BEING_PREPARED',
  'COMPLETED',
  'REJECTED',
  'WITHDRAWN',
  'ARCHIVED',
]

export function CaseDeskPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('')
  const query = useQuery({ queryKey: ['cases', status], queryFn: () => api.cases(status || undefined) as Promise<CaseListItem[]> })
  return (
    <div className="space-y-4">
      <PageHeader title={t('backoffice.cases')} subtitle={t('backoffice.internal')} />
      <div className="flex flex-wrap gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" onClick={() => void api.slaTick().then(() => void query.refetch())}>
          {t('backoffice.tick')}
        </Button>
      </div>
      {query.isLoading ? <Skeleton className="h-32" /> : null}
      {query.data?.length === 0 ? <EmptyState title={t('common.empty')} /> : null}
      <div className="tbl-wrap overflow-x-auto">
        <table className="tbl">
          <caption className="sr-only">{t('backoffice.cases')}</caption>
          <thead>
            <tr>
              <th>Number</th>
              <th>Internal</th>
              <th>Investor</th>
              <th>SLA</th>
              <th>Manager</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link to={`/backoffice/cases/${row.id}`}>
                    {row.publicNumber || row.id}
                  </Link>
                </td>
                <td>{row.internalStatus}</td>
                <td>
                  <StatusBadge status={row.investorStatus} />
                </td>
                <td>
                  {row.slaState}
                  {row.escalatedAt ? ' · escalated' : ''}
                </td>
                <td>{row.caseManager?.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CaseDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['case', id], queryFn: () => api.case(id!) as Promise<CaseDetail>, enabled: Boolean(id) })
  const [to, setTo] = useState<CaseInternalStatus>('REGISTERED')
  const [managerId, setManagerId] = useState('')
  const [reason, setReason] = useState('')
  const [slaDueAt, setSlaDueAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const row = query.data
  if (query.isLoading) return <Skeleton className="h-40" />
  if (!row) return <ErrorState message={t('common.error')} />

  function run(fn: () => Promise<unknown>) {
    setError(null)
    void fn()
      .then(() => client.invalidateQueries({ queryKey: ['case', id] }))
      .catch((err) => setError(isApiError(err) ? err.message : t('common.error')))
  }

  return (
    <div className="space-y-4">
      <PageHeader title={row.application.publicNumber || row.id} subtitle={row.application.type.code} />
      <p className="text-sm">Internal: {row.internalStatus}</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid gap-3 card md:grid-cols-2">
        <Field label={t('backoffice.transition')}>
          <Select value={to} onChange={(e) => setTo(e.target.value as CaseInternalStatus)}>
            {STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </Field>
        <Button type="button" onClick={() => run(() => api.transitionCase(row.id, to, reason))}>
          {t('backoffice.transition')}
        </Button>
        <Field label={t('backoffice.assign')}>
          <Input value={managerId} onChange={(e) => setManagerId(e.target.value)} placeholder="case manager user id" />
        </Field>
        <Button type="button" variant="secondary" onClick={() => run(() => api.assignCase(row.id, managerId))}>
          {t('backoffice.assign')}
        </Button>
        <Field label={t('backoffice.extend')}>
          <Input type="datetime-local" value={slaDueAt} onChange={(e) => setSlaDueAt(e.target.value)} />
        </Field>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!slaDueAt) {
              setError('Set the new SLA due date')
              return
            }
            run(() => api.extendCase(row.id, new Date(slaDueAt).toISOString(), reason || 'Supervisor extension'))
          }}
        >
          {t('backoffice.extend')}
        </Button>
        <Field label={t('backoffice.reopen')}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button type="button" onClick={() => run(() => api.reopenCase(row.id, reason || 'Supervisor reopen'))}>
          {t('backoffice.reopen')}
        </Button>
        <Button type="button" variant="danger" onClick={() => run(() => api.closeCase(row.id, 'approved', 'Mandatory result recorded'))}>
          {t('backoffice.close')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            run(() =>
              api.extraInfo(row.id, { question: 'Please provide the missing document' }, new Date(Date.now() + 5 * 86400000).toISOString()),
            )
          }
        >
          {t('backoffice.extra')}
        </Button>
      </div>
      <section>
        <h2 className="text-lg">Tasks</h2>
        <ul className="text-sm">
          {row.tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--line)' }}>
              <span>
                {task.status} · {task.dueAt}
              </span>
              <Button type="button" variant="ghost" onClick={() => run(() => api.completeTask(task.id, 'Completed from desk'))}>
                Complete
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function EvaluationsPage() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['evaluations'], queryFn: () => api.evaluations() as Promise<EvaluationDto[]> })
  const [opinion, setOpinion] = useState('')
  return (
    <div className="space-y-4">
      <PageHeader title={t('backoffice.evaluations')} />
      {query.data?.length === 0 ? <EmptyState title={t('common.empty')} /> : null}
      <ul className="space-y-3">
        {query.data?.map((item) => (
          <li key={item.id} className="card">
            <p className="text-sm text-muted">{item.route}</p>
            <Textarea value={opinion} onChange={(e) => setOpinion(e.target.value)} />
            <Button className="mt-2" type="button" onClick={() => void api.evaluationOpinion(item.id, opinion).then(() => void query.refetch())}>
              Submit opinion
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminPage() {
  const { t, i18n } = useTranslation()
  const users = useQuery({ queryKey: ['admin-users'], queryFn: api.adminUsers })
  const cms = useQuery({ queryKey: ['admin-cms'], queryFn: api.adminCms })
  const rules = useQuery({ queryKey: ['admin-rules'], queryFn: api.adminRuleSets })
  const procedures = useQuery({ queryKey: ['admin-procedures'], queryFn: () => api.adminProcedures() as Promise<Procedure[]> })
  const history = useQuery({ queryKey: ['flag-changes'], queryFn: () => api.flagChanges() as Promise<FlagChangeEvent[]> })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('CASE_MANAGER')
  const [selected, setSelected] = useState<Procedure | null>(null)
  const [toFlag, setToFlag] = useState<Flag>('ONLINE')
  const [notify, setNotify] = useState(true)
  const [flagError, setFlagError] = useState<string | null>(null)
  const [flagResult, setFlagResult] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader title={t('backoffice.admin')} />
      <section className="card space-y-4">
        <h2 className="text-lg">{t('phase3.flagEditor')}</h2>
        <p className="muted">{t('phase3.flagEditorHint')}</p>
        {flagError ? <Alert tone="error">{flagError}</Alert> : null}
        {flagResult ? <Alert tone="success">{flagResult}</Alert> : null}
        <div className="tbl-wrap overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {procedures.data?.map((row) => (
                <tr key={row.id} className={selected?.id === row.id ? 'bg-[var(--sunken)]' : undefined}>
                  <td>
                    <button type="button" className="btn btn-t px-0" onClick={() => { setSelected(row); setToFlag(row.flag === 'PLANNED' ? 'ONLINE' : row.flag); setFlagResult(null) }}>
                      {row.code}
                    </button>
                  </td>
                  <td>{pickName(row.names, i18n.language, row.code)}</td>
                  <td>
                    <FlagBadge flag={row.flag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected ? (
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault()
              setFlagError(null)
              void api
                .changeProcedureFlag(selected.id, { from: selected.flag, to: toFlag, notify })
                .then((res) => {
                  setFlagResult(t('phase3.flagChanged', { code: selected.code, to: toFlag }))
                  setSelected({ ...selected, flag: toFlag })
                  void procedures.refetch()
                  void history.refetch()
                  return res
                })
                .catch((err) => setFlagError(isApiError(err) ? err.message : t('common.error')))
            }}
          >
            <Field label={t('phase3.fromFlag')}>
              <Input value={selected.flag} readOnly />
            </Field>
            <Field label={t('phase3.toFlag')}>
              <Select value={toFlag} onChange={(e) => setToFlag(e.target.value as Flag)}>
                <option value="PLANNED">PLANNED</option>
                <option value="ONLINE">ONLINE</option>
                <option value="AUTO">AUTO</option>
                <option value="PHYSICAL">PHYSICAL</option>
              </Select>
            </Field>
            <label className="ck">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              {t('phase3.notifyOwners')}
            </label>
            <Button type="submit" className="sm:col-span-3">
              {selected.flag === 'PLANNED' && toFlag !== 'PLANNED' ? t('phase3.flagConfirm') : t('common.confirm')}
            </Button>
          </form>
        ) : null}
        {history.data && history.data.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {history.data.slice(0, 8).map((row) => (
              <li key={row.id} className="flex flex-wrap justify-between gap-2">
                <span>
                  {row.procedureCode}: {row.fromFlag} → {row.toFlag}
                </span>
                <span className="cap">{row.occurredAt}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="card">
        <h2 className="text-lg">Users</h2>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault()
            void api.adminCreateUser({ email, password, roles: [role] }).then(() => void users.refetch())
          }}
        >
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" />
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option>CASE_MANAGER</option>
            <option>SUPERVISOR</option>
            <option>EVALUATOR</option>
            <option>INSTITUTION_REP</option>
            <option>CONTENT_MANAGER</option>
            <option>ANALYST</option>
          </Select>
          <Button type="submit">{t('common.submit')}</Button>
        </form>
        <pre className="mt-3 max-h-48 overflow-auto text-xs">{JSON.stringify(users.data, null, 2)}</pre>
      </section>
      <section className="card">
        <h2 className="text-lg">CMS</h2>
        <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(cms.data, null, 2)}</pre>
      </section>
      <section className="card">
        <h2 className="text-lg">Rule sets</h2>
        <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(rules.data, null, 2)}</pre>
      </section>
    </div>
  )
}

export function AnalyticsPage() {
  const { t } = useTranslation()
  const query = useQuery({ queryKey: ['analytics'], queryFn: () => api.analyticsOverview() as Promise<AnalyticsOverview> })
  const data = query.data
  return (
    <div className="space-y-4">
      <PageHeader title={t('backoffice.analytics')} />
      {!data ? <Skeleton className="h-32" /> : null}
      {data ? (
        <div className="kpi-grid kpi-3">
          <Stat label="Applications" value={String(data.applications.total)} />
          <Stat label="Submitted" value={String(data.applications.submitted)} />
          <Stat label="KYA" value={String(data.kyaCalculations)} />
          <Stat label="Cases" value={String(data.cases.total)} />
          <Stat label="Overdue" value={String(data.cases.overdue)} />
          <Stat label="Escalated" value={String(data.cases.escalated)} />
        </div>
      ) : null}
      {data && !data.publicKpisApproved ? <Alert tone="info">Public KPI strip is omitted until figures are approved (FR-HOME-04).</Alert> : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card kpi hover-lift">
      <p className="label">{label}</p>
      <p className="v">{value}</p>
    </div>
  )
}
