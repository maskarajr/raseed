'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getToken, getUser, setToken, setUser } from '@/lib/api'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', ico: '📊' },
  { href: '/dashboard/orders', label: 'Orders', ico: '🧾' },
  { href: '/dashboard/stock', label: 'Stock', ico: '📦' },
  { href: '/dashboard/salesmen', label: 'Salesmen', ico: '👤' },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getToken()) router.replace('/login')
    else setReady(true)
  }, [router])

  if (!ready) return <div className="center-screen muted">Loading…</div>
  const user = getUser()

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Wholesale<span>.</span></div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={pathname === n.href ? 'active' : ''}>
              <span>{n.ico}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div style={{ position: 'absolute', bottom: 20, left: 14, right: 14 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{user?.name}</div>
          <button
            className="btn ghost"
            style={{ width: '100%' }}
            onClick={() => { setToken(null); setUser(null); router.replace('/login') }}
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
