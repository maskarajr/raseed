# Wholesale Sales System — Cursor Agent Handoff

> Read this fully before writing a single line of code.
> Implementation order matters — follow Section 11 task-by-task.

---

## 1. What We're Building

Two apps + one API in a pnpm monorepo:

| Surface | Who Uses It | Tech |
|---|---|---|
| `apps/salesman` | Field salesmen on phones | React + Vite PWA |
| `apps/admin` | Shop admin at HQ | Next.js 14 (App Router) |
| `apps/api` | Backend for both | Node.js + Fastify |

**Core mechanic:** Salesmen generate invoices in the field — sometimes offline. When back at HQ with WiFi, the app syncs. Admin approves/rejects. Stock and payment records update accordingly.

---

## 2. Monorepo Structure

```
wholesale-system/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── invoices.ts
│   │   │   │   ├── customers.ts
│   │   │   │   ├── products.ts
│   │   │   │   ├── sync.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   └── salesmen.ts
│   │   │   ├── plugins/
│   │   │   │   ├── db.ts          # postgres pool
│   │   │   │   ├── redis.ts
│   │   │   │   ├── auth.ts        # JWT plugin
│   │   │   │   └── websocket.ts
│   │   │   ├── services/
│   │   │   │   ├── sync.service.ts
│   │   │   │   ├── invoice.service.ts
│   │   │   │   ├── stock.service.ts
│   │   │   │   └── customer.service.ts
│   │   │   ├── middleware/
│   │   │   │   └── requireRole.ts
│   │   │   ├── lib/
│   │   │   │   └── phone.ts       # phone normalization
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # redirect to /dashboard
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx     # sidebar shell
│   │   │       ├── page.tsx       # dashboard home
│   │   │       ├── orders/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── customers/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── stock/
│   │   │       │   └── page.tsx
│   │   │       ├── salesmen/
│   │   │       │   └── page.tsx
│   │   │       └── reports/
│   │   │           └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/                # shadcn components
│   │   │   ├── InvoiceApprovalCard.tsx
│   │   │   ├── StockTable.tsx
│   │   │   ├── LiveOrderFeed.tsx
│   │   │   └── RevenueChart.tsx
│   │   ├── lib/
│   │   │   ├── api.ts             # typed fetch wrapper
│   │   │   └── socket.ts          # socket.io client
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── salesman/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Login.tsx
│       │   │   ├── Home.tsx
│       │   │   ├── NewInvoice/
│       │   │   │   ├── index.tsx      # step controller
│       │   │   │   ├── StepCustomer.tsx
│       │   │   │   ├── StepProducts.tsx
│       │   │   │   ├── StepReview.tsx
│       │   │   │   └── StepDone.tsx
│       │   │   ├── MyInvoices.tsx
│       │   │   └── InvoiceDetail.tsx
│       │   ├── components/
│       │   │   ├── SyncBadge.tsx
│       │   │   ├── ProductSearch.tsx
│       │   │   └── CustomerSearch.tsx
│       │   ├── db/
│       │   │   ├── index.ts       # Dexie DB definition
│       │   │   └── schema.ts      # local table definitions
│       │   ├── sync/
│       │   │   ├── SyncManager.ts
│       │   │   └── conflictResolver.ts
│       │   ├── store/
│       │   │   ├── authStore.ts   # zustand
│       │   │   └── syncStore.ts
│       │   ├── lib/
│       │   │   ├── api.ts
│       │   │   └── deviceId.ts    # persistent device ID
│       │   └── main.tsx
│       ├── public/
│       │   └── manifest.json
│       ├── vite.config.ts         # PWA plugin config
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── schemas/           # Zod schemas (source of truth)
│       │   │   ├── invoice.schema.ts
│       │   │   ├── customer.schema.ts
│       │   │   ├── product.schema.ts
│       │   │   └── sync.schema.ts
│       │   ├── types/             # inferred types from schemas
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

---

## 3. Package Versions (exact)

### Root `package.json`
```json
{
  "name": "wholesale-system",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel dev",
    "build": "pnpm --recursive build",
    "db:migrate": "pnpm --filter api db:migrate"
  }
}
```

### `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `apps/api/package.json`
```json
{
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/jwt": "^9.0.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/websocket": "^10.0.0",
    "@fastify/cookie": "^9.0.0",
    "pg": "^8.12.0",
    "ioredis": "^5.4.1",
    "zod": "^3.23.8",
    "bcryptjs": "^2.4.3",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/pg": "^8.11.6",
    "@types/bcryptjs": "^2.4.6",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.17.0",
    "nodemon": "^3.1.4"
  }
}
```

### `apps/admin/package.json`
```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "socket.io-client": "^4.7.5",
    "@tanstack/react-query": "^5.51.0",
    "recharts": "^2.12.7",
    "zustand": "^4.5.4",
    "zod": "^3.23.8",
    "date-fns": "^3.6.0",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5"
  }
}
```

### `apps/salesman/package.json`
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "dexie": "^4.0.7",
    "@tanstack/react-query": "^5.51.0",
    "zustand": "^4.5.4",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite-plugin-pwa": "^0.20.5"
  }
}
```

---

## 4. Environment Variables

### `.env.example` (root)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wholesale

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=change-this-to-long-random-string
JWT_REFRESH_SECRET=another-long-random-string
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# API
API_PORT=3001
API_HOST=0.0.0.0

# Admin
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Salesman PWA
VITE_API_URL=http://localhost:3001
```

---

## 5. Database Schema

See `schema.sql` for the full DDL. Key design decisions:

- `invoices.local_id` — the idempotency key from the salesman device (`{deviceId}_{localUUID}`)
- `products.stock_qty` — actual physical stock
- `products.reserved_qty` — stock soft-locked by PENDING invoices
- `products.available_qty` — **computed column**: `stock_qty - reserved_qty`
- Soft deletes on `products` and `customers` (`deleted_at`)
- All timestamps in UTC

