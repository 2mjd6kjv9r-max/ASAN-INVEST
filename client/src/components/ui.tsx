import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, type LinkProps } from 'react-router-dom'

const buttonClass = {
  primary:
    'bg-navy text-white hover:bg-navy-800 disabled:opacity-50 border border-navy',
  secondary: 'bg-white text-navy border border-navy hover:bg-navy-50 disabled:opacity-50',
  ghost: 'bg-transparent text-navy hover:bg-navy-50 disabled:opacity-50',
  danger: 'bg-white text-red-800 border border-red-800 hover:bg-red-50 disabled:opacity-50',
}

export function Button({
  variant = 'primary',
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonClass; loading?: boolean }) {
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold', buttonClass[variant], className)}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: LinkProps & { variant?: keyof typeof buttonClass }) {
  return <Link className={cn('inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold no-underline', buttonClass[variant], className)} {...props} />
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
      <span className="block text-sm font-medium text-navy">{label}</span>
      {children}
      {hint ? <span className="block text-sm text-muted">{hint}</span> : null}
      {error ? (
        <span role="alert" className="block text-sm text-red-800">
          {error}
        </span>
      ) : null}
    </label>
  )
}

const control = 'w-full rounded-sm border border-line bg-white px-3 py-2 text-ink'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, props.className)} {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, props.className)} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-28', props.className)} {...props} />
}

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'warning' | 'success'
  children: ReactNode
}) {
  const map = {
    info: 'border-navy-100 bg-navy-50 text-navy',
    error: 'border-red-200 bg-red-50 text-red-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-950',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }
  return (
    <div role="status" className={cn('rounded-sm border px-3 py-2 text-sm', map[tone])}>
      {children}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-sm border border-dashed border-line bg-white px-6 py-10 text-center">
      <p className="font-medium text-navy">{title}</p>
      {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="rounded-sm border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-900">{message}</p>
      {onRetry ? (
        <button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-sm bg-navy-100', className)} aria-hidden="true" />
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6 space-y-2">
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      {subtitle ? <p className="max-w-3xl text-muted">{subtitle}</p> : null}
    </header>
  )
}
