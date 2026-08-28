import type { FastifyInstance } from 'fastify'
import { query, withTransaction } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { CreateProductSchema, UpdateProductSchema, StockAdjustmentSchema } from '@wholesale/shared'

const PRODUCT_SELECT = `
  SELECT id, name, sku, category, unit, price, stock_qty, reserved_qty,
         (stock_qty - reserved_qty) AS available_qty, reorder_threshold, active
  FROM products
`

export async function productRoutes(app: FastifyInstance): Promise<void> {
  app.get('/products', { preHandler: authenticate }, async (req) => {
    const q = req.query as Record<string, string>
    const clauses = ['deleted_at IS NULL']
    const params: unknown[] = []
    if (q.search) {
      params.push(`%${q.search}%`)
      clauses.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length})`)
    }
    if (q.category) {
      params.push(q.category)
      clauses.push(`category = $${params.length}`)
    }
    let sql = `${PRODUCT_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY name ASC`
    const { rows } = await query(sql, params)
    let data = rows
    if (q.low_stock === 'true') {
      data = rows.filter((p: any) => p.reorder_threshold != null && p.available_qty <= p.reorder_threshold)
    }
    return { data }
  })

  app.post('/products', { preHandler: requireRole('admin') }, async (req, reply) => {
    const parsed = CreateProductSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const p = parsed.data
    try {
      const { rows: [created] } = await query(
        `INSERT INTO products (name, sku, category, unit, price, stock_qty, reorder_threshold)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [p.name, p.sku, p.category ?? null, p.unit, p.price, p.stock_qty, p.reorder_threshold ?? null],
      )
      const { rows: [full] } = await query(`${PRODUCT_SELECT} WHERE id = $1`, [created.id])
      return reply.status(201).send(full)
    } catch (e: any) {
      if (e.code === '23505') return reply.status(409).send({ error: 'SKU_EXISTS' })
      throw e
    }
  })

  app.patch('/products/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const parsed = UpdateProductSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const id = (req.params as any).id
    const fields = parsed.data as Record<string, unknown>
    const keys = Object.keys(fields)
    if (keys.length === 0) return reply.status(400).send({ error: 'NO_FIELDS' })
    const set = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const { rowCount } = await query(`UPDATE products SET ${set} WHERE id = $1 AND deleted_at IS NULL`, [id, ...keys.map((k) => fields[k])])
    if (!rowCount) return reply.status(404).send({ error: 'NOT_FOUND' })
    const { rows: [full] } = await query(`${PRODUCT_SELECT} WHERE id = $1`, [id])
    return full
  })

  app.patch('/products/:id/stock', { preHandler: requireRole('admin') }, async (req, reply) => {
    const parsed = StockAdjustmentSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const id = (req.params as any).id
    const user = req.authUser!
    const { adjustment, reason } = parsed.data
    try {
      const result = await withTransaction(async (client) => {
        const { rows: [current] } = await client.query(
          'SELECT stock_qty FROM products WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
          [id],
        )
        if (!current) return null
        const newQty = current.stock_qty + adjustment
        if (newQty < 0) throw new Error('NEGATIVE_STOCK')
        await client.query('UPDATE products SET stock_qty = $1 WHERE id = $2', [newQty, id])
        await client.query(
          'INSERT INTO stock_adjustments (product_id, adjusted_by, adjustment, reason) VALUES ($1,$2,$3,$4)',
          [id, user.id, adjustment, reason],
        )
        return newQty
      })
      if (result === null) return reply.status(404).send({ error: 'NOT_FOUND' })
      return { stock_qty: result }
    } catch (e: any) {
      if (e.message === 'NEGATIVE_STOCK') return reply.status(400).send({ error: 'NEGATIVE_STOCK' })
      throw e
    }
  })
}
