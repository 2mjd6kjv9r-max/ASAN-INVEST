import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, isApiError, setAccessToken } from '@/lib/api'
import { clearGuestToken, readGuestToken, writeGuestToken } from '@/lib/guest'
import type { User } from '@/lib/types'
import { isInternal } from '@/lib/types'

type AuthContextValue = {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<{ twoFactor?: string; user?: User }>
  verify2fa: (challengeId: string, code: string) => Promise<User>
  register: (input: {
    email: string
    password: string
    locale: string
    personalData: boolean
  }) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } },
})

function applySession(user: User | null, token?: string) {
  if (user && token) {
    setAccessToken(token)
    return user
  }
  if (!user) setAccessToken(null)
  return user
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!readGuestToken()) {
          const guest = await api.createGuest()
          writeGuestToken(guest.token)
        }
      } catch {
        /* guest session is optional if the API is down */
      }
      try {
        const refreshed = (await api.refresh()) as { accessToken: string; user: User }
        if (!cancelled && refreshed?.accessToken) {
          setAccessToken(refreshed.accessToken)
          setUser(refreshed.user)
        }
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          setAccessToken(null)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = (await api.login({ email, password })) as {
      twoFactorRequired?: boolean
      challengeId?: string
      accessToken?: string
      user?: User
    }
    if (result.twoFactorRequired && result.challengeId) return { twoFactor: result.challengeId }
    const next = applySession(result.user ?? null, result.accessToken)
    setUser(next)
    await queryClient.invalidateQueries()
    return { user: next ?? undefined }
  }, [])

  const verify2fa = useCallback(async (challengeId: string, code: string) => {
    const result = (await api.verify2fa({ challengeId, code })) as { accessToken: string; user: User }
    const next = applySession(result.user, result.accessToken)
    setUser(next)
    await queryClient.invalidateQueries()
    return next!
  }, [])

  const register = useCallback(
    async (input: { email: string; password: string; locale: string; personalData: boolean }) => {
      const result = (await api.register({
        email: input.email,
        password: input.password,
        locale: input.locale,
        guestSessionToken: readGuestToken() ?? undefined,
        consents: { version: 'phase1', personalData: input.personalData },
      })) as { accessToken: string; user: User }
      const next = applySession(result.user, result.accessToken)
      setUser(next)
      clearGuestToken()
      await queryClient.invalidateQueries()
      return next!
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      applySession(null)
      setUser(null)
      queryClient.clear()
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const me = (await api.me()) as User
    setUser(me)
  }, [])

  const value = useMemo(
    () => ({ user, ready, login, verify2fa, register, logout, refreshUser }),
    [user, ready, login, verify2fa, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AppProviders')
  return ctx
}

export function useIsStaff() {
  const { user } = useAuth()
  return Boolean(user && isInternal(user.roles))
}
