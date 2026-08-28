'use client'

// Native WebSocket bridge to the API's /ws endpoint (raw ws, room-based).
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

export function connectAdminSocket(token: string, onEvent: (ev: any) => void): () => void {
  let closed = false
  let ws: WebSocket | null = null

  function open() {
    ws = new WebSocket(`${WS_URL}/ws`)
    ws.onopen = () => ws?.send(JSON.stringify({ type: 'authenticate', token }))
    ws.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)) } catch { /* noop */ }
    }
    ws.onclose = () => {
      if (!closed) setTimeout(open, 1500)
    }
  }
  open()

  return () => {
    closed = true
    ws?.close()
  }
}
