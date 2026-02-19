# SQLite + Drizzle Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace localStorage with a server-side SQLite database for CVProfile and JobApplication data, and expose REST API endpoints the client composables call instead of reading/writing localStorage.

**Architecture:** Drizzle ORM + better-sqlite3 embedded in the Express server. CVProfile stored as a JSON blob in `cv_profiles` table. JobApplications fully normalized in `job_applications` table. Drizzle `migrate()` runs automatically on server startup. Client composables (`useProfile`, `useApplications`) swapped from localStorage to `fetch()` calls. A one-time migration utility imports existing localStorage data into the DB.

**Tech Stack:** `better-sqlite3`, `drizzle-orm`, `drizzle-kit`, Express, Vue 3 composables with `fetch`

---

## Task 1: Install server dependencies

**Files:**
- Modify: `server/package.json` (via npm install)

**Step 1: Install runtime deps**

```bash
npm install --workspace=server --cache /tmp/npm-cache-bv \
  better-sqlite3 drizzle-orm
```

**Step 2: Install dev deps**

```bash
npm install --workspace=server --cache /tmp/npm-cache-bv --save-dev \
  @types/better-sqlite3 drizzle-kit
```

**Step 3: Verify**

```bash
cat server/package.json | grep -E "better-sqlite3|drizzle"
```
Expected: all four packages listed.

**Step 4: Commit**

```bash
git add server/package.json package-lock.json
git commit -m "chore: add better-sqlite3 and drizzle-orm to server deps"
```

---

## Task 2: Create Drizzle schema

**Files:**
- Create: `server/src/db/schema.ts`

**Step 1: Create the file**

```typescript
// server/src/db/schema.ts
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const cvProfiles = sqliteTable('cv_profiles', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),       // full CVProfile as JSON string
  updatedAt: text('updated_at').notNull(),
})

export const jobApplications = sqliteTable('job_applications', {
  id: text('id').primaryKey(),
  company: text('company').notNull(),
  jobTitle: text('job_title').notNull(),
  appliedDate: text('applied_date').notNull(),
  status: text('status').notNull(),   // gesendet | in_bearbeitung | abgelehnt | eingestellt
  notes: text('notes'),
  senderEmail: text('sender_email'),
  sessionId: text('session_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

**Step 2: Commit**

```bash
git add server/src/db/schema.ts
git commit -m "feat: add drizzle schema for cv_profiles and job_applications"
```

---

## Task 3: Create Drizzle config and DB connection

**Files:**
- Create: `server/drizzle.config.ts`
- Create: `server/src/db/index.ts`

**Step 1: Create drizzle.config.ts**

```typescript
// server/drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/cv-generator.db',
  },
} satisfies Config
```

**Step 2: Create server/src/db/index.ts**

```typescript
// server/src/db/index.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const dataDir = path.join(__dirname, '../../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const sqlite = new Database(path.join(dataDir, 'cv-generator.db'))
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })
export { sqlite }
```

**Step 3: Add `server/data/` to .gitignore (create .gitignore in server/ if missing)**

```bash
echo "data/" >> server/.gitignore
# If server/.gitignore doesn't exist yet:
echo "data/\ndist/" > server/.gitignore
```

**Step 4: Commit**

```bash
git add server/drizzle.config.ts server/src/db/index.ts server/.gitignore
git commit -m "feat: add drizzle config and better-sqlite3 db connection"
```

---

## Task 4: Generate migrations and create migration runner

**Files:**
- Create: `server/drizzle/migrations/` (auto-generated)
- Create: `server/src/db/migrate.ts`

**Step 1: Generate migration files from schema**

```bash
cd server && npx drizzle-kit generate
```

Expected: creates `server/drizzle/migrations/0000_*.sql` with CREATE TABLE statements.

**Step 2: Create migration runner**

```typescript
// server/src/db/migrate.ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './index'
import path from 'path'

