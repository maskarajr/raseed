import type { FastifyInstance } from 'fastify'
import { query, withTransaction } from '../db.js'
import { requireRole } from '../auth.js'
import { hub } from '../ws.js'
import { processInvoice, getInvoiceById } from '../services/invoice.service.js'
import { SyncPushSchema } from '@wholesale/shared'

const PRODUCT_SELECT = `
  SELECT id, name, sku, category, unit, price, stock_qty, reserved_qty,
         (stock_qty - reserved_qty) AS available_qty, reorder_threshold, active
  FROM products WHERE deleted_at IS NULL
`

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  app.post('/sync/push', { preHandler: requireRole('salesman', 'admin') }, async (req, reply) => {
    const parsed = SyncPushSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const user = req.authUser!
    const { device_id, records } = parsed.data

    const processed = []
    for (const record of records) {
      const result = await withTransaction((client) => processInvoice(client, record.payload, user.id))
      processed.push(result)
      if (result.status === 'created' && result.server_id) {
        const invoice = await getInvoiceById(result.server_id)
        if (invoice) {
          hub.emitAdmin({
            event: 'invoice:created',
            data: {
              invoice_id: invoice.id,
              salesman: invoice.salesman,
              customer: { id: invoice.customer.id, name: invoice.customer.name },
              total_amount: invoice.total_amount,
              item_count: invoice.items.length,
            },
          })
        }
      }
    }

    const hasError = processed.some((p) => p.status === 'conflict')
    await query(
      'INSERT INTO sync_log (device_id, salesman_id, record_count, status) VALUES ($1,$2,$3,$4)',
      [device_id, user.id, records.length, hasError ? 'partial' : 'success'],
    )
    return { processed }
  })

  app.get('/sync/pull', { preHandler: requireRole('salesman', 'admin') }, async (req) => {
    const user = req.authUser!
    const since = (req.query as any).since as string | undefined

    const products = (await query(since ? `${PRODUCT_SELECT} AND updated_at > $1` : PRODUCT_SELECT, since ? [since] : [])).rows

    const customerParams: unknown[] = [user.id]
    let customerSql = `
      SELECT c.id, c.name, c.phone, c.address, c.notes, c.created_at,
             u.id AS creator_id, u.name AS creator_name
      FROM customers c JOIN users u ON u.id = c.created_by
      WHERE c.deleted_at IS NULL AND c.created_by = $1`
    if (since) {
      customerParams.push(since)
      customerSql += ` AND c.updated_at > $2`
    }
    const customers = (await query(customerSql, customerParams)).rows.map((r: any) => ({
      id: r.id, name: r.name, phone: r.phone, address: r.address, notes: r.notes,
      created_by: { id: r.creator_id, name: r.creator_name }, created_at: r.created_at.toISOString(),
    }))

    const updParams: unknown[] = [user.id]
    let updSql = `SELECT id AS server_id, local_id, status, rejection_reason FROM invoices WHERE salesman_id = $1`
    if (since) {
      updParams.push(since)
      updSql += ` AND updated_at > $2`
    }
    const invoice_updates = (await query(updSql, updParams)).rows.map((r: any) => ({
      local_id: r.local_id, server_id: r.server_id, status: r.status, rejection_reason: r.rejection_reason,
    }))

    return { products, customers, invoice_updates, pulled_at: new Date().toISOString() }
  })
}
