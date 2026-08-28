'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, getToken } from '@/lib/api'
import { connectAdminSocket } from '@/lib/socket'

interface Invoice {
  id: string
  status: string
  total_amount: number
  salesman: { name: string }
  customer: { name: string; phone: string }
  items: { product: { name: string }; qty: number }[]
  created_at_device: string
  rejection_reason?: string | null
}

export default function OrdersPage() {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [warning, setWarning] = useState('')

  const load = useCallback(async () => {
    const q = filter === 'all' ? '' : `?status=${filter}`
    const res = await api.get<{ data: Invoice[] }>(`/invoices${q}`)
    setInvoices(res.data)
  }, [filter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    const disconnect = connectAdminSocket(token, (ev) => {
      if (ev.event === 'invoice:created') load()
    })
    return disconnect
  }, [load])

  async function approve(id: string) {
    setBusyId(id); setWarning('')
    try {
      const res = await api.patch<any>(`/invoices/${id}/approve`, {})
      if (res.warnings?.length) setWarning(`Approved with stock warnings: ${res.warnings.join('; ')}`)
      await load()
    } finally { setBusyId(null) }
  }
  async function reject(id: string) {
    const reason = prompt('Rejection reason?')
    if (!reason) return
    setBusyId(id)
    try { await api.patch(`/invoices/${id}/reject`, { reason }); await load() }
    finally { setBusyId(null) }
  }

  return (
    <div>
      <div className="header"><h1>Orders</h1></div>
      {warning && <div className="banner warn" data-testid="approve-warning">{warning}</div>}
      <div className="row" style={{ marginBottom: 16 }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button key={f} className={`btn ${filter === f ? '' : 'ghost'}`} data-testid={`filter-${f}`} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Customer</th><th>Salesman</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan={6} className="muted">No {filter} invoices.</td></tr>}
            {invoices.map((inv) => (
              <tr key={inv.id} data-testid="order-row">
                <td><strong>{inv.customer.name}</strong><br /><span className="muted">{inv.customer.phone}</span></td>
                <td>{inv.salesman.name}</td>
                <td className="muted">{inv.items.map((i) => `${i.product.name}×${i.qty}`).join(', ')}</td>
                <td><strong>Rs {inv.total_amount.toLocaleString()}</strong></td>
                <td><span className={`pill ${inv.status}`} data-testid="order-status">{inv.status}</span></td>
                <td>
                  {inv.status === 'pending' ? (
                    <div className="row">
                      <button className="btn green" data-testid={`approve-${inv.id}`} disabled={busyId === inv.id} onClick={() => approve(inv.id)}>Approve</button>
                      <button className="btn red" data-testid={`reject-${inv.id}`} disabled={busyId === inv.id} onClick={() => reject(inv.id)}>Reject</button>
                    </div>
                  ) : (
                    <span className="muted">{inv.rejection_reason || '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
