'use client'

import { useEffect, useState } from 'react'
import { api, getToken } from '@/lib/api'
import { connectAdminSocket } from '@/lib/socket'

interface Summary {
  pending_approvals: number
  total_revenue: number
  low_stock_count: number
  customer_count: number
}
interface Toast { id: number; text: string }

export default function DashboardHome() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [liveConnected, setLiveConnected] = useState(false)

  async function loadSummary() {
    try { setSummary(await api.get<Summary>('/analytics/summary')) } catch { /* noop */ }
  }

  useEffect(() => {
    loadSummary()
    const token = getToken()
    if (!token) return
    const disconnect = connectAdminSocket(token, (ev) => {
      if (ev.event === 'ws:authenticated') setLiveConnected(true)
      if (ev.event === 'invoice:created') {
        const t: Toast = { id: Date.now() + Math.random(), text: `New order from ${ev.data.salesman.name} · Rs ${ev.data.total_amount}` }
        setToasts((prev) => [...prev, t])
        setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 6000)
        loadSummary()
      }
    })
    const iv = setInterval(loadSummary, 15000)
    return () => { disconnect(); clearInterval(iv) }
  }, [])

  return (
    <div>
      <div className="header">
        <h1>Dashboard</h1>
        <span className="muted" data-testid="live-status">
          {liveConnected ? <><span className="live-dot" />Live</> : 'Connecting…'}
        </span>
      </div>

      <div className="grid">
        <div className="stat"><div className="val" data-testid="stat-pending">{summary?.pending_approvals ?? '—'}</div><div className="lbl">Pending approvals</div></div>
        <div className="stat"><div className="val" data-testid="stat-revenue">Rs {summary?.total_revenue?.toLocaleString() ?? '—'}</div><div className="lbl">Approved revenue</div></div>
        <div className="stat"><div className="val" data-testid="stat-lowstock">{summary?.low_stock_count ?? '—'}</div><div className="lbl">Low stock items</div></div>
        <div className="stat"><div className="val" data-testid="stat-customers">{summary?.customer_count ?? '—'}</div><div className="lbl">Customers</div></div>
      </div>

      <div className="card">
        <h2>Live order feed</h2>
        <p className="muted">
          Real-time updates stream here as salesmen sync invoices. Approve them on the <a href="/dashboard/orders" style={{ color: 'var(--blue)' }}>Orders</a> page.
        </p>
      </div>

      <div className="toast-wrap">
        {toasts.map((t) => <div className="toast" key={t.id} data-testid="live-toast">🔔 {t.text}</div>)}
      </div>
    </div>
  )
}