export function runMigrations() {
  migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle/migrations') })
  console.log('[DB] Migrations applied')
}
```

**Step 3: Commit**

```bash
git add server/drizzle/ server/src/db/migrate.ts
git commit -m "feat: add drizzle migrations and migration runner"
```

---

## Task 5: Create profile API route

**Files:**
- Create: `server/src/routes/profile.ts`

**Step 1: Create the route**

```typescript
// server/src/routes/profile.ts
import { Router } from 'express'
import { db } from '../db'
import { cvProfiles } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { CVProfile } from '../../../shared/types'

const router = Router()

// GET /api/profile — return the single CV profile
router.get('/', async (_req, res) => {
  try {
    const rows = db.select().from(cvProfiles).all()
    if (rows.length === 0) return res.status(404).json({ error: 'No profile found' })
    // Return most recently updated
    const latest = rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    res.json(JSON.parse(latest.data))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/profile — upsert (create or replace)
router.post('/', async (req, res) => {
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
router.put('/', async (req, res) => {
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
router.delete('/', async (_req, res) => {
  try {
    db.delete(cvProfiles).run()
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

**Note:** `better-sqlite3` is synchronous — use `.run()`, `.all()`, `.get()` (not async/await on queries). The `async` on the route handlers is kept for consistency but DB calls are sync.

**Step 2: Commit**

```bash
git add server/src/routes/profile.ts
git commit -m "feat: add /api/profile CRUD route"
```

---

## Task 6: Create applications API route

**Files:**
- Create: `server/src/routes/applications.ts`

**Step 1: Create the route**

```typescript
// server/src/routes/applications.ts
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
```

**Step 2: Commit**

```bash
git add server/src/routes/applications.ts
git commit -m "feat: add /api/applications CRUD route"
```

---

## Task 7: Wire routes and migrations into app.ts

**Files:**
- Modify: `server/src/app.ts`

**Step 1: Update app.ts**

Replace the current content with:

```typescript
import express from 'express'
import cors from 'cors'
import { runMigrations } from './db/migrate'
import parseRouter from './routes/parse'
import pdfRouter from './routes/pdf'
import aiRouter from './routes/ai'
import mailRouter from './routes/mail'
import profileRouter from './routes/profile'
import applicationsRouter from './routes/applications'

// Run DB migrations before accepting requests
runMigrations()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/parse', parseRouter)
app.use('/api/pdf', pdfRouter)
app.use('/api/ai', aiRouter)
app.use('/api/mail', mailRouter)
app.use('/api/profile', profileRouter)
app.use('/api/applications', applicationsRouter)

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

process.on('SIGTERM', () => server.close())
process.on('SIGINT', () => server.close())

export default app
```

**Step 2: Start server and verify it boots**

```bash
npm run dev:server
```

Expected output includes:
```
[DB] Migrations applied
Server running on http://localhost:3001
```

**Step 3: Smoke test the new routes**

```bash
curl http://localhost:3001/api/profile
# Expected: {"error":"No profile found"}  (404)

curl http://localhost:3001/api/applications
# Expected: []
```

**Step 4: Commit**

```bash
git add server/src/app.ts
git commit -m "feat: wire profile and applications routes, run migrations on startup"
```

---

## Task 8: Update useProfile composable to use API

**Files:**
- Modify: `client/src/composables/useProfile.ts`

**Step 1: Replace file content**

```typescript
// client/src/composables/useProfile.ts
import { ref } from 'vue'
import type { CVProfile } from '../../../shared/types'

const profile = ref<CVProfile | null>(null)
const profileLoading = ref(false)

// Initialize from server on module load
async function fetchProfile() {
  profileLoading.value = true
  try {
    const res = await fetch('/api/profile')
    if (res.status === 404) { profile.value = null; return }
    if (!res.ok) return
    profile.value = await res.json()
  } catch {
    profile.value = null
  } finally {
    profileLoading.value = false
  }
}

fetchProfile()

export function useProfile() {
  async function saveProfile(p: CVProfile) {
    p.updatedAt = new Date().toISOString()
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
    if (res.ok) {
      profile.value = await res.json()
    }
  }

  async function updateProfile(patch: Partial<CVProfile>) {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      profile.value = await res.json()
    }
  }

  async function clearProfile() {
    await fetch('/api/profile', { method: 'DELETE' })
    profile.value = null
  }

  function hasProfile(): boolean {
    return profile.value !== null
  }

  return {
    profile,
    profileLoading,
    saveProfile,
    updateProfile,
    clearProfile,
    hasProfile,
    fetchProfile,
  }
}
```

**Step 2: Check that UploadView.vue still compiles**

`saveProfile` is called in UploadView.vue — it now returns a Promise, so calls should be `await saveProfile(p)`. Check:

```bash
grep -n "saveProfile" client/src/views/UploadView.vue
```

If any call is not awaited, add `await` and make the enclosing function `async`.

**Step 3: Commit**

```bash
git add client/src/composables/useProfile.ts
git commit -m "feat: useProfile composable reads/writes via API instead of localStorage"
```

---

## Task 9: Update useApplications composable to use API

**Files:**
- Modify: `client/src/composables/useApplications.ts`

**Step 1: Replace file content**

```typescript
// client/src/composables/useApplications.ts
import { ref } from 'vue'
import type { JobApplication, ApplicationStatus } from '../../../shared/types'

const applications = ref<JobApplication[]>([])

// Initialize from server on module load
async function fetchApplications() {
  try {
    const res = await fetch('/api/applications')
    if (res.ok) applications.value = await res.json()
  } catch {
    applications.value = []
  }
}

fetchApplications()

export function useApplications() {
  async function addApplication(
    app: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JobApplication> {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    })
    const newApp: JobApplication = await res.json()
    applications.value.unshift(newApp)
    return newApp
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: JobApplication = await res.json()
      const idx = applications.value.findIndex((a) => a.id === id)
      if (idx !== -1) applications.value[idx] = updated
    }
  }

  async function updateApplication(
    id: string,
    patch: Partial<Pick<JobApplication, 'company' | 'jobTitle' | 'appliedDate' | 'status' | 'notes'>>
  ) {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated: JobApplication = await res.json()
      const idx = applications.value.findIndex((a) => a.id === id)
      if (idx !== -1) applications.value[idx] = updated
    }
  }

  async function linkSession(id: string, sessionId: string) {
    await updateApplication(id, { sessionId } as any)
  }

  async function deleteApplication(id: string) {
    await fetch(`/api/applications/${id}`, { method: 'DELETE' })
    applications.value = applications.value.filter((a) => a.id !== id)
  }

  function hasApplicationForSession(sessionId: string): boolean {
    return applications.value.some((a) => a.sessionId === sessionId)
  }

  async function createFromSession(
    sessionId: string,
    company: string,
    jobTitle: string
  ): Promise<JobApplication> {
    const existing = applications.value.find((a) => a.sessionId === sessionId)
    if (existing) return existing
    return addApplication({
      sessionId,
      company,
      jobTitle,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'gesendet',
    })
  }

  return {
    applications,
    addApplication,
    updateStatus,
    updateApplication,
    linkSession,
    deleteApplication,
    hasApplicationForSession,
    createFromSession,
    fetchApplications,
  }
}
```

**Step 2: Update callers that don't await async functions**

Search for any fire-and-forget calls to these functions in views:

```bash
grep -rn "addApplication\|updateStatus\|updateApplication\|deleteApplication\|createFromSession" \
  client/src/views/ client/src/components/
```

Wrap any non-awaited calls in the enclosing handler with `async` + `await`. The pattern in `ApplicationsView.vue` calls these directly in event handlers — make those handler functions `async`:

```typescript
// In ApplicationsView.vue — make submitAdd async
async function submitAdd() { ... await addApplication(...) ... }
async function saveEdit(id: string) { ... await updateApplication(...) ... }
async function cycleStatus(app: JobApplication) { ... await updateStatus(...) ... }
async function confirmImport() { ... await addApplication(...) ... }
```

**Step 3: Commit**

```bash
git add client/src/composables/useApplications.ts client/src/views/ApplicationsView.vue
git commit -m "feat: useApplications composable reads/writes via API instead of localStorage"
```

---

## Task 10: One-time localStorage migration utility

**Files:**
- Create: `client/src/utils/migrateFromLocalStorage.ts`
- Modify: `client/src/App.vue` (or main entry component)

**Step 1: Create migration utility**

```typescript
// client/src/utils/migrateFromLocalStorage.ts

const MIGRATION_KEY = 'cv-ls-migrated-v1'

export async function migrateFromLocalStorage() {
  if (localStorage.getItem(MIGRATION_KEY)) return  // already done

  const profileRaw = localStorage.getItem('cv-profile')
  const appsRaw = localStorage.getItem('cv-applications')

  if (!profileRaw && !appsRaw) {
    localStorage.setItem(MIGRATION_KEY, '1')
    return
  }

  try {
    if (profileRaw) {
      const profile = JSON.parse(profileRaw)
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: profileRaw,
      })
      console.log('[migrate] CVProfile imported from localStorage')
    }

    if (appsRaw) {
      const apps = JSON.parse(appsRaw) as any[]
      for (const app of apps) {
        // Strip id/createdAt/updatedAt — server generates them, but preserve existing ids
        await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: app.company,
            jobTitle: app.jobTitle,
            appliedDate: app.appliedDate,
            status: app.status,
            notes: app.notes,
            senderEmail: app.senderEmail,
            sessionId: app.sessionId,
          }),
        })
      }
      console.log(`[migrate] ${apps.length} applications imported from localStorage`)
    }

    localStorage.setItem(MIGRATION_KEY, '1')
    // Keep old keys intact — user can clear them manually if needed
  } catch (err) {
    console.warn('[migrate] localStorage migration failed:', err)
  }
}
```

**Step 2: Call migration on app startup**

Find the root App component:

```bash
ls client/src/App.vue
```

Add to App.vue `<script setup>`:

```typescript
import { onMounted } from 'vue'
import { migrateFromLocalStorage } from '@/utils/migrateFromLocalStorage'

onMounted(async () => {
  await migrateFromLocalStorage()
})
```

**Step 3: Verify migration works**

1. Start the app with old localStorage data present
2. Check browser console for `[migrate] CVProfile imported` message
3. Check `curl http://localhost:3001/api/profile` returns the migrated data
4. Reload page — migration doesn't run again (MIGRATION_KEY set)

**Step 4: Commit**

```bash
git add client/src/utils/migrateFromLocalStorage.ts client/src/App.vue
git commit -m "feat: one-time migration from localStorage to SQLite on first load"
```

---

## Task 11: End-to-end smoke test

**Step 1: Start full dev stack**

```bash
npm run dev
```

**Step 2: Test profile round-trip**

1. Open http://localhost:5173
2. Upload a CV — check network tab: `POST /api/profile` returns 200 with CVProfile JSON
3. Reload page — profile is still there (loaded from DB, not localStorage)
4. `curl http://localhost:3001/api/profile` — returns the profile

**Step 3: Test applications round-trip**

1. Go to Bewerbungen view
2. Add a new application — check network tab: `POST /api/applications` returns 201
3. Edit an application — `PUT /api/applications/:id` returns 200
4. Delete an application — `DELETE /api/applications/:id` returns 200
5. Reload page — list is still correct

**Step 4: Verify DB file exists**

```bash
ls -lh server/data/cv-generator.db
```

Expected: file exists with nonzero size.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: SQLite + Drizzle persistence for CVProfile and JobApplications"
```

---

## Notes

- `better-sqlite3` is **synchronous** — no `await` on `.run()`, `.all()`, `.get()`. The `async` on route handlers is just for Express compatibility.
- The `data/` directory is gitignored — the DB file is local only.
- Drizzle `migrate()` is idempotent — safe to call on every server start.
- If `drizzle-kit generate` fails due to path issues, run it from inside `server/`: `cd server && npx drizzle-kit generate`
- `linkSession` in `useApplications` calls `updateApplication` with `sessionId` — TypeScript may complain since `sessionId` is not in the `Partial<Pick<...>>` type. Widen the patch type in `updateApplication` to include `sessionId` if needed.
