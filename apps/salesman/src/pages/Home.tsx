import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSyncStore } from '../store/syncStore'
import { SyncBadge } from '../components/SyncBadge'
import { syncManager, isOnline, setForcedOffline } from '../sync/SyncManager'
import { db } from '../db'

export function Home() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { status } = useSyncStore()
  const [productCount, setProductCount] = useState(0)
  const [customerCount, setCustomerCount] = useState(0)
  const [offline, setOffline] = useState(!isOnline())
  const navigate = useNavigate()

  async function refresh() {
    setProductCount(await db.products.count())
    setCustomerCount(await db.customers.count())
  }
  useEffect(() => { refresh() }, [status])

  function toggleOffline() {
    const next = !offline
    setOffline(next)
    setForcedOffline(next)
    if (!next) syncManager.sync()
  }

  return (
    <div>
      <div className="topbar">
        <h1>Hi, {user?.name?.split(' ')[0] ?? 'Salesman'}</h1>
        <button className="btn secondary small" data-testid="logout" onClick={() => { logout(); navigate('/login') }}>Logout</button>
      </div>
      <div className="screen">
        <div className="card"><SyncBadge /></div>

        <div className="card">
          <div className="between">
            <div>
              <div style={{ fontWeight: 700 }}>Network</div>
              <div className="muted">{offline ? 'Simulated offline — invoices queue locally' : 'Online — invoices sync instantly'}</div>
            </div>
            <button className="btn secondary small" data-testid="toggle-offline" onClick={toggleOffline}>
              {offline ? 'Go online' : 'Go offline'}
            </button>
          </div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="card" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800 }} data-testid="product-count">{productCount}</div>
            <div className="muted">Products</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800 }} data-testid="customer-count">{customerCount}</div>
            <div className="muted">Customers</div>
          </div>
        </div>

        <button className="btn" data-testid="new-invoice-btn" onClick={() => navigate('/new')}>+ New Invoice</button>
      </div>
    </div>
  )
}
