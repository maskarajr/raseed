import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import './styles.css'
import { useAuthStore } from './store/authStore'
import { syncManager } from './sync/SyncManager'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { NewInvoice } from './pages/NewInvoice'
import { MyInvoices } from './pages/MyInvoices'

function TabBar() {
  const loc = useLocation()
  const tabs = [
    { to: '/', ico: '🏠', label: 'Home' },
    { to: '/new', ico: '➕', label: 'New' },
    { to: '/invoices', ico: '🧾', label: 'Invoices' },
  ]
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={loc.pathname === t.to ? 'active' : ''}>
          <span className="ico">{t.ico}</span>{t.label}
        </NavLink>
      ))}
    </nav>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      {children}
      <TabBar />
    </>
  )
}

function App() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    syncManager.refreshPendingCount()
    syncManager.sync()
    const onOnline = () => syncManager.sync()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [user])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Home /></Protected>} />
        <Route path="/new" element={<Protected><NewInvoice /></Protected>} />
        <Route path="/invoices" element={<Protected><MyInvoices /></Protected>} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
