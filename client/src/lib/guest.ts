import { api } from '@/lib/api'

const KEY = 'asan-invest.guest-token'

export function readGuestToken() {
  try {
    return window.sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function writeGuestToken(token: string) {
  try {
    window.sessionStorage.setItem(KEY, token)
  } catch {
    /* ignore */
  }
}

export function clearGuestToken() {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

const ANSWERS_KEY = 'asan-invest.guest-answers'

export function readGuestAnswers(): Record<string, unknown> {
  try {
    const raw = window.sessionStorage.getItem(ANSWERS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function writeGuestAnswers(answers: Record<string, unknown>) {
  try {
    window.sessionStorage.setItem(ANSWERS_KEY, JSON.stringify(answers))
  } catch {
    /* ignore */
  }
}

export async function ensureGuestToken(): Promise<string | null> {
  const existing = readGuestToken()
  if (existing) return existing
  try {
    const guest = await api.createGuest()
    writeGuestToken(guest.token)
    return guest.token
  } catch {
    return null
  }
}
