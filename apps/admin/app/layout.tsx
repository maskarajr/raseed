import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Wholesale Admin',
  description: 'HQ admin dashboard for the wholesale sales system',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
