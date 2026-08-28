import { useSyncStore } from '../store/syncStore'
import { syncManager, isOnline } from '../sync/SyncManager'

const LABELS: Record<string, string> = {
  idle: 'Idle', syncing: 'Syncing…', synced: 'Synced', error: 'Sync error', offline: 'Offline',
}

export function SyncBadge() {
  const { status, pendingCount } = useSyncStore()
  const cls = status === 'synced' ? 'synced' : status === 'offline' ? 'offline' : status === 'error' ? 'rejected' : 'pending'
  return (
    <div className="between">
      <div className="row" style={{ gap: 8 }}>
        <span className={`pill ${cls}`} data-testid="sync-status">{LABELS[status]}</span>
        {pendingCount > 0 && <span className="badge-count" data-testid="pending-count">{pendingCount} pending</span>}
      </div>
      <button
        className="btn secondary small"
        data-testid="sync-now"
        disabled={!isOnline() || status === 'syncing'}
        onClick={() => syncManager.sync()}
      >
        Sync now
      </button>
    </div>
  )
}
