import Redis from 'ioredis'
import { env } from './env.js'

export const redis = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 })

redis.on('error', (e) => console.error('[redis]', e.message))

const BLACKLIST_PREFIX = 'jwt:blacklist:'

export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  await redis.set(`${BLACKLIST_PREFIX}${jti}`, '1', 'EX', Math.max(1, ttlSeconds))
}

export async function isBlacklisted(jti: string): Promise<boolean> {
  return (await redis.exists(`${BLACKLIST_PREFIX}${jti}`)) === 1
}
