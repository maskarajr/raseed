'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '@/lib/api'

interface Salesman {
  id: string; name: string; email: string; phone?: string | null; active: boolean
  stats: { total_revenue: number; approved_invoices: number }
}
interface Created { name: string; email: string; onboarding: { app_url: string } }

export default function SalesmenPage() {
  const [list, setList] = useState<Salesman[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [created, setCreated] = useState<Created | null>(null)
  const [tempPassword, setTempPassword] = useState('')
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')

  async function load() { setList(await api.get<Salesman[]>('/salesmen')) }
  useEffect(() => { load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError('')
    try {
      const res = await api.post<Created>('/salesmen', { name, email, phone: phone || undefined, password })
      setCreated(res)
      setTempPassword(password)
      setQr(await QRCode.toDataURL(res.onboarding.app_url))
      setShowForm(false)
      setName(''); setEmail(''); setPhone(''); setPassword('')
      await load()
    } catch (err: any) {
      setError(err.message === 'EMAIL_EXISTS' ? 'Email already in use' : 'Failed to create salesman')
    }
  }

  async function toggleActive(s: Salesman) {
    await api.patch(`/salesmen/${s.id}`, { active: !s.active }); await load()
  }

  return (
    <div>
      <div className="header">
        <h1>Salesmen</h1>
        <button className="btn" data-testid="add-salesman" onClick={() => { setShowForm(true); setCreated(null) }}>+ Add Salesman</button>
      </div>

      {error && <div className="banner error">{error}</div>}

      {showForm && (
        <form className="card" onSubmit={create} style={{ maxWidth: 420 }}>
          <h2>Add Salesman</h2>
          <label>Name</label>
          <input className="input" data-testid="sm-name" value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Email</label>
          <input className="input" data-testid="sm-email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label>Temp password (min 6)</label>
          <input className="input" data-testid="sm-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn green" data-testid="sm-create" type="submit">Create &amp; Get Link</button>
          </div>
        </form>
      )}

      {created && (
        <div className="card" data-testid="credential-card" style={{ maxWidth: 420, borderColor: 'var(--green)' }}>
          <h2>Salesman created ✓</h2>
          <p className="muted">Share these with {created.name}:</p>
          <p style={{ margin: '10px 0' }}>App URL: <strong>{created.onboarding.app_url}</strong></p>
          <p>Email: <strong>{created.email}</strong></p>
          <p>Temp password: <strong>{tempPassword}</strong></p>
          {qr && <img src={qr} alt="app url qr" width={140} height={140} style={{ marginTop: 12, borderRadius: 8 }} />}
          <p className="muted" style={{ marginTop: 10 }}>Must change password on first login.</p>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Revenue</th><th>Orders</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="muted">No salesmen yet.</td></tr>}
            {list.map((s) => (
              <tr key={s.id} data-testid="salesman-row">
                <td><strong>{s.name}</strong></td>
                <td className="muted">{s.email}</td>
                <td className="muted">{s.phone || '—'}</td>
                <td><span className={`pill ${s.active ? 'ok' : 'rejected'}`}>{s.active ? 'Active' : 'Inactive'}</span></td>
                <td>Rs {s.stats.total_revenue.toLocaleString()}</td>
                <td>{s.stats.approved_invoices}</td>
                <td><button className="btn ghost" onClick={() => toggleActive(s)}>{s.active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