---

## 6. Shared Zod Schemas (`packages/shared/src/schemas/`)

These are the source of truth for all data shapes. API validates requests with them. Both frontends import types from them.

### `invoice.schema.ts`
```typescript
import { z } from 'zod'

export const InvoiceItemSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.number().int().positive(),
  unit_price: z.number().positive(),
})

export const CreateInvoiceSchema = z.object({
  customer_id: z.string().uuid().optional(),   // null if new customer
  new_customer: z.object({                      // required if customer_id absent
    name: z.string().min(1),
    phone: z.string().min(7),
    address: z.string().optional(),
  }).optional(),
  items: z.array(InvoiceItemSchema).min(1),
  notes: z.string().optional(),
  local_id: z.string(),                         // device idempotency key
  created_at_device: z.string().datetime(),     // device timestamp (ISO)
})

export const InvoiceStatusSchema = z.enum([
  'draft', 'pending', 'approved', 'rejected'
])

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>
```

### `sync.schema.ts`
```typescript
import { z } from 'zod'
import { CreateInvoiceSchema } from './invoice.schema'

export const SyncPushSchema = z.object({
  device_id: z.string(),
  records: z.array(z.object({
    type: z.literal('invoice'),
    payload: CreateInvoiceSchema,
  }))
})

export const SyncPullQuerySchema = z.object({
  since: z.string().datetime().optional(),   // ISO timestamp of last pull
})

export type SyncPushInput = z.infer<typeof SyncPushSchema>
```

---

## 7. API Routes — Full Contracts

### Auth

#### `POST /auth/login`
```typescript
// Request
{ email: string, password: string }

// Response 200
{
  access_token: string,        // JWT, 15min
  refresh_token: string,       // JWT, 7d (also set as httpOnly cookie)
  user: {
    id: string,
    name: string,
    email: string,
    role: 'salesman' | 'admin'
  }
}

// Response 401
{ error: 'INVALID_CREDENTIALS' }
```

#### `POST /auth/refresh`
```typescript
// Request: refresh_token in httpOnly cookie OR body
{ refresh_token?: string }

// Response 200
{ access_token: string }
```

#### `POST /auth/logout`
```typescript
// Clears refresh cookie, invalidates token in Redis blacklist
// Response 204 (no body)
```

---

### Sync (Salesman App Only)

#### `POST /sync/push`
```typescript
// Request (requires salesman JWT)
{
  device_id: string,
  records: Array<{
    type: 'invoice',
    payload: CreateInvoiceInput   // see schema above
  }>
}

// Response 200
{
  processed: Array<{
    local_id: string,              // echo back so client can match
    status: 'created' | 'duplicate' | 'conflict',
    server_id?: string,            // invoice UUID on server
    customer_id?: string,          // resolved customer UUID
    conflict_reason?: string,
  }>
}
```

#### `GET /sync/pull?since=<ISO>`
```typescript
// Response 200
{
  products: Product[],             // full catalog if no since, delta if since provided
  customers: Customer[],           // salesman's own customers
  invoice_updates: Array<{         // status changes since last pull
    local_id: string,
    server_id: string,
    status: InvoiceStatus,
    rejection_reason?: string,
  }>,
  pulled_at: string,               // ISO timestamp to store as next `since`
}
```

---

### Invoices

#### `GET /invoices`
```typescript
// Query params
{
  status?: InvoiceStatus,
  salesman_id?: string,    // admin only — filter by salesman
  customer_id?: string,
  from?: string,           // ISO date
  to?: string,
  page?: number,
  limit?: number,          // default 50
}

// Response 200
{
  data: Invoice[],
  total: number,
  page: number,
}

// Invoice shape
{
  id: string,
  local_id: string,
  salesman: { id: string, name: string },
  customer: { id: string, name: string, phone: string },
  items: Array<{
    product: { id: string, name: string, sku: string },
    qty: number,
    unit_price: number,
    subtotal: number,
  }>,
  total_amount: number,
  status: InvoiceStatus,
  notes?: string,
  rejection_reason?: string,
  created_at_device: string,
  synced_at: string,
  approved_at?: string,
}
```

#### `POST /invoices` (online path — same as sync but single)
```typescript
// Request body: CreateInvoiceInput
// Response 201: Invoice (full shape above)
```

#### `PATCH /invoices/:id/approve`
```typescript
// Admin only
// Request: {} (empty body)
// Response 200: Invoice with status: 'approved'
// Side effects:
//   - stock_qty -= each item qty (per product)
//   - reserved_qty -= each item qty (per product)
//   - payment record created
//   - WebSocket event emitted: 'invoice:approved' to salesman room
```

#### `PATCH /invoices/:id/reject`
```typescript
// Admin only
// Request: { reason: string }
// Response 200: Invoice with status: 'rejected'
// Side effects:
//   - reserved_qty -= each item qty (per product)
//   - WebSocket event emitted: 'invoice:rejected' to salesman room
```

---

### Customers

#### `GET /customers`
```typescript
// Query: { search?: string, page?: number, limit?: number }
// Response 200: { data: Customer[], total: number }

// Customer shape
{
  id: string,
  name: string,
  phone: string,
  address?: string,
  notes?: string,
  created_by: { id: string, name: string },
  created_at: string,
  stats: {
    total_orders: number,
    total_spent: number,
    outstanding_balance: number,
  }
}
```

#### `GET /customers/:id`
```typescript
// Response: Customer + full order history
{ ...Customer, invoices: Invoice[] }
```

#### `POST /customers`
```typescript
// Request: { name: string, phone: string, address?: string }
// Response 201: Customer
// Note: phone normalized server-side before insert
```

---

### Products

#### `GET /products`
```typescript
// Query: { search?: string, category?: string, low_stock?: boolean }
// Response 200
{
  data: Array<{
    id: string,
    name: string,
    sku: string,
    category?: string,
    unit: string,
    price: number,
    stock_qty: number,
    reserved_qty: number,
    available_qty: number,       // computed: stock_qty - reserved_qty
    reorder_threshold?: number,
    active: boolean,
  }>
}
```

