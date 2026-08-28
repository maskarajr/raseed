// ============================================================
// packages/shared/src/index.ts
// Source of truth for all API contracts.
// Imported by apps/api (validation) and apps/admin + apps/salesman (types).
// ============================================================

import { z } from 'zod'

// ─── Primitives ───────────────────────────────────────────────

export const UUIDSchema = z.string().uuid()

export const InvoiceStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
])

export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>

export const UserRoleSchema = z.enum(['salesman', 'admin'])
export type UserRole = z.infer<typeof UserRoleSchema>

// ─── User ─────────────────────────────────────────────────────

export const UserSchema = z.object({
  id:                   z.string().uuid(),
  name:                 z.string(),
  email:                z.string().email(),
  role:                 UserRoleSchema,
  phone:                z.string().nullable(),
  active:               z.boolean(),
  must_change_password: z.boolean(),
  last_active_at:       z.string().datetime().nullable(),
  created_at:           z.string().datetime(),
})
export type User = z.infer<typeof UserSchema>

export const CreateUserSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     UserRoleSchema.default('salesman'),
  phone:    z.string().optional(),
})
export type CreateUserInput = z.infer<typeof CreateUserSchema>

// ─── Salesman Management ──────────────────────────────────────

export const CreateSalesmanSchema = z.object({
  name:     z.string().min(1, 'Name is required'),
  email:    z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone:    z.string().optional(),
})
export type CreateSalesmanInput = z.infer<typeof CreateSalesmanSchema>

export const UpdateSalesmanSchema = z.object({
  name:   z.string().min(1).optional(),
  phone:  z.string().optional(),
  active: z.boolean().optional(),
})
export type UpdateSalesmanInput = z.infer<typeof UpdateSalesmanSchema>

// Returned immediately after POST /salesmen — shown once to admin
export const CreateSalesmanResponseSchema = z.object({
  id:                   z.string().uuid(),
  name:                 z.string(),
  email:                z.string().email(),
  role:                 z.literal('salesman'),
  must_change_password: z.literal(true),
  onboarding: z.object({
    app_url:    z.string().url(),   // e.g. https://app.yourshop.com
    qr_payload: z.string(),         // same URL — render with qrcode package
  }),
})
export type CreateSalesmanResponse = z.infer<typeof CreateSalesmanResponseSchema>

// Returned from POST /salesmen/:id/reset-password — temp password shown once
export const ResetPasswordResponseSchema = z.object({
  temp_password: z.string(),   // plain text, never stored — show once and discard
})
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>

// POST /auth/change-password
export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password:     z.string().min(8, 'New password must be at least 8 characters'),
}).refine(
  d => d.current_password !== d.new_password,
  { message: 'New password must differ from current password', path: ['new_password'] }
)
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>

// Salesman stats (embedded in list + detail responses)
export const SalesmanStatsSchema = z.object({
  total_invoices:    z.number().int(),
  approved_invoices: z.number().int(),
  total_revenue:     z.number(),
  avg_order_value:   z.number(),
  last_active_at:    z.string().datetime().nullable(),
})
export type SalesmanStats = z.infer<typeof SalesmanStatsSchema>

// GET /salesmen (list item)
export const SalesmanListItemSchema = UserSchema.extend({
  stats: SalesmanStatsSchema,
})
export type SalesmanListItem = z.infer<typeof SalesmanListItemSchema>

// GET /salesmen/:id (detail)
export const SalesmanDetailSchema = SalesmanListItemSchema.extend({
  recent_invoices: z.array(z.lazy(() => InvoiceSchema)),
})
// Note: InvoiceSchema is defined later in the file — use as type only
export type SalesmanDetail = Omit<SalesmanListItem, never> & {
  stats:           SalesmanStats
  recent_invoices: Invoice[]
}

// ─── Auth ─────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof LoginSchema>

export const LoginResponseSchema = z.object({
  access_token:         z.string(),
  refresh_token:        z.string(),
  must_change_password: z.boolean(),
  user: UserSchema.pick({ id: true, name: true, email: true, role: true }),
})
export type LoginResponse = z.infer<typeof LoginResponseSchema>

// ─── Customer ─────────────────────────────────────────────────

export const CustomerSchema = z.object({
  id:         z.string().uuid(),
  name:       z.string(),
  phone:      z.string(),
  address:    z.string().nullable(),
  notes:      z.string().nullable(),
  created_by: z.object({ id: z.string().uuid(), name: z.string() }),
  created_at: z.string().datetime(),
  stats: z.object({
    total_orders:        z.number(),
    total_spent:         z.number(),
    outstanding_balance: z.number(),
  }).optional(),
})
export type Customer = z.infer<typeof CustomerSchema>

