import pg from 'pg'
import { env } from './env.js'

// Keep NUMERIC as float so JSON responses carry numbers, not strings.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)))

const { Pool, Client } = pg

export const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 })

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as any[])
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Dedicated LISTEN connection bridging pg_notify('low_stock') to a callback.
export async function startLowStockListener(onLowStock: (payload: any) => void): Promise<void> {
  const client = new Client({ connectionString: env.DATABASE_URL })
  await client.connect()
  await client.query('LISTEN low_stock')
  client.on('notification', (msg) => {
    if (msg.channel === 'low_stock' && msg.payload) {
      try {
        onLowStock(JSON.parse(msg.payload))
      } catch {
        /* ignore malformed payloads */
      }
    }
  })
  client.on('error', (e) => console.error('[low_stock listener]', e.message))
}
