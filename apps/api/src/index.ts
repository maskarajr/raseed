import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import websocket from '@fastify/websocket'
import type { WebSocket } from 'ws'
import { env } from './env.js'
import { pool, startLowStockListener } from './db.js'
import { hub } from './ws.js'
import { authRoutes } from './routes/auth.js'
import { productRoutes } from './routes/products.js'
import { customerRoutes } from './routes/customers.js'
import { invoiceRoutes } from './routes/invoices.js'
import { syncRoutes } from './routes/sync.js'
import { analyticsRoutes } from './routes/analytics.js'
import { salesmenRoutes } from './routes/salesmen.js'

const app = Fastify({ logger: { level: 'info' } })

await app.register(cors, { origin: true, credentials: true })
await app.register(cookie)
await app.register(jwt, { secret: env.JWT_SECRET })
await app.register(websocket)

app.get('/health', async () => {
  await pool.query('SELECT 1')
  return { status: 'ok', ts: new Date().toISOString() }
})

// WebSocket endpoint. Client sends {"type":"authenticate","token":"<jwt>"}.
app.register(async (scoped) => {
  scoped.get('/ws', { websocket: true }, (conn: any) => {
    const socket: WebSocket = conn.socket ?? conn
    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'authenticate' && typeof msg.token === 'string') {
          const payload = app.jwt.verify<any>(msg.token)
          if (payload.role === 'admin') hub.join('admin', socket)
          else hub.join(`salesman:${payload.id}`, socket)
          socket.send(JSON.stringify({ event: 'ws:authenticated', data: { role: payload.role } }))
        }
      } catch {
        socket.send(JSON.stringify({ event: 'ws:error', data: { message: 'auth failed' } }))
      }
    })
    socket.on('close', () => hub.leaveAll(socket))
    socket.on('error', () => hub.leaveAll(socket))
  })
})

await app.register(authRoutes)
await app.register(productRoutes)
await app.register(customerRoutes)
await app.register(invoiceRoutes)
await app.register(syncRoutes)
await app.register(analyticsRoutes)
await app.register(salesmenRoutes)

await startLowStockListener((payload) => {
  hub.emitAdmin({
    event: 'stock:low',
    data: {
      product_id: payload.product_id,
      name: payload.name,
      available_qty: payload.available_qty,
      threshold: payload.threshold,
    },
  })
})

try {
  await app.listen({ port: env.API_PORT, host: env.API_HOST })
  app.log.info(`API listening on http://${env.API_HOST}:${env.API_PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
