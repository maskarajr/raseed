import type { FastifyInstance } from 'fastify'
import { query } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { normalizePhone } from '../lib/phone.js'
import { getInvoiceById } from '../services/invoice.service.js'
import { CreateCustomerSchema } from '@wholesale/shared'

const CUSTOMER_BASE = `
  SELECT c.id, c.name, c.phone, c.address, c.notes, c.created_at,
         u.id AS creator_id, u.name AS creator_name,
         COALESCE(stats.total_orders, 0)::int AS total_orders,
         COALESCE(stats.total_spent, 0) AS total_spent,
         COALESCE(pay.outstanding, 0) AS outstanding_balance
  FROM customers c
  JOIN users u ON u.id = c.created_by
  LEFT JOIN (
    SELECT customer_id, COUNT(*) AS total_orders,
           SUM(total_amount) FILTER (WHERE status = 'approved') AS total_spent
    FROM invoices GROUP BY customer_id
  ) stats ON stats.customer_id = c.id
  LEFT JOIN (
    SELECT customer_id, SUM(balance) AS outstanding FROM payments GROUP BY customer_id
  ) pay ON pay.customer_id = c.id
  WHERE c.deleted_at IS NULL
`

function mapCustomer(r: any) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    address: r.address,
    notes: r.notes,
    created_by: { id: r.creator_id, name: r.creator_name },
    created_at: r.created_at.toISOString(),
    stats: {
      total_orders: r.total_orders,
      total_spent: Number(r.total_spent),
      outstanding_balance: Number(r.outstanding_balance),
    },
  }
}

export async function customerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/customers', { preHandler: authenticate }, async (req) => {
    const q = req.query as Record<string, string>
    const params: unknown[] = []
    let where = ''
    if (q.search) {
      params.push(`%${q.search}%`)
      where = `AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`
    }
    const page = Math.max(1, Number(q.page ?? 1))
    const limit = Math.min(200, Number(q.limit ?? 50))
    params.push(limit, (page - 1) * limit)
    const { rows } = await query(
      `${CUSTOMER_BASE} ${where} ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    const countRes = await query(
      `SELECT COUNT(*)::int AS n FROM customers c WHERE c.deleted_at IS NULL ${q.search ? 'AND (c.name ILIKE $1 OR c.phone ILIKE $1)' : ''}`,
      q.search ? [`%${q.search}%`] : [],
    )
    return { data: rows.map(mapCustomer), total: countRes.rows[0].n }
  })

  app.get('/customers/:id', { preHandler: authenticate }, async (req, reply) => {
    const id = (req.params as any).id
    const { rows: direct } = await query(`${CUSTOMER_BASE.replace('WHERE c.deleted_at IS NULL', 'WHERE c.deleted_at IS NULL AND c.id = $1')}`, [id])
    const row = direct[0]
    if (!row) return reply.status(404).send({ error: 'NOT_FOUND' })
    const { rows: invRows } = await query('SELECT id FROM invoices WHERE customer_id = $1 ORDER BY created_at_device DESC', [id])
    const invoices = []
    for (const r of invRows) invoices.push(await getInvoiceById(r.id))
    return { ...mapCustomer(row), invoices }
  })

  app.post('/customers', { preHandler: authenticate }, async (req, reply) => {
    const parsed = CreateCustomerSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const user = req.authUser!
    const phone = normalizePhone(parsed.data.phone)
    const existing = await query('SELECT id FROM customers WHERE phone = $1 AND deleted_at IS NULL', [phone])
    if (existing.rows[0]) return reply.status(409).send({ error: 'PHONE_EXISTS', customer_id: existing.rows[0].id })
    const { rows: [created] } = await query(
      `INSERT INTO customers (name, phone, address, notes, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [parsed.data.name, phone, parsed.data.address ?? null, parsed.data.notes ?? null, user.id],
    )
    const { rows: direct } = await query(`${CUSTOMER_BASE.replace('WHERE c.deleted_at IS NULL', 'WHERE c.deleted_at IS NULL AND c.id = $1')}`, [created.id])
    return reply.status(201).send(mapCustomer(direct[0]))
  })
}
