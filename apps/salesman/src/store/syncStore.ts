import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline'

interface SyncState {
  status: SyncStatus
  pendingCount: number
  lastSyncedAt: string | null
  setStatus: (s: SyncStatus) => void
  setPendingCount: (n: number) => void
  setLastSyncedAt: (t: string) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  status: navigator.onLine ? 'idle' : 'offline',
  pendingCount: 0,
  lastSyncedAt: null,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}))
