import type { PoolClient } from 'pg'
import { query } from '../db.js'
import { normalizePhone } from '../lib/phone.js'
import type { CreateInvoiceInput, Invoice, SyncPushResultItem } from '@wholesale/shared'

// Insert one invoice (idempotent by local_id). Reserves stock and creates a
// pending payment. Shared by POST /invoices and POST /sync/push.
export async function processInvoice(
  client: PoolClient,
  payload: CreateInvoiceInput,
  salesmanId: string,
): Promise<SyncPushResultItem> {
  const existing = await client.query(
    'SELECT id, customer_id FROM invoices WHERE local_id = $1',
    [payload.local_id],
  )
  if (existing.rows[0]) {
    return {
      local_id: payload.local_id,
      status: 'duplicate',
      server_id: existing.rows[0].id,
      customer_id: existing.rows[0].customer_id,
    }
  }

  let customerId = payload.customer_id
  if (!customerId && payload.new_customer) {
    const normalizedPhone = normalizePhone(payload.new_customer.phone)
    const dup = await client.query(
      'SELECT id FROM customers WHERE phone = $1 AND deleted_at IS NULL',
      [normalizedPhone],
    )
    if (dup.rows[0]) {
      customerId = dup.rows[0].id
    } else {
      const created = await client.query(
        `INSERT INTO customers (name, phone, address, created_by)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [payload.new_customer.name, normalizedPhone, payload.new_customer.address ?? null, salesmanId],
      )
      customerId = created.rows[0].id
    }
  }

  if (!customerId) {
    return { local_id: payload.local_id, status: 'conflict', conflict_reason: 'Could not resolve customer' }
  }

  const total = payload.items.reduce((sum, it) => sum + it.qty * it.unit_price, 0)

  const inv = await client.query(
    `INSERT INTO invoices
       (salesman_id, customer_id, total_amount, notes, local_id, created_at_device, status, synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',NOW())
     RETURNING id`,
    [salesmanId, customerId, total, payload.notes ?? null, payload.local_id, payload.created_at_device],
  )
  const invoiceId = inv.rows[0].id

  for (const item of payload.items) {
    await client.query(
      `INSERT INTO invoice_items (invoice_id, product_id, qty, unit_price, subtotal)
       VALUES ($1,$2,$3,$4,$5)`,
      [invoiceId, item.product_id, item.qty, item.unit_price, item.qty * item.unit_price],
    )
    await client.query(
      `UPDATE products SET reserved_qty = reserved_qty + $1 WHERE id = $2`,
      [item.qty, item.product_id],
    )
  }

  await client.query(
    `INSERT INTO payments (invoice_id, customer_id, amount_due, amount_paid)
     VALUES ($1,$2,$3,0)`,
    [invoiceId, customerId, total],
  )

  return { local_id: payload.local_id, status: 'created', server_id: invoiceId, customer_id: customerId }
}

export async function approveInvoice(
  client: PoolClient,
  invoiceId: string,
  adminId: string,
): Promise<{ warnings: string[] }> {
  const { rows: [invoice] } = await client.query(
    `SELECT * FROM invoices WHERE id = $1 AND status = 'pending' FOR UPDATE`,
    [invoiceId],
  )
  if (!invoice) throw new Error('INVOICE_NOT_FOUND_OR_NOT_PENDING')

  const { rows: items } = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId])

  const warnings: string[] = []
  for (const item of items) {
    const { rows: [product] } = await client.query(
      'SELECT name, stock_qty FROM products WHERE id = $1',
      [item.product_id],
    )
    if (product && product.stock_qty < item.qty) {
      warnings.push(`${product.name}: need ${item.qty}, have ${product.stock_qty}`)
    }
  }

  for (const item of items) {
    // Clamp stock at 0 to satisfy the stock_qty >= 0 check constraint while
    // still releasing the reservation. Oversell is surfaced via warnings.
    await client.query(
      `UPDATE products
         SET stock_qty    = GREATEST(stock_qty - $1, 0),
             reserved_qty = GREATEST(reserved_qty - $1, 0)
       WHERE id = $2`,
      [item.qty, item.product_id],
    )
  }

  await client.query(
    `UPDATE invoices SET status='approved', approved_at=NOW(), approved_by=$2 WHERE id=$1`,
    [invoiceId, adminId],
  )

  return { warnings }
}

export async function rejectInvoice(client: PoolClient, invoiceId: string, reason: string): Promise<void> {
  const { rows: [invoice] } = await client.query(
    `SELECT id FROM invoices WHERE id = $1 AND status = 'pending' FOR UPDATE`,
    [invoiceId],
  )
  if (!invoice) throw new Error('INVOICE_NOT_FOUND_OR_NOT_PENDING')

  const { rows: items } = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId])
  for (const item of items) {
    await client.query(
      `UPDATE products SET reserved_qty = GREATEST(reserved_qty - $1, 0) WHERE id = $2`,
      [item.qty, item.product_id],
    )
  }

  await client.query(
    `UPDATE invoices SET status='rejected', rejection_reason=$1 WHERE id=$2`,
    [reason, invoiceId],
  )
}

const INVOICE_SELECT = `
  SELECT i.id, i.local_id, i.total_amount, i.status, i.notes, i.rejection_reason,
         i.created_at_device, i.synced_at, i.approved_at,
         s.id AS salesman_id, s.name AS salesman_name,
         c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone
  FROM invoices i
  JOIN users s ON s.id = i.salesman_id
  JOIN customers c ON c.id = i.customer_id
`

function mapInvoiceRow(row: any, items: any[]): Invoice {
  return {
    id: row.id,
    local_id: row.local_id,
    salesman: { id: row.salesman_id, name: row.salesman_name },
    customer: { id: row.customer_id, name: row.customer_name, phone: row.customer_phone },
    items: items.map((it) => ({
      id: it.id,
      product: { id: it.product_id, name: it.product_name, sku: it.product_sku, unit: it.product_unit },
      qty: it.qty,
      unit_price: it.unit_price,
      subtotal: it.subtotal,
    })),
    total_amount: row.total_amount,
    status: row.status,
    notes: row.notes,
    rejection_reason: row.rejection_reason,
    created_at_device: row.created_at_device.toISOString(),
    synced_at: row.synced_at.toISOString(),
    approved_at: row.approved_at ? row.approved_at.toISOString() : null,
  }
}

async function loadItems(invoiceId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT ii.id, ii.qty, ii.unit_price, ii.subtotal,
            p.id AS product_id, p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit
     FROM invoice_items ii JOIN products p ON p.id = ii.product_id
     WHERE ii.invoice_id = $1 ORDER BY ii.created_at`,
    [invoiceId],
  )
  return rows
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const { rows } = await query(`${INVOICE_SELECT} WHERE i.id = $1`, [id])
  if (!rows[0]) return null
  return mapInvoiceRow(rows[0], await loadItems(id))
}

export interface InvoiceListFilters {
  status?: string
  salesman_id?: string
  customer_id?: string
  from?: string
  to?: string
  page: number
  limit: number
}

export async function listInvoices(f: InvoiceListFilters): Promise<{ data: Invoice[]; total: number }> {
  const clauses: string[] = []
  const params: unknown[] = []
  const add = (sql: string, val: unknown) => {
    params.push(val)
    clauses.push(sql.replace('?', `$${params.length}`))
  }
  if (f.status) add('i.status = ?', f.status)
  if (f.salesman_id) add('i.salesman_id = ?', f.salesman_id)
  if (f.customer_id) add('i.customer_id = ?', f.customer_id)
  if (f.from) add('i.created_at_device >= ?', f.from)
  if (f.to) add('i.created_at_device <= ?', f.to)
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

  const countRes = await query(`SELECT COUNT(*)::int AS n FROM invoices i ${where}`, params)
  const total = countRes.rows[0].n

  const offset = (f.page - 1) * f.limit
  const listParams = [...params, f.limit, offset]
  const { rows } = await query(
    `${INVOICE_SELECT} ${where} ORDER BY i.created_at_device DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    listParams,
  )
  const data: Invoice[] = []
  for (const row of rows) {
    data.push(mapInvoiceRow(row, await loadItems(row.id)))
  }
  return { data, total }
}
