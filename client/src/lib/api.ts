export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

type RequestOptions = {
  method?: string
  query?: Record<string, string | number | undefined | null>
  body?: unknown
  formData?: FormData
  retry?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const root = path.startsWith('/health') ? path : `${BASE}${path.startsWith('/') ? path : `/${path}`}`
  const params = new URLSearchParams()
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `${root}?${qs}` : root
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const init: RequestInit = {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
  }
  if (options.formData) {
    init.body = options.formData
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(options.body)
  }

  const response = await fetch(buildUrl(path, options.query), init)
  const payload = await parseBody(response)

  if (response.status === 401 && options.retry !== false && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await tryRefresh()
    if (refreshed) return rawRequest(path, { ...options, retry: false })
  }

  if (!response.ok) {
    const err = payload as { error?: { code?: string; message?: string; details?: unknown } }
    throw new ApiError(
      response.status,
      err?.error?.code ?? 'ERROR',
      err?.error?.message ?? 'Request failed',
      err?.error?.details,
    )
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: unknown }).data
  }
  return payload
}

async function tryRefresh(): Promise<boolean> {
  try {
    const data = (await rawRequest('/auth/refresh', { method: 'POST', retry: false })) as {
      accessToken?: string
    }
    if (data?.accessToken) {
      setAccessToken(data.accessToken)
      return true
    }
  } catch {
    setAccessToken(null)
  }
  return false
}

