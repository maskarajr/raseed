'use client'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token')
}
export function setToken(t: string | null): void {
  if (t) localStorage.setItem('admin_token', t)
  else localStorage.removeItem('admin_token')
}
export function getUser(): any {
  if (typeof window === 'undefined') return null
  return JSON.parse(localStorage.getItem('admin_user') || 'null')
}
export function setUser(u: any): void {
  if (u) localStorage.setItem('admin_user', JSON.stringify(u))
  else localStorage.removeItem('admin_user')
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, {
    method,
    headers,
    credentials: 'include',
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail: any = null
    try { detail = await res.json() } catch { /* noop */ }
    const err = new Error(detail?.error || `HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  base: BASE,
  get: <T>(p: string) => req<T>('GET', p),
  post: <T>(p: string, b?: unknown) => req<T>('POST', p, b),
  patch: <T>(p: string, b?: unknown) => req<T>('PATCH', p, b),
}
