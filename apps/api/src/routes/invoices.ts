import type { FastifyInstance } from 'fastify'
import { withTransaction } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { hub } from '../ws.js'
import {
  processInvoice, approveInvoice, rejectInvoice, getInvoiceById, listInvoices,
} from '../services/invoice.service.js'
import { CreateInvoiceSchema, RejectInvoiceSchema, InvoiceQuerySchema } from '@wholesale/shared'

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/invoices', { preHandler: authenticate }, async (req, reply) => {
    const parsed = InvoiceQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const user = req.authUser!
    const filters = { ...parsed.data }
    // Salesmen can only ever see their own invoices.
    if (user.role === 'salesman') filters.salesman_id = user.id
    const { data, total } = await listInvoices(filters as any)
    return { data, total, page: parsed.data.page, limit: parsed.data.limit }
  })

  app.get('/invoices/:id', { preHandler: authenticate }, async (req, reply) => {
    const id = (req.params as any).id
    const invoice = await getInvoiceById(id)
    if (!invoice) return reply.status(404).send({ error: 'NOT_FOUND' })
    if (req.authUser!.role === 'salesman' && invoice.salesman.id !== req.authUser!.id) {
      return reply.status(403).send({ error: 'FORBIDDEN' })
    }
    return invoice
  })

  app.post('/invoices', { preHandler: requireRole('salesman', 'admin') }, async (req, reply) => {
    const parsed = CreateInvoiceSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const user = req.authUser!
    const result = await withTransaction((client) => processInvoice(client, parsed.data, user.id))
    if (result.status === 'conflict') return reply.status(409).send(result)
    const invoice = await getInvoiceById(result.server_id!)
    if (invoice && result.status === 'created') {
      hub.emitAdmin({
        event: 'invoice:created',
        data: {
          invoice_id: invoice.id,
          salesman: invoice.salesman,
          customer: { id: invoice.customer.id, name: invoice.customer.name },
          total_amount: invoice.total_amount,
          item_count: invoice.items.length,
        },
      })
    }
    return reply.status(201).send(invoice)
  })

  app.patch('/invoices/:id/approve', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = (req.params as any).id
    const admin = req.authUser!
    try {
      const { warnings } = await withTransaction((client) => approveInvoice(client, id, admin.id))
      const invoice = await getInvoiceById(id)
      if (invoice) hub.emitSalesman(invoice.salesman.id, { event: 'invoice:approved', data: { invoice_id: id } })
      return { ...invoice, warnings }
    } catch (e: any) {
      if (e.message === 'INVOICE_NOT_FOUND_OR_NOT_PENDING') return reply.status(409).send({ error: e.message })
      throw e
    }
  })

  app.patch('/invoices/:id/reject', { preHandler: requireRole('admin') }, async (req, reply) => {
    const parsed = RejectInvoiceSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION', details: parsed.error.flatten() })
    const id = (req.params as any).id
    try {
      await withTransaction((client) => rejectInvoice(client, id, parsed.data.reason))
      const invoice = await getInvoiceById(id)
      if (invoice) hub.emitSalesman(invoice.salesman.id, { event: 'invoice:rejected', data: { invoice_id: id, reason: parsed.data.reason } })
      return invoice
    } catch (e: any) {
      if (e.message === 'INVOICE_NOT_FOUND_OR_NOT_PENDING') return reply.status(409).send({ error: e.message })
      throw e
    }
  })
}
