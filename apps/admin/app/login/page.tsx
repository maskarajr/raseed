'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, setToken, setUser } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@wholesale.local')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await api.post<any>('/auth/login', { email, password })
      if (res.user.role !== 'admin') { setError('Not an admin account'); setBusy(false); return }
      setToken(res.access_token)
      setUser(res.user)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message === 'INVALID_CREDENTIALS' ? 'Invalid email or password' : 'Login failed')
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">W<span>.</span></div>
        <p className="muted" style={{ textAlign: 'center', marginBottom: 16 }}>Wholesale Admin</p>
        {error && <div className="banner error" data-testid="login-error">{error}</div>}
        <label>Email</label>
        <input className="input" data-testid="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input className="input" data-testid="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn green" data-testid="login-btn" style={{ width: '100%', marginTop: 20, padding: 12 }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
