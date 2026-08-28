import Dexie, { type EntityTable } from 'dexie'

export interface LocalProduct {
  id: string
  name: string
  sku: string
  unit: string
  price: number
  available_qty: number
  category?: string | null
}

export interface LocalCustomer {
  id: string
  name: string
  phone: string
  address?: string | null
}

export interface LocalInvoiceItem {
  product_id: string
  product_name: string
  qty: number
  unit_price: number
}

export interface LocalInvoice {
  local_id: string
  server_id?: string
  customer_id?: string
  new_customer?: { name: string; phone: string; address?: string }
  customer_label: string
  items: LocalInvoiceItem[]
  total_amount: number
  status: string
  sync_status: 'pending' | 'synced' | 'conflict'
  conflict_reason?: string
  rejection_reason?: string
  created_at_device: string
  notes?: string
}

class AppDB extends Dexie {
  products!: EntityTable<LocalProduct, 'id'>
  customers!: EntityTable<LocalCustomer, 'id'>
  invoices!: EntityTable<LocalInvoice, 'local_id'>

  constructor() {
    super('wholesale_salesman')
    this.version(1).stores({
      products: 'id, name, sku',
      customers: 'id, phone, name',
      invoices: 'local_id, sync_status, server_id, created_at_device',
    })
  }
}

export const db = new AppDB()
