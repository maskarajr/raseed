const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

let accessToken: string | null = localStorage.getItem('access_token')

export function setAccessToken(token: string | null): void {
  accessToken = token
  if (token) localStorage.setItem('access_token', token)
  else localStorage.removeItem('access_token')
}

export function getAccessToken(): string | null {
  return accessToken
}

interface ReqOptions {
  params?: Record<string, string | undefined>
  body?: unknown
  auth?: boolean
}

async function request<T>(method: string, path: string, opts: ReqOptions = {}): Promise<T> {
  const url = new URL(BASE + path)
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v != null) url.searchParams.set(k, v)
    }
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(url.toString(), {
    method,
    headers,
    credentials: 'include',
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    let detail: any = null
    try { detail = await res.json() } catch { /* noop */ }
    const err = new Error(detail?.error || `HTTP ${res.status}`) as Error & { status?: number; detail?: unknown }
    err.status = res.status
    err.detail = detail
    throw err
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, opts?: ReqOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: ReqOptions) => request<T>('POST', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: ReqOptions) => request<T>('PATCH', path, { ...opts, body }),
}
