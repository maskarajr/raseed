import type { FastifyRequest, FastifyReply } from 'fastify'
import { isBlacklisted } from './redis.js'

export interface JwtUser {
  id: string
  name: string
  email: string
  role: 'salesman' | 'admin'
  jti?: string
  type?: 'access' | 'refresh'
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: JwtUser
  }
}

// Verify access token, reject blacklisted / wrong-type tokens, attach user.
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<JwtUser>()
    if (payload.type && payload.type !== 'access') {
      return reply.status(401).send({ error: 'UNAUTHORIZED' })
    }
    if (payload.jti && (await isBlacklisted(payload.jti))) {
      return reply.status(401).send({ error: 'TOKEN_REVOKED' })
    }
    request.authUser = payload
  } catch {
    return reply.status(401).send({ error: 'UNAUTHORIZED' })
  }
}

export function requireRole(...roles: Array<'salesman' | 'admin'>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await authenticate(request, reply)
    if (reply.sent) return
    const user = request.authUser!
    if (!roles.includes(user.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN' })
    }
  }
}
