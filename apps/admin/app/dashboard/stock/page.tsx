'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Product {
  id: string
  name: string
  sku: string
  category?: string | null
  unit: string
  price: number
  stock_qty: number
  reserved_qty: number
  available_qty: number
  reorder_threshold?: number | null
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    const res = await api.get<{ data: Product[] }>('/products')
    setProducts(res.data)
  }
  useEffect(() => { load() }, [])

  async function receive(p: Product) {
    const raw = prompt(`Receive goods for ${p.name} — quantity to add:`, '50')
    if (!raw) return
    const adjustment = parseInt(raw, 10)
    if (Number.isNaN(adjustment) || adjustment === 0) return
    setBusyId(p.id)
    try { await api.patch(`/products/${p.id}/stock`, { adjustment, reason: 'Received goods' }); await load() }
    finally { setBusyId(null) }
  }

  return (
    <div>
      <div className="header"><h1>Stock</h1></div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Product</th><th>SKU</th><th>Price</th><th>In stock</th><th>Reserved</th><th>Available</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const low = p.reorder_threshold != null && p.available_qty <= p.reorder_threshold
              return (
                <tr key={p.id} data-testid="stock-row">
                  <td><strong>{p.name}</strong><br /><span className="muted">{p.category}</span></td>
                  <td className="muted">{p.sku}</td>
                  <td>Rs {p.price.toLocaleString()}</td>
                  <td data-testid={`stock-${p.sku}`}>{p.stock_qty}</td>
                  <td>{p.reserved_qty}</td>
                  <td><strong data-testid={`avail-${p.sku}`}>{p.available_qty}</strong> {p.unit}</td>
                  <td><span className={`pill ${low ? 'low' : 'ok'}`}>{low ? 'Low' : 'OK'}</span></td>
                  <td><button className="btn ghost" disabled={busyId === p.id} onClick={() => receive(p)}>Receive</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
