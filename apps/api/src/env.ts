import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Load root .env (monorepo root is three levels up from apps/api/src)
config({ path: resolve(__dirname, '../../../.env') })

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://wholesale:password@localhost:5432/wholesale',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-jwt-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  API_PORT: Number(process.env.API_PORT ?? 3001),
  API_HOST: process.env.API_HOST ?? '0.0.0.0',
}