export const api = {
  request: rawRequest,
  health: () => rawRequest('/health') as Promise<{ status: string; service: string; phase: number }>,

  register: (body: {
    email: string
    password: string
    locale?: string
    guestSessionToken?: string
    consents?: { version: string; personalData: boolean }
  }) => rawRequest('/auth/register', { method: 'POST', body }) as Promise<{ accessToken: string; user: unknown }>,
  login: (body: { email: string; password: string }) =>
    rawRequest('/auth/login', { method: 'POST', body }),
  verify2fa: (body: { challengeId: string; code: string }) =>
    rawRequest('/auth/2fa/verify', { method: 'POST', body }),
  refresh: () => rawRequest('/auth/refresh', { method: 'POST', retry: false }),
  logout: () => rawRequest('/auth/logout', { method: 'POST' }),
  me: () => rawRequest('/auth/me'),
  forgotPassword: (email: string) => rawRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    rawRequest('/auth/reset-password', { method: 'POST', body: { token, password } }),
  verifyEmail: (token: string) => rawRequest('/auth/verify-email', { method: 'POST', body: { token } }),
  asanLogin: () =>
    rawRequest('/auth/asan-login', { method: 'POST' }) as Promise<{
      provider: string
      available: boolean
      identificationLevelIfCompleted: string
      message: string
    }>,

  createGuest: (locale?: string) =>
    rawRequest('/guest-sessions', { method: 'POST', body: { locale } }) as Promise<{ token: string; expiresInDays: number }>,
  patchGuest: (token: string, answers: unknown, email?: string, locale?: string) =>
    rawRequest(`/guest-sessions/${token}`, { method: 'PATCH', body: { answers, email, locale } }),

  page: (slug: string, locale: string) => rawRequest(`/pages/${slug}`, { query: { locale } }),
  classifications: (kind?: string) => rawRequest('/classifications', { query: { kind } }),
  procedures: () => rawRequest('/procedures'),
  opportunities: (locale: string) => rawRequest('/opportunities', { query: { locale } }),
  companyRegistration: () =>
    rawRequest('/company-registration') as Promise<{ url: string; message: string }>,

  routeCalculate: (body: unknown) => rawRequest('/route/calculate', { method: 'POST', body }),
  routeSave: (body: unknown) => rawRequest('/route/save', { method: 'POST', body }),
  incentiveEvaluate: (body: unknown) => rawRequest('/incentives/evaluate', { method: 'POST', body }),
  incentiveSave: (body: unknown) => rawRequest('/incentives/save', { method: 'POST', body }),
  kyaEvaluate: (body: unknown) => rawRequest('/kya/evaluate', { method: 'POST', body }),
  kyaSave: (body: unknown) => rawRequest('/kya/save', { method: 'POST', body }),
  getKya: (id: string) => rawRequest(`/kya/${id}`),

  profile: () => rawRequest('/me/profile'),
  updateProfile: (body: unknown) => rawRequest('/me/profile', { method: 'PUT', body }),
  consents: (body: { version: string; personalData: boolean }) =>
    rawRequest('/me/consents', { method: 'POST', body }),
  representations: () => rawRequest('/me/representations'),
  createRepresentation: (body: unknown) => rawRequest('/me/representations', { method: 'POST', body }),
  revokeRepresentation: (id: string) => rawRequest(`/me/representations/${id}/revoke`, { method: 'POST' }),

  cabinet: () => rawRequest('/cabinet/dashboard'),
  projects: () => rawRequest('/projects'),
  createProject: (body: unknown) => rawRequest('/projects', { method: 'POST', body }),
  project: (id: string) => rawRequest(`/projects/${id}`),
  suspendProject: (id: string) => rawRequest(`/projects/${id}/suspend`, { method: 'POST' }),

  applicationTypes: () => rawRequest('/application-types'),
  applications: () => rawRequest('/applications'),
  createApplication: (body: unknown) => rawRequest('/applications', { method: 'POST', body }),
  application: (id: string) => rawRequest(`/applications/${id}`),
  patchApplication: (id: string, answers: unknown) =>
    rawRequest(`/applications/${id}`, { method: 'PATCH', body: { answers } }),
  validateApplication: (id: string) => rawRequest(`/applications/${id}/validate`, { method: 'POST' }),
  submitApplication: (id: string) => rawRequest(`/applications/${id}/submit`, { method: 'POST' }),
  withdrawApplication: (id: string, reason: string) =>
    rawRequest(`/applications/${id}/withdraw`, { method: 'POST', body: { reason } }),
  applicationMessages: (id: string) => rawRequest(`/applications/${id}/messages`),
  postMessage: (id: string, body: string, internal?: boolean) =>
    rawRequest(`/applications/${id}/messages`, { method: 'POST', body: { body, internal } }),

  cases: (status?: string) => rawRequest('/cases', { query: { status } }),
  case: (id: string) => rawRequest(`/cases/${id}`),
  transitionCase: (id: string, to: string, reason?: string) =>
    rawRequest(`/cases/${id}/transition`, { method: 'POST', body: { to, reason } }),
  assignCase: (id: string, caseManagerId: string) =>
    rawRequest(`/cases/${id}/assign`, { method: 'POST', body: { caseManagerId } }),
  extraInfo: (id: string, fields: unknown, dueAt: string) =>
    rawRequest(`/cases/${id}/extra-info`, { method: 'POST', body: { fields, dueAt } }),
  extraInfoRespond: (id: string, requestId: string, response: unknown) =>
    rawRequest(`/cases/${id}/extra-info/${requestId}/respond`, { method: 'POST', body: { response } }),
  closeCase: (id: string, decision: string, reasoning: string) =>
    rawRequest(`/cases/${id}/close`, { method: 'POST', body: { decision, reasoning } }),
  reopenCase: (id: string, reason: string) =>
    rawRequest(`/cases/${id}/reopen`, { method: 'POST', body: { reason } }),
  extendCase: (id: string, slaDueAt: string, reason: string) =>
    rawRequest(`/cases/${id}/extend`, { method: 'POST', body: { slaDueAt, reason } }),
  slaTick: () => rawRequest('/cases/sla/tick', { method: 'POST' }),
  complaint: (id: string, description: string) =>
    rawRequest(`/cases/${id}/complaint`, { method: 'POST', body: { description } }),
  createTask: (id: string, body: unknown) => rawRequest(`/cases/${id}/tasks`, { method: 'POST', body }),
  completeTask: (id: string, opinion: string) =>
    rawRequest(`/tasks/${id}/complete`, { method: 'POST', body: { opinion } }),

  evaluations: () => rawRequest('/evaluations'),
  evaluationOpinion: (id: string, opinion: string, continueCase = true) =>
    rawRequest(`/evaluations/${id}/opinion`, { method: 'POST', body: { opinion, continueCase } }),

  documents: () => rawRequest('/documents'),
  uploadDocument: (file: File, typeCode: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('typeCode', typeCode)
    return rawRequest('/documents', { method: 'POST', formData: form })
  },
  notifications: () => rawRequest('/notifications'),
  readNotification: (id: string) => rawRequest(`/notifications/${id}/read`, { method: 'POST' }),

  adminUsers: () => rawRequest('/admin/users'),
  adminCreateUser: (body: unknown) => rawRequest('/admin/users', { method: 'POST', body }),
  adminUserStatus: (id: string, status: string) =>
    rawRequest(`/admin/users/${id}/status`, { method: 'PATCH', body: { status } }),
  adminClassifications: (kind?: string) => rawRequest('/admin/classifications', { query: { kind } }),
  adminCreateClassification: (body: unknown) => rawRequest('/admin/classifications', { method: 'POST', body }),
  adminApplicationTypes: () => rawRequest('/admin/application-types'),
  adminCreateApplicationType: (body: unknown) => rawRequest('/admin/application-types', { method: 'POST', body }),
  adminProcedures: () => rawRequest('/admin/procedures'),
  adminCreateProcedure: (body: unknown) => rawRequest('/admin/procedures', { method: 'POST', body }),
  adminRuleSets: () => rawRequest('/admin/rule-sets'),
  adminCreateRuleSet: (body: unknown) => rawRequest('/admin/rule-sets', { method: 'POST', body }),
  adminCms: () => rawRequest('/admin/cms'),
  adminCreateCms: (body: unknown) => rawRequest('/admin/cms', { method: 'POST', body }),
  adminCmsTransition: (id: string, to: string) =>
    rawRequest(`/admin/cms/${id}/transition`, { method: 'POST', body: { to } }),
  adminTemplates: () => rawRequest('/admin/notification-templates'),
  adminCreateTemplate: (body: unknown) => rawRequest('/admin/notification-templates', { method: 'POST', body }),
  adminAudit: (objectType?: string) => rawRequest('/admin/audit', { query: { objectType } }),
  adminSettings: () => rawRequest('/admin/settings'),
  analyticsOverview: () => rawRequest('/analytics/overview'),
  analyticsSla: () => rawRequest('/analytics/sla'),
  analyticsKya: () => rawRequest('/analytics/kya'),
}
