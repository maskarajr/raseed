import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { query } from '../db.js'
import { requireRole } from '../auth.js'
import { getInvoiceById } from '../services/invoice.service.js'
import { CreateSalesmanSchema, UpdateSalesmanSchema } from '@wholesale/shared'

const APP_URL = 'https://app.yourshop.com'

function tempPassword(): string {
  return randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) + 'A1'
}

const STATS_SELECT = `
  COUNT(i.id)::int AS total_invoices,
  COUNT(i.id) FILTER (WHERE i.status = 'approved')::int AS approved_invoices,
  COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'approved'), 0) AS total_revenue,
  COALESCE(AVG(i.total_amount) FILTER (WHERE i.status = 'approved'), 0) AS avg_order_value
`

export async function salesmenRoutes(app: FastifyInstance): Promise<void> {
  app.get('/salesmen', { preHandler: requireRole('admin') }, async () => {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.active, u.must_change_password,
              u.last_active_at, u.created_at, ${STATS_SELECT}
       FROM users u LEFT JOIN invoices i ON i.salesman_id = u.id
       WHERE u.role = 'salesman' GROUP BY u.id ORDER BY total_revenue DESC`,
    )
    return rows.map((r: any) => ({
      id: r.id, name: r.name, email: r.email, role: r.role, phone: r.phone, active: r.active,
      must_change_password: r.must_change_password,
      last_active_at: r.last_active_at ? r.last_active_at.toISOString() : null,
      created_at: r.created_at.toISOString(),
      stats: {
        total_invoices: r.total_invoices, approved_invoices: r.approved_invoices,
        total_revenue: Number(r.total_revenue), avg_order_value: Number(r.avg_order_value),
        last_active_at: r.last_active_at ? r.last_active_at.toISOString() : null,
      },
    }))
  })

  app.get('/salesmen/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = (req.params as any).id
    const { rows: [r] } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.active, u.must_change_password,
              u.last_active_at, u.created_at, ${STATS_SELECT}
       FROM users u LEFT JOIN invoices i ON i.salesman_id = u.id
       WHERE u.id = $1 AND u.role = 'salesman' GROUP BY u.id`,
      [id],
    )
    if (!r) return reply.status(404).send({ error: 'NOT_FOUND' })
    const { rows: recent } = await query(
      'SELECT id FROM invoices WHERE salesman_id = $1 ORDER BY created_at_device DESC LIMIT 10',
      [id],
    )
    const recent_invoices = []
    for (const row of recent) recent_invoices.push(await getInvoiceById(row.id))
    return {
      id: r.id, name: r.name, email: r.email, role: r.role, phone: r.phone, active: r.active,
      must_change_password: r.must_change_password,
      last_active_at: r.last_active_at ? r.last_active_at.toISOString() : null,
      created_at: r.created_at.toISOString(),
      stats: {
        total_invoices: r.total_invoices, approved_invoices: r.approved_invoices,
        total_revenue: Number(r.total_revenue), avg_order_value: Number(r.avg_order_value),
        last_active_at: r.last_active_at ? r.last_active_at.toISOString() : null,
      },
      recent_invoices,
    }
  })

  app.post('/salesmen', { preHandler: requireRole('admin') }, async (req, reply) => {
    const parsed = CreateSalesmanSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const { name, email, password, phone } = parsed.data
    const hash = await bcrypt.hash(password, 10)
    try {
      const { rows: [created] } = await query(
        `INSERT INTO users (name, email, password_hash, role, phone, must_change_password)
         VALUES ($1,$2,$3,'salesman',$4,TRUE) RETURNING id, name, email`,
        [name, email, hash, phone ?? null],
      )
      return reply.status(201).send({
        id: created.id, name: created.name, email: created.email, role: 'salesman',
        must_change_password: true,
        onboarding: { app_url: APP_URL, qr_payload: APP_URL },
      })
    } catch (e: any) {
      if (e.code === '23505') return reply.status(409).send({ error: 'EMAIL_EXISTS' })
      throw e
    }
  })

  app.patch('/salesmen/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const parsed = UpdateSalesmanSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const id = (req.params as any).id
    const fields = parsed.data as Record<string, unknown>
    const keys = Object.keys(fields)
    if (keys.length === 0) return reply.status(400).send({ error: 'NO_FIELDS' })
    const set = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const { rowCount } = await query(
      `UPDATE users SET ${set} WHERE id = $1 AND role = 'salesman'`,
      [id, ...keys.map((k) => fields[k])],
    )
    if (!rowCount) return reply.status(404).send({ error: 'NOT_FOUND' })
    return { ok: true }
  })

  app.post('/salesmen/:id/reset-password', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = (req.params as any).id
    const admin = req.authUser!
    const temp = tempPassword()
    const hash = await bcrypt.hash(temp, 10)
    const { rowCount } = await query(
      `UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE id = $2 AND role = 'salesman'`,
      [hash, id],
    )
    if (!rowCount) return reply.status(404).send({ error: 'NOT_FOUND' })
    await query('INSERT INTO password_reset_log (user_id, reset_by) VALUES ($1,$2)', [id, admin.id])
    return { temp_password: temp }
  })
}
