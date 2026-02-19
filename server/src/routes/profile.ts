import { Router } from 'express'
import { db } from '../db'
import { cvProfiles } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { CVProfile } from '../../../shared/types'

const router = Router()

// GET /api/profile — return the single CV profile
router.get('/', (_req, res) => {
  try {
    const rows = db.select().from(cvProfiles).all()
    if (rows.length === 0) return res.status(404).json({ error: 'No profile found' })
    const latest = rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    res.json(JSON.parse(latest.data))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/profile — upsert (create or replace)
router.post('/', (req, res) => {
  try {
    const profile: CVProfile = req.body
    const now = new Date().toISOString()
    profile.updatedAt = now
    db.insert(cvProfiles)
      .values({ id: profile.id, data: JSON.stringify(profile), updatedAt: now })
      .onConflictDoUpdate({
        target: cvProfiles.id,
        set: { data: JSON.stringify(profile), updatedAt: now },
      })
      .run()
    res.json(profile)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/profile — partial update (merge patch)
router.put('/', (req, res) => {
  try {
    const rows = db.select().from(cvProfiles).all()
    if (rows.length === 0) return res.status(404).json({ error: 'No profile found' })
    const latest = rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    const existing: CVProfile = JSON.parse(latest.data)
    const updated: CVProfile = { ...existing, ...req.body, updatedAt: new Date().toISOString() }
    db.update(cvProfiles)
      .set({ data: JSON.stringify(updated), updatedAt: updated.updatedAt })
      .where(eq(cvProfiles.id, latest.id))
      .run()
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/profile — clear profile
router.delete('/', (_req, res) => {
  try {
    db.delete(cvProfiles).run()
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
