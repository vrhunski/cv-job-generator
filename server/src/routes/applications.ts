import { Router } from 'express'
import { db } from '../db'
import { jobApplications } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { JobApplication } from '../../../shared/types'

const router = Router()

function rowToApp(row: typeof jobApplications.$inferSelect): JobApplication {
  return {
    id: row.id,
    company: row.company,
    jobTitle: row.jobTitle,
    appliedDate: row.appliedDate,
    status: row.status as JobApplication['status'],
    notes: row.notes ?? undefined,
    senderEmail: row.senderEmail ?? undefined,
    sessionId: row.sessionId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// GET /api/applications
router.get('/', (_req, res) => {
  try {
    const rows = db.select().from(jobApplications).all()
    res.json(rows.map(rowToApp))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/applications
router.post('/', (req, res) => {
  try {
    const body = req.body as Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    db.insert(jobApplications).values({
      id,
      company: body.company,
      jobTitle: body.jobTitle,
      appliedDate: body.appliedDate,
      status: body.status,
      notes: body.notes ?? null,
      senderEmail: body.senderEmail ?? null,
      sessionId: body.sessionId ?? null,
      createdAt: now,
      updatedAt: now,
    }).run()
    const row = db.select().from(jobApplications).where(eq(jobApplications.id, id)).get()!
    res.status(201).json(rowToApp(row))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/applications/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const patch = req.body as Partial<Pick<JobApplication, 'company' | 'jobTitle' | 'appliedDate' | 'status' | 'notes' | 'sessionId'>>
    const now = new Date().toISOString()
    db.update(jobApplications)
      .set({ ...patch, updatedAt: now })
      .where(eq(jobApplications.id, id))
      .run()
    const row = db.select().from(jobApplications).where(eq(jobApplications.id, id)).get()
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(rowToApp(row))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/applications/:id
router.delete('/:id', (req, res) => {
  try {
    db.delete(jobApplications).where(eq(jobApplications.id, req.params.id)).run()
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