#### `POST /products` (admin only)
```typescript
// Request
{
  name: string,
  sku: string,
  category?: string,
  unit: string,
  price: number,
  stock_qty: number,
  reorder_threshold?: number,
}
// Response 201: Product
```

#### `PATCH /products/:id` (admin only)
```typescript
// Request: Partial<Product fields> (any subset)
// Response 200: Product
```

#### `PATCH /products/:id/stock` (admin only — receive goods)
```typescript
// Request: { adjustment: number, reason: string }
// adjustment: positive = add stock, negative = manual deduction
// Response 200: { stock_qty: number }
// Side effect: inserts stock_adjustment_log row
```

---

### Analytics (admin only)

#### `GET /analytics/sales?from=&to=&group_by=day|week|month`
```typescript
// Response
{
  series: Array<{ date: string, revenue: number, order_count: number }>
}
```

#### `GET /analytics/by-salesman?from=&to=`
```typescript
{
  data: Array<{
    salesman: { id: string, name: string },
    order_count: number,
    revenue: number,
    avg_order_value: number,
  }>
}
```

#### `GET /analytics/top-products?from=&to=&limit=10`
```typescript
{
  data: Array<{
    product: { id: string, name: string, sku: string },
    units_sold: number,
    revenue: number,
  }>
}
```

#### `GET /analytics/receivables`
```typescript
{
  total_outstanding: number,
  data: Array<{
    customer: { id: string, name: string, phone: string },
    invoices_count: number,
    amount_due: number,
    amount_paid: number,
    balance: number,
    oldest_unpaid_at: string,
  }>
}
```

---

### Salesmen (admin only)

#### `GET /salesmen`
```typescript
// Response: Array<{ id, name, email, phone, active, stats: { orders, revenue } }>
```

#### `POST /salesmen`
```typescript
// Request: { name: string, email: string, phone?: string, password: string }
// Response 201: { id, name, email, role: 'salesman' }
```

#### `PATCH /salesmen/:id`
```typescript
// Request: { active?: boolean, name?: string, phone?: string }
```

---

## 8. Sync Logic — Detailed Implementation

### Device ID

```typescript
// apps/salesman/src/lib/deviceId.ts
export function getDeviceId(): string {
  let id = localStorage.getItem('device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('device_id', id)
  }
  return id
}
```

### Local DB (Dexie)

```typescript
// apps/salesman/src/db/index.ts
import Dexie, { type EntityTable } from 'dexie'

interface LocalProduct {
  id: string; name: string; sku: string; unit: string;
  price: number; available_qty: number; category?: string;
}
interface LocalCustomer {
  id: string; name: string; phone: string; address?: string;
}
interface LocalInvoice {
  local_id: string;           // primary key (device-generated)
  server_id?: string;         // set after sync
  customer_id?: string;
  new_customer?: object;
  items: object[];
  total_amount: number;
  status: string;
  sync_status: 'pending' | 'synced' | 'conflict';
  conflict_reason?: string;
  created_at_device: string;
  notes?: string;
}

class AppDB extends Dexie {
  products!: EntityTable<LocalProduct, 'id'>
  customers!: EntityTable<LocalCustomer, 'id'>
  invoices!: EntityTable<LocalInvoice, 'local_id'>

  constructor() {
    super('wholesale_salesman')
    this.version(1).stores({
      products:  'id, name, sku',
      customers: 'id, phone, name',
      invoices:  'local_id, sync_status, created_at_device',
    })
  }
}

export const db = new AppDB()
```

### SyncManager

```typescript
// apps/salesman/src/sync/SyncManager.ts
import { db } from '../db'
import { api } from '../lib/api'
import { useSyncStore } from '../store/syncStore'

export class SyncManager {
  private running = false

  // Call this on: app mount, navigator.onLine event, manual trigger
  async sync() {
    if (this.running || !navigator.onLine) return
    this.running = true
    useSyncStore.getState().setStatus('syncing')

    try {
      await this.push()
      await this.pull()
      useSyncStore.getState().setStatus('synced')
    } catch (err) {
      useSyncStore.getState().setStatus('error')
    } finally {
      this.running = false
    }
  }

  private async push() {
    const pending = await db.invoices
      .where('sync_status').equals('pending')
      .toArray()

    if (pending.length === 0) return

    const { processed } = await api.post('/sync/push', {
      device_id: getDeviceId(),
      records: pending.map(inv => ({
        type: 'invoice',
        payload: {
          customer_id:        inv.customer_id,
          new_customer:       inv.new_customer,
          items:              inv.items,
          notes:              inv.notes,
          local_id:           inv.local_id,
          created_at_device:  inv.created_at_device,
        }
      }))
    })

    for (const result of processed) {
      if (result.status === 'created' || result.status === 'duplicate') {
        await db.invoices.update(result.local_id, {
          sync_status: 'synced',
          server_id:   result.server_id,
          customer_id: result.customer_id ?? undefined,
          status:      'pending',   // invoice is now pending admin approval
        })
      } else if (result.status === 'conflict') {
        await db.invoices.update(result.local_id, {
          sync_status:     'conflict',
          conflict_reason: result.conflict_reason,
        })
      }
    }
  }

  private async pull() {
    const since = localStorage.getItem('last_pull_at') ?? undefined

    const data = await api.get('/sync/pull', { params: { since } })

    // Refresh local catalog
    await db.products.bulkPut(data.products)
    await db.customers.bulkPut(data.customers)

    // Apply server-side status updates (approvals/rejections)
    for (const update of data.invoice_updates) {
      const local = await db.invoices
        .where('server_id').equals(update.server_id)
        .first()
      if (local) {
        await db.invoices.update(local.local_id, {
          status:           update.status,
          rejection_reason: update.rejection_reason,
        })
      }
    }

    localStorage.setItem('last_pull_at', data.pulled_at)
  }
}

export const syncManager = new SyncManager()
```

