import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { syncManager } from '../sync/SyncManager'

export function Login() {
  const [email, setEmail] = useState('ali@shop.com')
  const [password, setPassword] = useState('salesman123')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      await syncManager.sync()
      navigate('/')
    } catch (err: any) {
      setError(err.message === 'INVALID_CREDENTIALS' ? 'Invalid email or password' : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <div className="logo">W</div>
      <p className="muted" style={{ marginBottom: 24 }}>Wholesale Salesman</p>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 340 }}>
        {error && <div className="banner error" data-testid="login-error">{error}</div>}
        <label>Email</label>
        <input className="input" data-testid="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />
        <label>Password</label>
        <input className="input" data-testid="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn" data-testid="login-btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </div>
  )
}
