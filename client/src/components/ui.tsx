import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, type LinkProps } from 'react-router-dom'

const buttonClass = {
  primary: 'btn btn-p',
  secondary: 'btn btn-s',
  ghost: 'btn btn-t',
  danger: 'btn btn-d',
  hero: 'btn btn-ghost',
}

export function Button({
  variant = 'primary',
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonClass; loading?: boolean }) {
  return (
    <button className={cn(buttonClass[variant], className)} disabled={props.disabled || loading} aria-busy={loading || undefined} {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: LinkProps & { variant?: keyof typeof buttonClass }) {
  return <Link className={cn(buttonClass[variant], 'no-underline', className)} {...props} />
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="cap block">{hint}</span> : null}
      {error ? (
        <span role="alert" className="err-msg">
          {error}
        </span>
      ) : null}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('inp', props.className)} {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('inp', props.className)} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('inp', props.className)} {...props} />
}

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'warning' | 'success'
  children: ReactNode
}) {
  const map = {
    info: 'border-l-[3px] border-[var(--ink-500)] bg-[var(--info-bg)] text-[var(--text)]',
    error: 'border-l-[3px] border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--text)]',
    warning: 'warn',
    success: 'border-l-[3px] border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--text)]',
  }
  if (tone === 'warning') {
    return (
      <div role="status" className="warn">
        <div>{children}</div>
      </div>
    )
  }
  return (
    <div role="status" className={cn('rounded-lg px-4 py-3 text-sm', map[tone])}>
      {children}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card card-2 empty">
      <div className="ic" aria-hidden="true">
        ▢
      </div>
      <div className="t">{title}</div>
      {body ? <p>{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="rounded-lg border-l-[3px] border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3">
      <p className="text-sm">{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-t mt-2 px-0" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('sk', className)} aria-hidden="true" />
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="pghead">
      <div className="space-y-2">
        <h1>{title}</h1>
        {subtitle ? <p className="max-w-3xl muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card kpi hover-lift">
      <div className="label" style={{ marginBottom: 10 }}>
        {label}
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
        <span className="v">{value}</span>
        {hint ? <span className="cap">{hint}</span> : null}
      </div>
    </div>
  )
}
