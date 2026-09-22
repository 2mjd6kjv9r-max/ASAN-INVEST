import { useAuth, useIsStaff } from '@/app/providers'
import { Alert } from '@/components/ui'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <p className="p-6 text-sm text-muted">…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const staff = useIsStaff()
  const { ready, user } = useAuth()
  if (!ready) return <p className="p-6 text-sm text-muted">…</p>
  if (!user) return <Navigate to="/login" replace />
  if (!staff) {
    return (
      <div className="p-6">
        <Alert tone="error">This area is limited to operators.</Alert>
      </div>
    )
  }
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  const staff = useIsStaff()
  if (!ready) return children
  if (user) return <Navigate to={staff ? '/backoffice' : '/cabinet'} replace />
  return children
}
