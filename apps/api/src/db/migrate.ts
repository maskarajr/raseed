import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { pool } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaPath = resolve(__dirname, '../../../../schema.sql')

async function main() {
  const exists = await pool.query(
    `SELECT to_regclass('public.users') AS t`,
  )
  if (exists.rows[0].t) {
    console.log('[migrate] schema already applied (users table present) — skipping')
    await pool.end()
    return
  }
  const sql = readFileSync(schemaPath, 'utf8')
  await pool.query(sql)
  console.log('[migrate] schema applied from schema.sql')
  await pool.end()
}

main().catch((e) => {
  console.error('[migrate] failed:', e.message)
  process.exit(1)
})
