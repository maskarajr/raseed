import { create } from 'zustand'
import { api, setAccessToken } from '../lib/api'

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  mustChangePassword: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  mustChangePassword: false,
  login: async (email, password) => {
    const res = await api.post<any>('/auth/login', { email, password }, { auth: false })
    setAccessToken(res.access_token)
    localStorage.setItem('auth_user', JSON.stringify(res.user))
    set({ user: res.user, mustChangePassword: res.must_change_password })
  },
  logout: () => {
    api.post('/auth/logout').catch(() => {})
    setAccessToken(null)
    localStorage.removeItem('auth_user')
    set({ user: null, mustChangePassword: false })
  },
  hydrate: () => {
    const u = JSON.parse(localStorage.getItem('auth_user') || 'null')
    set({ user: u })
  },
}))