### Server-Side Sync Handler

```typescript
// apps/api/src/services/sync.service.ts

async function processSyncPush(
  records: SyncRecord[],
  salesmanId: string,
  deviceId: string,
  pgClient: PoolClient
): Promise<ProcessedRecord[]> {
  const results: ProcessedRecord[] = []

  for (const record of records) {
    if (record.type === 'invoice') {
      const result = await processInvoice(record.payload, salesmanId, pgClient)
      results.push(result)
    }
  }

  return results
}

async function processInvoice(
  payload: CreateInvoiceInput,
  salesmanId: string,
  client: PoolClient
): Promise<ProcessedRecord> {
  // 1. Idempotency check
  const existing = await client.query(
    'SELECT id, customer_id FROM invoices WHERE local_id = $1',
    [payload.local_id]
  )
  if (existing.rows[0]) {
    return {
      local_id:    payload.local_id,
      status:      'duplicate',
      server_id:   existing.rows[0].id,
      customer_id: existing.rows[0].customer_id,
    }
  }

  // 2. Resolve or create customer
  let customerId = payload.customer_id
  if (!customerId && payload.new_customer) {
    const normalizedPhone = normalizePhone(payload.new_customer.phone)
    const existing = await client.query(
      'SELECT id FROM customers WHERE phone = $1',
      [normalizedPhone]
    )
    if (existing.rows[0]) {
      customerId = existing.rows[0].id
    } else {
      const result = await client.query(
        `INSERT INTO customers (name, phone, address, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [payload.new_customer.name, normalizedPhone,
         payload.new_customer.address ?? null, salesmanId]
      )
      customerId = result.rows[0].id
    }
  }

  if (!customerId) {
    return { local_id: payload.local_id, status: 'conflict',
             conflict_reason: 'Could not resolve customer' }
  }

  // 3. Calculate total
  const total = payload.items.reduce(
    (sum, item) => sum + item.qty * item.unit_price, 0
  )

  // 4. Create invoice
  const invoiceResult = await client.query(
    `INSERT INTO invoices
       (salesman_id, customer_id, total_amount, notes, local_id,
        created_at_device, status, synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',NOW())
     RETURNING id`,
    [salesmanId, customerId, total, payload.notes ?? null,
     payload.local_id, payload.created_at_device]
  )
  const invoiceId = invoiceResult.rows[0].id

  // 5. Insert items + soft-reserve stock
  for (const item of payload.items) {
    await client.query(
      `INSERT INTO invoice_items (invoice_id, product_id, qty, unit_price, subtotal)
       VALUES ($1,$2,$3,$4,$5)`,
      [invoiceId, item.product_id, item.qty,
       item.unit_price, item.qty * item.unit_price]
    )
    // Soft reserve (can go negative — admin warned at approval time)
    await client.query(
      `UPDATE products SET reserved_qty = reserved_qty + $1 WHERE id = $2`,
      [item.qty, item.product_id]
    )
  }

  // 6. Create pending payment record
  await client.query(
    `INSERT INTO payments (invoice_id, customer_id, amount_due, amount_paid, balance)
     VALUES ($1,$2,$3,0,$3)`,
    [invoiceId, customerId, total]
  )

  return {
    local_id:    payload.local_id,
    status:      'created',
    server_id:   invoiceId,
    customer_id: customerId,
  }
}
```

---

## 9. Invoice Approval — Stock Logic

```typescript
// apps/api/src/services/invoice.service.ts

async function approveInvoice(invoiceId: string, client: PoolClient) {
  // 1. Load invoice + items
  const { rows: [invoice] } = await client.query(
    `SELECT * FROM invoices WHERE id = $1 AND status = 'pending'`,
    [invoiceId]
  )
  if (!invoice) throw new Error('INVOICE_NOT_FOUND_OR_NOT_PENDING')

  const { rows: items } = await client.query(
    'SELECT * FROM invoice_items WHERE invoice_id = $1',
    [invoiceId]
  )

  // 2. Check for stock warnings (don't block — just collect)
  const warnings: string[] = []
  for (const item of items) {
    const { rows: [product] } = await client.query(
      'SELECT name, stock_qty, reserved_qty FROM products WHERE id = $1',
      [item.product_id]
    )
    if (product.stock_qty < item.qty) {
      warnings.push(`${product.name}: need ${item.qty}, have ${product.stock_qty}`)
    }
  }

  // 3. Hard-deduct stock + release reservation
  for (const item of items) {
    await client.query(
      `UPDATE products
       SET stock_qty    = stock_qty    - $1,
           reserved_qty = reserved_qty - $1
       WHERE id = $2`,
      [item.qty, item.product_id]
    )
  }

  // 4. Finalize invoice
  await client.query(
    `UPDATE invoices SET status='approved', approved_at=NOW() WHERE id=$1`,
    [invoiceId]
  )

  // 5. Emit WebSocket event to salesman
  // (in route handler, after service call)
  // io.to(`salesman:${invoice.salesman_id}`).emit('invoice:approved', { invoiceId })

  return { warnings }  // surface warnings to admin UI
}

