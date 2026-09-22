import { useAuth } from '@/app/providers'
import { Alert, Button, ButtonLink, Field, Input } from '@/components/ui'
import { api, isApiError } from '@/lib/api'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export function LoginPage() {
  const { t } = useTranslation()
  const { login, verify2fa } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [challenge, setChallenge] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [asan, setAsan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (challenge) {
        await verify2fa(challenge, code)
        navigate(from || '/backoffice', { replace: true })
        return
      }
      const result = await login(email, password)
      if (result.twoFactor) {
        setChallenge(result.twoFactor)
        return
      }
      navigate(from || '/cabinet', { replace: true })
    } catch (err) {
      setError(isApiError(err) ? err.message : t('common.error'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-sm border border-line bg-white p-6">
      <h1 className="text-2xl">{challenge ? t('auth.twoFactorTitle') : t('auth.loginTitle')}</h1>
      {challenge ? <p className="text-sm text-muted">{t('auth.twoFactorHint')}</p> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        {!challenge ? (
          <>
            <Field label={t('common.email')}>
              <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label={t('common.password')}>
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
          </>
        ) : (
          <Field label="Code">
            <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
          </Field>
        )}
        <Button type="submit" loading={pending} className="w-full">
          {t('nav.login')}
        </Button>
      </form>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={async () => {
          const data = await api.asanLogin()
          setAsan(data.message)
        }}
      >
        {t('auth.asan')}
      </Button>
      {asan ? <Alert tone="info">{asan}</Alert> : null}
      <p className="text-sm">
        {t('auth.noAccount')} <Link to="/register">{t('nav.register')}</Link>
      </p>
      <p className="text-sm">
        <Link to="/forgot-password">{t('auth.forgot')}</Link>
      </p>
      <p className="text-xs text-muted">{t('auth.demo')}</p>
    </div>
  )
}

export function RegisterPage() {
  const { t, i18n } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-sm border border-line bg-white p-6">
      <h1 className="text-2xl">{t('auth.registerTitle')}</h1>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          setPending(true)
          setError(null)
          void register({ email, password, locale: i18n.language, personalData: consent })
            .then(() => navigate('/cabinet'))
            .catch((err) => setError(isApiError(err) ? err.message : t('common.error')))
            .finally(() => setPending(false))
        }}
      >
        <Field label={t('common.email')}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label={t('common.password')} hint={t('auth.passwordHint')}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          {t('auth.consent')}
        </label>
        <Button type="submit" loading={pending} className="w-full" disabled={!consent}>
          {t('nav.register')}
        </Button>
      </form>
      <p className="text-sm">
        {t('auth.haveAccount')} <Link to="/login">{t('nav.login')}</Link>
      </p>
    </div>
  )
}

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-sm border border-line bg-white p-6">
      <h1 className="text-2xl">{t('auth.forgotTitle')}</h1>
      {message ? <Alert tone="success">{message}</Alert> : null}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void api.forgotPassword(email).then((res) => setMessage(String((res as { message?: string })?.message ?? t('common.save'))))
        }}
      >
        <Field label={t('common.email')}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Button type="submit" className="w-full">
          {t('common.submit')}
        </Button>
      </form>
    </div>
  )
}

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = params.get('token') ?? ''
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-sm border border-line bg-white p-6">
      <h1 className="text-2xl">{t('auth.forgotTitle')}</h1>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? (
        <ButtonLink to="/login">{t('nav.login')}</ButtonLink>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void api
              .resetPassword(token, password)
              .then(() => setDone(true))
              .catch((err) => setError(isApiError(err) ? err.message : t('common.error')))
          }}
        >
          <Field label={t('common.password')} hint={t('auth.passwordHint')}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
          </Field>
          <Button type="submit" className="w-full">
            {t('common.submit')}
          </Button>
        </form>
      )}
    </div>
  )
}

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [message, setMessage] = useState<string | null>(null)
  const token = params.get('token') ?? ''
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-sm border border-line bg-white p-6">
      <h1 className="text-2xl">{t('auth.verifyTitle')}</h1>
      {message ? <Alert>{message}</Alert> : null}
      <Button
        type="button"
        onClick={() =>
          void api
            .verifyEmail(token)
            .then(() => setMessage('Email verified. Identification level 1 is active.'))
            .catch((err) => setMessage(isApiError(err) ? err.message : t('common.error')))
        }
      >
        {t('common.confirm')}
      </Button>
    </div>
  )
}
