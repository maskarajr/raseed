import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type LocalProduct } from '../db'
import { getDeviceId } from '../lib/deviceId'
import { syncManager, isOnline } from '../sync/SyncManager'
import { useSyncStore } from '../store/syncStore'

interface Line { product: LocalProduct; qty: number }

export function NewInvoice() {
  const [step, setStep] = useState(0)
  const [products, setProducts] = useState<LocalProduct[]>([])
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<Record<string, Line>>({})
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { db.products.toArray().then(setProducts) }, [])

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  )
  const items = Object.values(lines).filter((l) => l.qty > 0)
  const total = items.reduce((s, l) => s + l.qty * l.product.price, 0)

  function setQty(product: LocalProduct, qty: number) {
    setLines((prev) => ({ ...prev, [product.id]: { product, qty: Math.max(0, qty) } }))
  }

  async function submit() {
    setBusy(true)
    const local_id = `${getDeviceId()}_${crypto.randomUUID()}`
    await db.invoices.add({
      local_id,
      new_customer: { name: custName.trim(), phone: custPhone.trim() },
      customer_label: `${custName.trim()} (${custPhone.trim()})`,
      items: items.map((l) => ({ product_id: l.product.id, product_name: l.product.name, qty: l.qty, unit_price: l.product.price })),
      total_amount: total,
      status: 'draft',
      sync_status: 'pending',
      created_at_device: new Date().toISOString(),
      notes: notes.trim() || undefined,
    })
    await syncManager.refreshPendingCount()
    if (isOnline()) await syncManager.sync()
    else useSyncStore.getState().setStatus('offline')
    setBusy(false)
    setStep(3)
  }

  const canCustomer = custName.trim().length > 0 && custPhone.trim().length >= 7
  const canProducts = items.length > 0

  return (
    <div>
      <div className="topbar">
        <h1>New Invoice</h1>
        <button className="btn secondary small" onClick={() => navigate('/')}>Cancel</button>
      </div>
      <div className="screen">
        <div className="step-dots">
          {[0, 1, 2].map((i) => <span key={i} className={step >= i ? 'active' : ''} />)}
        </div>

        {step === 0 && (
          <div className="card">
            <h2>Customer</h2>
            <label>Name</label>
            <input className="input" data-testid="cust-name" value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Customer name" />
            <label>Phone</label>
            <input className="input" data-testid="cust-phone" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
            <button className="btn" data-testid="to-products" disabled={!canCustomer} onClick={() => setStep(1)}>Next: Products</button>
          </div>
        )}

        {step === 1 && (
          <div className="card">
            <h2>Products</h2>
            <input className="input" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {filtered.map((p) => (
              <div className="list-item between" key={p.id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="muted">Rs {p.price} · {p.available_qty} {p.unit} avail</div>
                </div>
                <div className="qty-ctrl">
                  <button onClick={() => setQty(p, (lines[p.id]?.qty ?? 0) - 1)}>−</button>
                  <span data-testid={`qty-${p.sku}`}>{lines[p.id]?.qty ?? 0}</span>
                  <button data-testid={`add-${p.sku}`} onClick={() => setQty(p, (lines[p.id]?.qty ?? 0) + 1)}>+</button>
                </div>
              </div>
            ))}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn secondary" onClick={() => setStep(0)}>Back</button>
              <button className="btn" data-testid="to-review" disabled={!canProducts} onClick={() => setStep(2)}>Review ({items.length})</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2>Review</h2>
            <div className="muted" style={{ marginBottom: 10 }}>Customer: {custName} · {custPhone}</div>
            {items.map((l) => (
              <div className="list-item between" key={l.product.id}>
                <div>{l.product.name} × {l.qty}</div>
                <div>Rs {l.qty * l.product.price}</div>
              </div>
            ))}
            <div className="between" style={{ marginTop: 12, fontWeight: 700, fontSize: 18 }}>
              <span>Total</span><span data-testid="review-total">Rs {total}</span>
            </div>
            <label style={{ marginTop: 12 }}>Notes (optional)</label>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn" data-testid="submit-invoice" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Submit Invoice'}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>✓</div>
            <h2 data-testid="done-msg">Invoice saved</h2>
            <p className="muted" style={{ marginBottom: 16 }}>
              {isOnline() ? 'Synced to HQ — pending admin approval.' : 'Queued locally. Will sync when back online.'}
            </p>
            <button className="btn" onClick={() => navigate('/invoices')}>View My Invoices</button>
            <button className="btn secondary" style={{ marginTop: 10 }} onClick={() => navigate('/')}>Home</button>
          </div>
        )}
      </div>
    </div>
  )
}
