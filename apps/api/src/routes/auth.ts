import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { query } from '../db.js'
import { blacklistToken } from '../redis.js'
import { authenticate } from '../auth.js'
import { env } from '../env.js'
import { LoginSchema, ChangePasswordSchema } from '@wholesale/shared'

function signTokens(app: FastifyInstance, user: { id: string; name: string; email: string; role: string }) {
  const jti = randomUUID()
  const access_token = app.jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, type: 'access', jti },
    { expiresIn: env.JWT_ACCESS_EXPIRES },
  )
  const refresh_token = app.jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, type: 'refresh', jti },
    { expiresIn: env.JWT_REFRESH_EXPIRES },
  )
  return { access_token, refresh_token }
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })

    const { email, password } = parsed.data
    const { rows: [user] } = await query(
      'SELECT id, name, email, password_hash, role, active, must_change_password FROM users WHERE email = $1',
      [email],
    )
    if (!user || !user.active) return reply.status(401).send({ error: 'INVALID_CREDENTIALS' })

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return reply.status(401).send({ error: 'INVALID_CREDENTIALS' })

    await query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [user.id])
    const { access_token, refresh_token } = signTokens(app, user)

    reply.setCookie('refresh_token', refresh_token, {
      httpOnly: true, path: '/', sameSite: 'lax', maxAge: 7 * 24 * 3600,
    })
    return {
      access_token,
      refresh_token,
      must_change_password: user.must_change_password,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }
  })

  app.post('/auth/refresh', async (req, reply) => {
    const bodyToken = (req.body as any)?.refresh_token as string | undefined
    const token = bodyToken ?? req.cookies?.refresh_token
    if (!token) return reply.status(401).send({ error: 'NO_REFRESH_TOKEN' })
    try {
      const payload = app.jwt.verify<any>(token)
      if (payload.type !== 'refresh') return reply.status(401).send({ error: 'INVALID_TOKEN' })
      const { access_token } = signTokens(app, payload)
      return { access_token }
    } catch {
      return reply.status(401).send({ error: 'INVALID_TOKEN' })
    }
  })

  app.post('/auth/logout', { preHandler: authenticate }, async (req, reply) => {
    const user = req.authUser!
    if (user.jti) {
      // Blacklist for the max refresh window so both tokens are rejected.
      await blacklistToken(user.jti, 7 * 24 * 3600)
    }
    reply.clearCookie('refresh_token', { path: '/' })
    return reply.status(204).send()
  })

  app.post('/auth/change-password', { preHandler: authenticate }, async (req, reply) => {
    const parsed = ChangePasswordSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const user = req.authUser!
    const { rows: [row] } = await query('SELECT password_hash FROM users WHERE id = $1', [user.id])
    if (!row) return reply.status(404).send({ error: 'USER_NOT_FOUND' })
    const ok = await bcrypt.compare(parsed.data.current_password, row.password_hash)
    if (!ok) return reply.status(400).send({ error: 'INVALID_CURRENT_PASSWORD' })
    const hash = await bcrypt.hash(parsed.data.new_password, 10)
    await query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
      [hash, user.id],
    )
    return {}
  })

  app.get('/auth/me', { preHandler: authenticate }, async (req) => {
    const user = req.authUser!
    const { rows: [row] } = await query(
      'SELECT id, name, email, role, phone, active, must_change_password, last_active_at, created_at FROM users WHERE id = $1',
      [user.id],
    )
    return row
  })
}