export const CreateCustomerSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  phone:   z.string().min(7, 'Phone number too short'),
  address: z.string().optional(),
  notes:   z.string().optional(),
})
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>

// ─── Product ──────────────────────────────────────────────────

export const ProductSchema = z.object({
  id:                z.string().uuid(),
  name:              z.string(),
  sku:               z.string(),
  category:          z.string().nullable(),
  unit:              z.string(),
  price:             z.number(),
  stock_qty:         z.number().int(),
  reserved_qty:      z.number().int(),
  available_qty:     z.number().int(),   // computed: stock_qty - reserved_qty
  reorder_threshold: z.number().int().nullable(),
  active:            z.boolean(),
})
export type Product = z.infer<typeof ProductSchema>

export const CreateProductSchema = z.object({
  name:              z.string().min(1),
  sku:               z.string().min(1),
  category:          z.string().optional(),
  unit:              z.string().default('pcs'),
  price:             z.number().positive(),
  stock_qty:         z.number().int().min(0).default(0),
  reorder_threshold: z.number().int().positive().optional(),
})
export type CreateProductInput = z.infer<typeof CreateProductSchema>

export const UpdateProductSchema = CreateProductSchema.partial()
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>

export const StockAdjustmentSchema = z.object({
  adjustment: z.number().int().refine(n => n !== 0, 'Adjustment cannot be zero'),
  reason:     z.string().min(1),
})
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>

// ─── Invoice ──────────────────────────────────────────────────

export const InvoiceItemInputSchema = z.object({
  product_id: z.string().uuid(),
  qty:        z.number().int().positive(),
  unit_price: z.number().positive(),
})
export type InvoiceItemInput = z.infer<typeof InvoiceItemInputSchema>

export const CreateInvoiceSchema = z.object({
  customer_id:       z.string().uuid().optional(),
  new_customer:      CreateCustomerSchema.optional(),
  items:             z.array(InvoiceItemInputSchema).min(1, 'At least one item required'),
  notes:             z.string().optional(),
  local_id:          z.string().min(1),           // device idempotency key
  created_at_device: z.string().datetime(),        // ISO from device clock
}).refine(
  data => data.customer_id || data.new_customer,
  { message: 'Either customer_id or new_customer is required' }
)
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>

export const InvoiceItemSchema = z.object({
  id:       z.string().uuid(),
  product: z.object({
    id:   z.string().uuid(),
    name: z.string(),
    sku:  z.string(),
    unit: z.string(),
  }),
  qty:       z.number().int(),
  unit_price: z.number(),
  subtotal:   z.number(),
})
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>

export const InvoiceSchema = z.object({
  id:               z.string().uuid(),
  local_id:         z.string(),
  salesman: z.object({ id: z.string().uuid(), name: z.string() }),
  customer: z.object({ id: z.string().uuid(), name: z.string(), phone: z.string() }),
  items:            z.array(InvoiceItemSchema),
  total_amount:     z.number(),
  status:           InvoiceStatusSchema,
  notes:            z.string().nullable(),
  rejection_reason: z.string().nullable(),
  created_at_device: z.string().datetime(),
  synced_at:        z.string().datetime(),
  approved_at:      z.string().datetime().nullable(),
})
export type Invoice = z.infer<typeof InvoiceSchema>

export const RejectInvoiceSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
})
export type RejectInvoiceInput = z.infer<typeof RejectInvoiceSchema>

// ─── Sync ─────────────────────────────────────────────────────

export const SyncRecordSchema = z.object({
  type:    z.literal('invoice'),
  payload: CreateInvoiceSchema,
})
export type SyncRecord = z.infer<typeof SyncRecordSchema>

export const SyncPushSchema = z.object({
  device_id: z.string().min(1),
  records:   z.array(SyncRecordSchema).min(1),
})
export type SyncPushInput = z.infer<typeof SyncPushSchema>

export const SyncPushResultItemSchema = z.object({
  local_id:         z.string(),
  status:           z.enum(['created', 'duplicate', 'conflict']),
  server_id:        z.string().uuid().optional(),
  customer_id:      z.string().uuid().optional(),
  conflict_reason:  z.string().optional(),
})
export type SyncPushResultItem = z.infer<typeof SyncPushResultItemSchema>