async function rejectInvoice(invoiceId: string, reason: string, client: PoolClient) {
  const { rows: items } = await client.query(
    'SELECT * FROM invoice_items WHERE invoice_id = $1',
    [invoiceId]
  )

  // Release reservations
  for (const item of items) {
    await client.query(
      `UPDATE products SET reserved_qty = reserved_qty - $1 WHERE id = $2`,
      [item.qty, item.product_id]
    )
  }

  await client.query(
    `UPDATE invoices SET status='rejected', rejection_reason=$1 WHERE id=$2`,
    [reason, invoiceId]
  )
}
```

---

## 10. WebSocket Events

The admin dashboard subscribes to a global room. Salesmen subscribe to their own room.

### Server setup (Fastify + `@fastify/websocket`)

```typescript
// On connection
socket.on('authenticate', (token: string) => {
  const payload = fastify.jwt.verify(token)
  if (payload.role === 'admin') {
    socket.join('admin')
  } else {
    socket.join(`salesman:${payload.id}`)
  }
})
```

### Event Catalog

| Event | Direction | Payload | Who Gets It |
|---|---|---|---|
| `invoice:created` | server → admin | `{ invoiceId, salesman, customer, total }` | `admin` room |
| `invoice:approved` | server → salesman | `{ invoiceId }` | `salesman:{id}` room |
| `invoice:rejected` | server → salesman | `{ invoiceId, reason }` | `salesman:{id}` room |
| `stock:low` | server → admin | `{ productId, name, available_qty }` | `admin` room |

### Admin client connection

```typescript
// apps/admin/lib/socket.ts
import { io } from 'socket.io-client'

const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
  autoConnect: false,
})

export function connectSocket(token: string) {
  socket.connect()
  socket.emit('authenticate', token)
}

export { socket }
```

---

## 11. PWA Config

```typescript
// apps/salesman/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/products/,
            handler: 'NetworkFirst',   // try network, fall to cache
            options: {
              cacheName: 'api-products',
              expiration: { maxAgeSeconds: 60 * 60 * 24 },  // 1 day
            }
          },
        ]
      },
      manifest: {
        name: 'Wholesale Salesman',
        short_name: 'Salesman',
        theme_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ]
      }
    })
  ]
})
```

---

## 12. Auth Middleware (`apps/api`)

```typescript
// apps/api/src/middleware/requireRole.ts
import type { FastifyRequest, FastifyReply } from 'fastify'

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const user = request.user as { role: string }
      if (!roles.includes(user.role)) {
        reply.status(403).send({ error: 'FORBIDDEN' })
      }
    } catch {
      reply.status(401).send({ error: 'UNAUTHORIZED' })
    }
  }
}

// Usage in routes:
// fastify.patch('/invoices/:id/approve', {
//   preHandler: requireRole('admin'),
// }, handler)
```

---

## 13. Phone Normalization

```typescript
// apps/api/src/lib/phone.ts
// Used for customer deduplication during sync

