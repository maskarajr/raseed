import { db } from '../db'
import { api } from '../lib/api'
import { getDeviceId } from '../lib/deviceId'
import { useSyncStore } from '../store/syncStore'

// Manual-override flag lets the demo simulate offline mode from the UI.
let forcedOffline = false
export function setForcedOffline(v: boolean): void {
  forcedOffline = v
  if (v) useSyncStore.getState().setStatus('offline')
  else useSyncStore.getState().setStatus('idle')
}
export function isOnline(): boolean {
  return navigator.onLine && !forcedOffline
}

export class SyncManager {
  private running = false

  async refreshPendingCount(): Promise<void> {
    const n = await db.invoices.where('sync_status').equals('pending').count()
    useSyncStore.getState().setPendingCount(n)
  }

  async sync(): Promise<void> {
    if (this.running) return
    if (!isOnline()) {
      useSyncStore.getState().setStatus('offline')
      return
    }
    this.running = true
    useSyncStore.getState().setStatus('syncing')
    try {
      await this.push()
      await this.pull()
      useSyncStore.getState().setStatus('synced')
      useSyncStore.getState().setLastSyncedAt(new Date().toISOString())
    } catch (err) {
      console.error('[sync] error', err)
      useSyncStore.getState().setStatus('error')
    } finally {
      this.running = false
      await this.refreshPendingCount()
    }
  }

  private async push(): Promise<void> {
    const pending = await db.invoices.where('sync_status').equals('pending').toArray()
    if (pending.length === 0) return
    const { processed } = await api.post<any>('/sync/push', {
      device_id: getDeviceId(),
      records: pending.map((inv) => ({
        type: 'invoice',
        payload: {
          customer_id: inv.customer_id,
          new_customer: inv.new_customer,
          items: inv.items.map((it) => ({ product_id: it.product_id, qty: it.qty, unit_price: it.unit_price })),
          notes: inv.notes,
          local_id: inv.local_id,
          created_at_device: inv.created_at_device,
        },
      })),
    })
    for (const result of processed) {
      if (result.status === 'created' || result.status === 'duplicate') {
        await db.invoices.update(result.local_id, {
          sync_status: 'synced',
          server_id: result.server_id,
          customer_id: result.customer_id ?? undefined,
          status: 'pending',
        })
      } else if (result.status === 'conflict') {
        await db.invoices.update(result.local_id, {
          sync_status: 'conflict',
          conflict_reason: result.conflict_reason,
        })
      }
    }
  }

  private async pull(): Promise<void> {
    const since = localStorage.getItem('last_pull_at') ?? undefined
    const data = await api.get<any>('/sync/pull', { params: { since } })

    await db.products.bulkPut(
      data.products.map((p: any) => ({
        id: p.id, name: p.name, sku: p.sku, unit: p.unit,
        price: p.price, available_qty: p.available_qty, category: p.category,
      })),
    )
    await db.customers.bulkPut(
      data.customers.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, address: c.address })),
    )

    for (const update of data.invoice_updates) {
      const local = await db.invoices.where('server_id').equals(update.server_id).first()
      if (local) {
        await db.invoices.update(local.local_id, {
          status: update.status,
          rejection_reason: update.rejection_reason ?? undefined,
        })
      }
    }
    localStorage.setItem('last_pull_at', data.pulled_at)
  }
}

export const syncManager = new SyncManager()