export const SyncPushResponseSchema = z.object({
  processed: z.array(SyncPushResultItemSchema),
})
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>

export const SyncPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
})
export type SyncPullQuery = z.infer<typeof SyncPullQuerySchema>

export const InvoiceUpdateSchema = z.object({
  local_id:         z.string(),
  server_id:        z.string().uuid(),
  status:           InvoiceStatusSchema,
  rejection_reason: z.string().nullable().optional(),
})

export const SyncPullResponseSchema = z.object({
  products:        z.array(ProductSchema),
  customers:       z.array(CustomerSchema),
  invoice_updates: z.array(InvoiceUpdateSchema),
  pulled_at:       z.string().datetime(),
})
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>

// ─── Payments ─────────────────────────────────────────────────

export const PaymentSchema = z.object({
  id:           z.string().uuid(),
  invoice_id:   z.string().uuid(),
  customer:     z.object({ id: z.string().uuid(), name: z.string(), phone: z.string() }),
  amount_due:   z.number(),
  amount_paid:  z.number(),
  balance:      z.number(),
  payment_mode: z.enum(['cash', 'credit', 'mixed']).nullable(),
  due_date:     z.string().nullable(),
  paid_at:      z.string().datetime().nullable(),
  created_at:   z.string().datetime(),
})
export type Payment = z.infer<typeof PaymentSchema>

// ─── Analytics ────────────────────────────────────────────────

export const SalesSeriesSchema = z.object({
  series: z.array(z.object({
    date:        z.string(),
    revenue:     z.number(),
    order_count: z.number(),
  }))
})
export type SalesSeries = z.infer<typeof SalesSeriesSchema>

export const SalesmanStatSchema = z.object({
  salesman:        z.object({ id: z.string().uuid(), name: z.string() }),
  order_count:     z.number(),
  revenue:         z.number(),
  avg_order_value: z.number(),
})
export type SalesmanStat = z.infer<typeof SalesmanStatSchema>

export const TopProductSchema = z.object({
  product:    z.object({ id: z.string().uuid(), name: z.string(), sku: z.string() }),
  units_sold: z.number(),
  revenue:    z.number(),
})
export type TopProduct = z.infer<typeof TopProductSchema>

export const ReceivableSchema = z.object({
  customer:        z.object({ id: z.string().uuid(), name: z.string(), phone: z.string() }),
  invoices_count:  z.number(),
  amount_due:      z.number(),
  amount_paid:     z.number(),
  balance:         z.number(),
  oldest_unpaid_at: z.string().datetime(),
})
export type Receivable = z.infer<typeof ReceivableSchema>

// ─── WebSocket Events ─────────────────────────────────────────

export interface WsInvoiceCreated {
  event: 'invoice:created'
  data: {
    invoice_id:   string
    salesman:     { id: string; name: string }
    customer:     { id: string; name: string }
    total_amount: number
    item_count:   number
  }
}

export interface WsInvoiceApproved {
  event: 'invoice:approved'
  data: { invoice_id: string }
}

export interface WsInvoiceRejected {
  event: 'invoice:rejected'
  data: { invoice_id: string; reason: string }
}

export interface WsStockLow {
  event: 'stock:low'
  data: {
    product_id:    string
    name:          string
    available_qty: number
    threshold:     number
  }
}

// Emitted to admin room when a salesman's active status changes
export interface WsSalesmanStatusChanged {
  event: 'salesman:status_changed'
  data: {
    salesman_id: string
    name:        string
    active:      boolean
  }
}

export type WsEvent =
  | WsInvoiceCreated
  | WsInvoiceApproved
  | WsInvoiceRejected
  | WsStockLow
  | WsSalesmanStatusChanged

// ─── Pagination ───────────────────────────────────────────────

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data:  z.array(itemSchema),
    total: z.number(),
    page:  z.number(),
    limit: z.number(),
  })

export type PaginatedResponse<T> = {
  data:  T[]
  total: number
  page:  number
  limit: number
}

// ─── Salesman App — PWA / Install ────────────────────────────
// Used by InstallPrompt component in apps/salesman

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'unknown'

export function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/win|mac|linux/.test(ua)) return 'desktop'
  return 'unknown'
}

export function isStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

// ─── Common Query Params ──────────────────────────────────────

export const PaginationSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
})

export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to:   z.string().datetime().optional(),
})

export const InvoiceQuerySchema = PaginationSchema.merge(DateRangeSchema).extend({
  status:      InvoiceStatusSchema.optional(),
  salesman_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
})
export type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>
