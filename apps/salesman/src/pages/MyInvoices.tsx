import { useEffect, useState } from 'react'
import { db, type LocalInvoice } from '../db'
import { useSyncStore } from '../store/syncStore'
import { SyncBadge } from '../components/SyncBadge'

export function MyInvoices() {
  const [invoices, setInvoices] = useState<LocalInvoice[]>([])
  const { status } = useSyncStore()

  async function refresh() {
    const all = await db.invoices.orderBy('created_at_device').reverse().toArray()
    setInvoices(all)
  }
  useEffect(() => { refresh() }, [status])

  return (
    <div>
      <div className="topbar"><h1>My Invoices</h1></div>
      <div className="screen">
        <div className="card"><SyncBadge /></div>
        {invoices.length === 0 && <p className="muted">No invoices yet. Create one from Home.</p>}
        {invoices.map((inv) => {
          const statusPill = inv.sync_status === 'pending' ? 'offline'
            : inv.status === 'approved' ? 'approved'
            : inv.status === 'rejected' ? 'rejected'
            : inv.sync_status === 'conflict' ? 'rejected' : 'pending'
          const label = inv.sync_status === 'pending' ? 'Not synced'
            : inv.sync_status === 'conflict' ? 'Conflict' : inv.status
          return (
            <div className="card" key={inv.local_id} data-testid="invoice-row">
              <div className="between">
                <div style={{ fontWeight: 600 }}>{inv.customer_label}</div>
                <span className={`pill ${statusPill}`} data-testid="invoice-status">{label}</span>
              </div>
              <div className="muted" style={{ margin: '6px 0' }}>
                {inv.items.length} item(s) · {new Date(inv.created_at_device).toLocaleString()}
              </div>
              <div className="between">
                <span className="muted">{inv.items.map((i) => `${i.product_name}×${i.qty}`).join(', ')}</span>
                <strong>Rs {inv.total_amount}</strong>
              </div>
              {inv.rejection_reason && <div className="banner error" style={{ marginTop: 8 }}>Rejected: {inv.rejection_reason}</div>}
              {inv.conflict_reason && <div className="banner error" style={{ marginTop: 8 }}>Conflict: {inv.conflict_reason}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
