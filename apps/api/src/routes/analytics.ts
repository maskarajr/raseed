import type { FastifyInstance } from 'fastify'
import { query } from '../db.js'
import { requireRole } from '../auth.js'

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/analytics/sales', { preHandler: requireRole('admin') }, async (req) => {
    const q = req.query as Record<string, string>
    const groupBy = ['day', 'week', 'month'].includes(q.group_by) ? q.group_by : 'day'
    const params: unknown[] = []
    const conds = [`status = 'approved'`]
    if (q.from) { params.push(q.from); conds.push(`approved_at >= $${params.length}`) }
    if (q.to) { params.push(q.to); conds.push(`approved_at <= $${params.length}`) }
    const { rows } = await query(
      `SELECT to_char(date_trunc('${groupBy}', approved_at), 'YYYY-MM-DD') AS date,
              SUM(total_amount) AS revenue, COUNT(*)::int AS order_count
       FROM invoices WHERE ${conds.join(' AND ')}
       GROUP BY 1 ORDER BY 1`,
      params,
    )
    return { series: rows.map((r: any) => ({ date: r.date, revenue: Number(r.revenue), order_count: r.order_count })) }
  })

  app.get('/analytics/by-salesman', { preHandler: requireRole('admin') }, async (req) => {
    const q = req.query as Record<string, string>
    const params: unknown[] = []
    const conds = [`i.status = 'approved'`]
    if (q.from) { params.push(q.from); conds.push(`i.approved_at >= $${params.length}`) }
    if (q.to) { params.push(q.to); conds.push(`i.approved_at <= $${params.length}`) }
    const { rows } = await query(
      `SELECT u.id, u.name, COUNT(i.id)::int AS order_count,
              COALESCE(SUM(i.total_amount),0) AS revenue,
              COALESCE(AVG(i.total_amount),0) AS avg_order_value
       FROM users u JOIN invoices i ON i.salesman_id = u.id
       WHERE ${conds.join(' AND ')} GROUP BY u.id, u.name ORDER BY revenue DESC`,
      params,
    )
    return {
      data: rows.map((r: any) => ({
        salesman: { id: r.id, name: r.name },
        order_count: r.order_count, revenue: Number(r.revenue), avg_order_value: Number(r.avg_order_value),
      })),
    }
  })

  app.get('/analytics/top-products', { preHandler: requireRole('admin') }, async (req) => {
    const q = req.query as Record<string, string>
    const params: unknown[] = []
    const conds = [`i.status = 'approved'`]
    if (q.from) { params.push(q.from); conds.push(`i.approved_at >= $${params.length}`) }
    if (q.to) { params.push(q.to); conds.push(`i.approved_at <= $${params.length}`) }
    const limit = Math.min(50, Number(q.limit ?? 10))
    params.push(limit)
    const { rows } = await query(
      `SELECT p.id, p.name, p.sku, SUM(ii.qty)::int AS units_sold, SUM(ii.subtotal) AS revenue
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       JOIN products p ON p.id = ii.product_id
       WHERE ${conds.join(' AND ')}
       GROUP BY p.id, p.name, p.sku ORDER BY revenue DESC LIMIT $${params.length}`,
      params,
    )
    return {
      data: rows.map((r: any) => ({
        product: { id: r.id, name: r.name, sku: r.sku }, units_sold: r.units_sold, revenue: Number(r.revenue),
      })),
    }
  })

  app.get('/analytics/receivables', { preHandler: requireRole('admin') }, async () => {
    const { rows } = await query(
      `SELECT c.id, c.name, c.phone, COUNT(p.id)::int AS invoices_count,
              SUM(p.amount_due) AS amount_due, SUM(p.amount_paid) AS amount_paid,
              SUM(p.balance) AS balance, MIN(p.created_at) AS oldest_unpaid_at
       FROM customers c JOIN payments p ON p.customer_id = c.id
       WHERE p.balance > 0 GROUP BY c.id, c.name, c.phone ORDER BY balance DESC`,
    )
    const data = rows.map((r: any) => ({
      customer: { id: r.id, name: r.name, phone: r.phone },
      invoices_count: r.invoices_count, amount_due: Number(r.amount_due), amount_paid: Number(r.amount_paid),
      balance: Number(r.balance), oldest_unpaid_at: r.oldest_unpaid_at.toISOString(),
    }))
    return { total_outstanding: data.reduce((s, d) => s + d.balance, 0), data }
  })

  app.get('/analytics/summary', { preHandler: requireRole('admin') }, async () => {
    const { rows: [pending] } = await query(`SELECT COUNT(*)::int AS n FROM invoices WHERE status = 'pending'`)
    const { rows: [revenue] } = await query(`SELECT COALESCE(SUM(total_amount),0) AS r FROM invoices WHERE status = 'approved'`)
    const { rows: [low] } = await query(
      `SELECT COUNT(*)::int AS n FROM products WHERE deleted_at IS NULL AND reorder_threshold IS NOT NULL AND (stock_qty - reserved_qty) <= reorder_threshold`,
    )
    const { rows: [cust] } = await query(`SELECT COUNT(*)::int AS n FROM customers WHERE deleted_at IS NULL`)
    return {
      pending_approvals: pending.n,
      total_revenue: Number(revenue.r),
      low_stock_count: low.n,
      customer_count: cust.n,
    }
  })
}