export function normalizePhone(raw: string): string {
  // Strip all non-digit characters
  const digits = raw.replace(/\D/g, '')
  // Strip leading country code if 11+ digits starting with common prefixes
  // Adjust this logic per target country
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)   // strip leading 0
  }
  if (digits.length === 12 && digits.startsWith('92')) {
    return digits.slice(2)   // strip +92 (Pakistan) — adjust for your market
  }
  return digits
}
```

---

## 14. Implementation Order (follow exactly)

Each task should be a separate Cursor session / commit. Do not jump ahead.

### Phase 0 — Scaffolding
- [ ] **0.1** Init monorepo: `pnpm init`, `pnpm-workspace.yaml`, root `package.json`
- [ ] **0.2** Scaffold `apps/api` with Fastify + TypeScript (`tsx` for dev, `nodemon`)
- [ ] **0.3** Scaffold `apps/admin` with `create-next-app` (App Router, TypeScript, Tailwind)
- [ ] **0.4** Scaffold `apps/salesman` with `create vite` (React + TypeScript)
- [ ] **0.5** Create `packages/shared`, set up Zod schemas, export types
- [ ] **0.6** Run `schema.sql` against local Postgres, verify tables exist
- [ ] **0.7** Add `.env` files to each app, configure path aliases

### Phase 1 — Auth
- [ ] **1.1** API: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- [ ] **1.2** API: `requireRole` middleware, attach user to request
- [ ] **1.3** Admin: Login page, store JWT in memory + refresh in cookie, redirect to `/dashboard`
- [ ] **1.4** Admin: Auth context / axios interceptor that refreshes on 401
- [ ] **1.5** Salesman: Login page, same auth pattern, store in zustand + localStorage

### Phase 2 — Products & Stock (Admin)
- [ ] **2.1** API: `GET /products`, `POST /products`, `PATCH /products/:id`, `PATCH /products/:id/stock`
- [ ] **2.2** Admin: Stock page — full product table with available_qty column
- [ ] **2.3** Admin: Add product modal, edit product slide-over
- [ ] **2.4** Admin: Stock adjustment modal (receive goods)

### Phase 3 — Salesman App (Online Path)
- [ ] **3.1** Salesman: Set up Dexie DB schema (`db/index.ts`)
- [ ] **3.2** Salesman: Home screen with sync badge (pending count from Dexie)
- [ ] **3.3** Salesman: Product catalog page (fetch from API, store in Dexie)
- [ ] **3.4** Salesman: Customer search (local Dexie first, then API)
- [ ] **3.5** Salesman: New Invoice — StepCustomer (search + create new)
- [ ] **3.6** Salesman: New Invoice — StepProducts (search products, add qty)
- [ ] **3.7** Salesman: New Invoice — StepReview + submit (online path: `POST /invoices`)
- [ ] **3.8** Salesman: My Invoices list + Invoice Detail screen

### Phase 4 — Invoice Approval (Admin)
- [ ] **4.1** API: `GET /invoices`, `PATCH /invoices/:id/approve`, `PATCH /invoices/:id/reject`
- [ ] **4.2** API: Approval business logic — `stock.service.ts` (hard deduct, release reservation)
- [ ] **4.3** API: Rejection logic — release reservation, store reason
- [ ] **4.4** Admin: Orders page — filterable invoice list
- [ ] **4.5** Admin: Invoice detail page — line items, approve/reject buttons + rejection reason input
- [ ] **4.6** Admin: Stock warnings shown on approval (from `warnings[]` in response)

### Phase 5 — Customers (Admin)
- [ ] **5.1** API: `GET /customers`, `GET /customers/:id`, `POST /customers`
- [ ] **5.2** Admin: Customer list with search
- [ ] **5.3** Admin: Customer profile page — details + order history + outstanding balance

### Phase 6 — Offline Sync
- [ ] **6.1** Salesman: `deviceId.ts` — persistent UUID in localStorage
- [ ] **6.2** Salesman: `SyncManager.ts` — push pending invoices, pull catalog/status updates
- [ ] **6.3** Salesman: New Invoice — save to Dexie with `sync_status: 'pending'` when offline
- [ ] **6.4** Salesman: `SyncBadge` component — shows pending count, syncing spinner, error state
- [ ] **6.5** Salesman: Wire up `SyncManager.sync()` to `window.addEventListener('online', ...)` + app mount
- [ ] **6.6** API: `POST /sync/push` — process batch, idempotency check, customer dedup, stock reservation
- [ ] **6.7** API: `GET /sync/pull` — delta products/customers since `?since=`, invoice status updates
- [ ] **6.8** Test: create invoice offline, toggle network, verify sync, verify admin sees it

### Phase 7 — Real-time (WebSocket)
- [ ] **7.1** API: `@fastify/websocket` plugin, room join on authenticate
- [ ] **7.2** API: Emit `invoice:created` to `admin` room after sync push + direct POST
- [ ] **7.3** API: Emit `invoice:approved` / `invoice:rejected` to `salesman:{id}` room
- [ ] **7.4** API: Emit `stock:low` when `available_qty <= reorder_threshold` after any deduction
- [ ] **7.5** Admin: `LiveOrderFeed` component — subscribes to `invoice:created`, shows toast + updates list
- [ ] **7.6** Salesman: Listen for `invoice:approved` / `invoice:rejected`, update local Dexie record, show notification

### Phase 8 — Analytics & Payments
- [ ] **8.1** API: All 4 analytics endpoints
- [ ] **8.2** Admin: Reports page — revenue chart (Recharts LineChart), top products table, by-salesman table
- [ ] **8.3** Admin: Receivables table on reports page
- [ ] **8.4** Admin: Dashboard home — summary cards + pending approvals count + low stock alerts

### Phase 9 — Salesmen Management (Admin)
- [ ] **9.1** API: `GET /salesmen`, `POST /salesmen`, `PATCH /salesmen/:id`
- [ ] **9.2** Admin: Salesmen page — list with performance stats, add salesman form, deactivate toggle

### Phase 10 — Polish
- [ ] **10.1** Low stock badge on product rows (admin) — red when `available_qty <= reorder_threshold`
- [ ] **10.2** Salesman: conflict state UI — show invoice stuck in 'conflict' with reason
- [ ] **10.3** Salesman: Manual sync button on profile screen
- [ ] **10.4** API: Rate limiting on auth endpoints (5 req/min per IP)
- [ ] **10.5** Input validation on all API routes via Zod schemas from `packages/shared`

---

## 15. Key Business Rules (enforce these everywhere)

1. **A salesman can only see their own invoices** — server filters by `salesman_id = request.user.id` for salesman role
2. **Stock reservation is optimistic** — `reserved_qty` can exceed `stock_qty`; admin is warned, never blocked
3. **Customer dedup is by normalized phone** — two salesmen offline creating the same phone number must resolve to one customer
4. **Idempotency key is sacred** — `local_id` prevents any invoice from being inserted twice, even on retry
5. **Invoice status is append-only** — `pending → approved` and `pending → rejected` only; no going back
6. **Price at invoice time is captured** — `invoice_items.unit_price` is what was quoted; product price changes don't affect historical invoices
7. **Salesman cannot approve or reject** — `requireRole('admin')` on those endpoints, no exceptions
8. **Offline invoices get device timestamp** — `created_at_device` from the salesman's phone; `synced_at` is server time; sort by `created_at_device` for natural order

---

## 16. System Architecture

### Infrastructure Overview

```
                         INTERNET
                             │
                    ┌────────▼────────┐
                    │  Nginx (443)    │  ← SSL termination
                    │  Reverse Proxy  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     /api/*   │    /admin/*  │  /app/*      │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Fastify │  │ Next.js  │  │  Vite    │
        │  :3001   │  │  :3000   │  │  (static)│
        │  (API)   │  │  (Admin) │  │  (PWA)   │
        └────┬─────┘  └──────────┘  └──────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
┌──────────┐  ┌──────────┐
│ Postgres │  │  Redis   │
│  :5432   │  │  :6379   │
└──────────┘  └──────────┘
```

**Single VPS deployment** (2–4 GB RAM is sufficient for this scale)
Run everything with **Docker Compose** in production.
Nginx routes by subdomain or path prefix.

Suggested subdomains:
- `api.yourshop.com` → Fastify
- `admin.yourshop.com` → Next.js
- `app.yourshop.com` → Salesman PWA (static files)

### Docker Compose (production skeleton)

```yaml
# docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: wholesale
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]
    ports: ["6379:6379"]

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASS}@postgres:5432/wholesale
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    depends_on: [postgres, redis]
    ports: ["3001:3001"]

  admin:
    build: ./apps/admin
    environment:
      NEXT_PUBLIC_API_URL: https://api.yourshop.com
      NEXT_PUBLIC_WS_URL: wss://api.yourshop.com
    depends_on: [api]
    ports: ["3000:3000"]

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./apps/salesman/dist:/var/www/app   # built PWA static files
    ports: ["80:80", "443:443"]
    depends_on: [api, admin]

volumes:
  pgdata:
  redisdata:
```

---

### Request Flow A — Online Invoice Creation

```
Salesman App                 API                        Database
     │                        │                             │
     │  POST /invoices         │                             │
     │────────────────────────>│                             │
     │                        │  BEGIN transaction          │
     │                        │────────────────────────────>│
     │                        │                             │
     │                        │  1. resolve/create customer │
     │                        │────────────────────────────>│
     │                        │  2. INSERT invoices         │
     │                        │────────────────────────────>│
     │                        │  3. INSERT invoice_items    │
     │                        │────────────────────────────>│
     │                        │  4. UPDATE products         │
     │                        │     reserved_qty += qty     │
     │                        │────────────────────────────>│
     │                        │  5. INSERT payments         │
     │                        │────────────────────────────>│
     │                        │  COMMIT                     │
     │                        │────────────────────────────>│
     │                        │                             │
     │                        │  6. emit invoice:created    │
     │                        │     → admin WebSocket room  │
     │  201 { invoice }        │                             │
     │<────────────────────────│                             │
```

---

### Request Flow B — Offline Invoice + Sync

```
Salesman App (device)                API                  Database
       │                              │                       │
  [OFFLINE]                          │                       │
       │                              │                       │
  user creates invoice                │                       │
       │                              │                       │
  save to Dexie                       │                       │
  { sync_status: 'pending' }          │                       │
       │                              │                       │
  [WIFI RESTORED]                     │                       │
       │                              │                       │
  SyncManager.sync() fires            │                       │
       │                              │                       │
       │  POST /sync/push             │                       │
       │  { device_id, records[] }    │                       │
       │─────────────────────────────>│                       │
       │                              │  for each record:     │
       │                              │  check idempotency ──>│
       │                              │  (local_id exists?)   │
       │                              │                       │
       │                              │  if new:              │
       │                              │  run invoice tx ─────>│
       │                              │  (same as Flow A)     │
       │                              │                       │
       │                              │  if duplicate:        │
       │                              │  return existing id   │
       │                              │                       │
       │  { processed: [] }           │                       │
       │<─────────────────────────────│                       │
       │                              │                       │
  update Dexie records:               │                       │
  sync_status → 'synced'              │                       │
  server_id ← result.server_id        │                       │
  status ← 'pending'                  │                       │
       │                              │                       │
       │  GET /sync/pull?since=<ts>   │                       │
       │─────────────────────────────>│                       │
       │                              │  fetch delta catalog  │
       │                              │  + status updates ───>│
       │  { products, customers,      │                       │
       │    invoice_updates }         │                       │
       │<─────────────────────────────│                       │
       │                              │                       │
  update Dexie product/customer       │                       │
  cache + apply status changes        │                       │
```

---

### Request Flow C — Admin Approval

```
Admin Dashboard             API                         Database        Salesman App
      │                      │                              │                 │
      │ PATCH                │                              │                 │
      │ /invoices/:id/approve│                              │                 │
      │─────────────────────>│                              │                 │
      │                      │  BEGIN transaction           │                 │
      │                      │─────────────────────────────>│                 │
      │                      │  UPDATE invoices             │                 │
      │                      │  status = 'approved'         │                 │
      │                      │─────────────────────────────>│                 │
      │                      │  for each item:              │                 │
      │                      │  UPDATE products             │                 │
      │                      │  stock_qty   -= qty          │                 │
      │                      │  reserved_qty -= qty         │                 │
      │                      │─────────────────────────────>│                 │
      │                      │  collect stock warnings      │                 │
      │                      │  (if stock_qty < 0)          │                 │
      │                      │  COMMIT                      │                 │
      │                      │─────────────────────────────>│                 │
      │                      │                              │                 │
      │                      │  emit invoice:approved ──────────────────────>│
      │                      │  to salesman:{id} room                        │
      │                      │                              │                 │
      │  200 { warnings[] }  │                              │                 │
      │<─────────────────────│                              │                 │
      │                      │                              │                 │
  show warnings if any       │                              │                 │
  (stock went negative)      │                              │           update Dexie
                                                                        invoice status
```

---

### pg_notify → WebSocket Bridge

Postgres triggers fire `pg_notify('low_stock', payload)` when available stock drops below threshold (see schema.sql trigger). The API listens and bridges to WebSocket:

```typescript
// apps/api/src/plugins/db.ts
const pgClient = new Client({ connectionString: process.env.DATABASE_URL })
await pgClient.connect()
await pgClient.query('LISTEN low_stock')

pgClient.on('notification', (msg) => {
  if (msg.channel === 'low_stock') {
    const data = JSON.parse(msg.payload!)
    // io = your socket.io server instance
    io.to('admin').emit('stock:low', data)
  }
})
```

---

## 17. Salesman Management & App Onboarding

### Overview

The admin creates salesman accounts from the dashboard. There is no self-registration. Salesmen access the PWA via a URL shared by the admin — no app store involved.

```
Admin creates account
       │
       ▼
System generates credentials
       │
       ▼
Admin copies & shares via WhatsApp/SMS
  ┌────┴──────────────────┐
  │  URL: app.yourshop.com │
  │  Email: ali@shop.com   │
  │  Temp pass: Xk9#mP2    │
  └────┬──────────────────┘
       │
       ▼
Salesman opens URL in mobile browser
       │
       ▼
Login → forced password change → install prompt → first sync → live
```

---

### Database Change — Add to `users` table

```sql
-- Add to schema.sql users table definition:
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Set true when admin creates a salesman:
-- INSERT INTO users (..., must_change_password) VALUES (..., TRUE)
```

---

### New API Endpoints (add to Salesmen section)

#### `POST /salesmen` (admin only)
```typescript
// Request
{
  name:     string,
  email:    string,
  phone?:   string,
  password: string,   // admin sets a temp password
}

// Response 201
{
  id:                  string,
  name:                string,
  email:               string,
  role:                'salesman',
  must_change_password: true,
  onboarding: {
    app_url:    string,   // e.g. "https://app.yourshop.com"
    qr_payload: string,   // same URL — render as QR in UI
  }
}
```

#### `POST /salesmen/:id/reset-password` (admin only)
```typescript
// Request: {} (empty)
// Generates new temp password server-side

// Response 200
{
  temp_password: string,   // shown ONCE — admin copies and shares
}
// Side effect: sets must_change_password = true on the user row
```

#### `POST /auth/change-password` (salesman, authenticated)
```typescript
// Request
{
  current_password: string,
  new_password:     string,   // min 8 chars
}

// Response 200: {}
// Side effect: sets must_change_password = false
```

#### `GET /salesmen/:id`
```typescript
// Response 200
{
  id:          string,
  name:        string,
  email:       string,
  phone:       string | null,
  active:      boolean,
  created_at:  string,
  stats: {
    total_invoices:     number,
    approved_invoices:  number,
    total_revenue:      number,
    avg_order_value:    number,
    last_active_at:     string | null,
  },
  recent_invoices: Invoice[],   // last 10
}
```

---

### First-Login Force Password Change

**API side:** include `must_change_password` in the login response:
```typescript
// POST /auth/login response — add this field:
{
  access_token:         string,
  refresh_token:        string,
  must_change_password: boolean,   // ← add this
  user: { id, name, email, role }
}
```

**Salesman app routing:**
```typescript
// apps/salesman/src/main.tsx
// After login, check must_change_password:
const { must_change_password } = loginResponse
if (must_change_password) {
  navigate('/change-password')   // intercept all routes until done
}
```

**`/change-password` screen (salesman app):**
- Current password field
- New password field (min 8 chars)
- Confirm new password field
- Submit → `POST /auth/change-password`
- On success → navigate to Home, sync fires

---

### PWA Install Prompt (salesman app)

Add this component and show it after first successful login:

```typescript
// apps/salesman/src/components/InstallPrompt.tsx
import { useEffect, useState } from 'react'

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)

  useEffect(() => {
    if (!isStandalone) setShow(true)
  }, [])

  if (!show) return null

  return (
    <div className="install-banner">
      <p>Add this app to your home screen for offline use:</p>
      {isIOS && (
        <p>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></p>
      )}
      {isAndroid && (
        <p>Tap <strong>⋮</strong> → <strong>Add to Home Screen</strong></p>
      )}
      <button onClick={() => setShow(false)}>Dismiss</button>
    </div>
  )
}
```

Show `<InstallPrompt />` on the Home screen, below the sync badge. Dismiss state saved to localStorage so it doesn't appear every visit.

---

### First Sync on Login

After login (and after password change if required), trigger an immediate full pull:

```typescript
// apps/salesman/src/store/authStore.ts
// After setting auth state:
await syncManager.sync()   // pulls full catalog + customer list
```

This ensures the salesman has products and existing customers loaded locally before they go offline.

---

### Admin — Salesmen Page Layout

```
Salesmen                              [ + Add Salesman ]
─────────────────────────────────────────────────────────
Name         Email              Phone       Status   Revenue   Orders
Ali Khan     ali@shop.com       03xx...     Active   ₨84,200   23
Raza Ahmed   raza@shop.com      03xx...     Active   ₨61,400   17
Omar Sheikh  omar@shop.com      —           Inactive ₨0        0
─────────────────────────────────────────────────────────
  [Edit]  [Reset Password]  [Deactivate]   ← row actions
```

**Add Salesman Modal:**
```
Name         [ Ali Khan              ]
Email        [ ali@shop.com          ]
Phone        [ 0300-1234567          ]
Password     [ ••••••••  ] (admin sets, will be changed on first login)

                          [ Cancel ]  [ Create & Get Link ]
```

**After creation — show once:**
```
┌─────────────────────────────────────┐
│  Salesman created ✓                 │
│                                     │
│  Share these with Ali:              │
│  App URL: app.yourshop.com          │
│  Email:   ali@shop.com              │
│  Password: Xk9#mP2j                 │
│                                     │
│  [Copy all]  [QR Code for URL]      │
│                                     │
│  Ali must change the password on    │
│  first login.                       │
└─────────────────────────────────────┘
```

**QR Code:** use the `qrcode` npm package to render the app URL as a QR code image in the modal. Salesman can scan it instead of typing the URL.

```typescript
// In the admin app, after creating salesman:
import QRCode from 'qrcode'

const qrDataUrl = await QRCode.toDataURL('https://app.yourshop.com')
// Render as <img src={qrDataUrl} />
```

---

### Implementation Tasks (add to Phase 9)

- [ ] **9.3** Schema: add `must_change_password` column to users table
- [ ] **9.4** API: `POST /salesmen` — create user, return onboarding payload (app_url, qr_payload)
- [ ] **9.5** API: `POST /salesmen/:id/reset-password` — generate temp password, set flag
- [ ] **9.6** API: `POST /auth/change-password` — validate current, hash new, clear flag
- [ ] **9.7** API: `GET /salesmen/:id` — detail + stats + recent invoices
- [ ] **9.8** API: include `must_change_password` in login response
- [ ] **9.9** Admin: Add Salesman modal with form + post-creation credential card
- [ ] **9.10** Admin: QR code rendered via `qrcode` package on app URL
- [ ] **9.11** Admin: Reset Password action — show temp password once in modal
- [ ] **9.12** Admin: Salesman detail page — stats + recent invoices
- [ ] **9.13** Salesman app: `/change-password` screen, intercept routing until complete
- [ ] **9.14** Salesman app: `<InstallPrompt />` component shown post-login
- [ ] **9.15** Salesman app: trigger full sync immediately after login/password change

---

## 18. Updated Business Rules

*Appended to Section 15 rules:*

9. **Salesman accounts are admin-created only** — no self-registration endpoint exists; `POST /salesmen` is `requireRole('admin')`
10. **Temp password must be changed on first login** — `must_change_password: true` blocks access to all salesman app routes until `POST /auth/change-password` completes
11. **Deactivated salesman cannot log in** — login endpoint checks `active = true` before issuing tokens; existing tokens for inactive users are rejected at `requireRole` middleware
12. **Reset password is shown exactly once** — the plain-text temp password is returned only in the `POST /salesmen/:id/reset-password` response body; it is never stored or retrievable again
