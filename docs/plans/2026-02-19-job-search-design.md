# Job Search Feature Design

**Goal:** Scrape job listings from German job portals and show them as a browsable list; user clicks a listing to pre-fill the CV tailoring flow.

**Architecture:** Two new server endpoints fetch from Arbeitsagentur REST API and ArbeitNow API in parallel. A bilingual AI filter (on demand) detects strict German language requirements and calculates distance from user location via Nominatim geocoding. A new `/jobs` route in the Vue client lets the user search, browse, filter, and send a job directly to the tailor flow.

**Tech Stack:** Express fetch, Nominatim (OpenStreetMap), Arbeitsagentur OAuth, ArbeitNow public API, existing `callAi` service, Vue 3 composable singleton for cross-route state

---

## Data Model

### `JobListing` (shared/types.ts)
```typescript
interface JobListing {
  id: string                              // prefixed: "arbeitnow-{slug}" | "aa-{hashId}"
  source: 'arbeitsagentur' | 'arbeitnow'
  title: string
  company: string
  location: string
  description: string                     // full HTML/text — fed to AI and TailoringView
  url: string
  remote: boolean
  tags: string[]
  postedAt?: string
}
```

### `JobFilterResult` (shared/types.ts)
```typescript
interface JobFilterResult {
  id: string
  germanRequired: boolean   // true = B2+ strictly required; false = accessible
  distanceKm: number | null // null if remote or geocoding failed
  remote: boolean
}
```

---

## Server Routes (`server/src/routes/jobs.ts`)

### `POST /api/jobs/search`
**Request:** `{ keyword, location, page }`

**Flow:**
1. Fetch ArbeitNow (`https://www.arbeitnow.com/api/job-board-api?page={page}`) — no auth, 100/page, filter locally by keyword on title/company/tags
2. Fetch Arbeitsagentur (`https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?was={keyword}&wo={location}`) — OAuth token auto-fetched and cached 1 hour
3. Merge, deduplicate by `title+company` key
4. Return `{ jobs: JobListing[], total: number }`

**Error handling:** If either API fails, return results from the other. No crash.

### `POST /api/jobs/filter`
**Request:** `{ jobs, userLocation, filters: { germanOnly, withinKm }, provider, apiKey, model }`

**Flow:**
1. Geocode `userLocation` via Nominatim — cached in memory for session
2. Split jobs into batches of 10
3. Per batch → one AI call (bilingual prompt, see below)
4. Parse AI response: `[{ id, germanRequired, locationCity }]`
5. For non-remote jobs: geocode `locationCity`, compute haversine km
6. Return `{ results: JobFilterResult[] }`

**Utilities (in-file):**
- `haversineKm(lat1, lon1, lat2, lon2)` — pure math, no dependency
- `geocodeCity(city)` — Nominatim + in-memory Map cache
- `getArbeitsagenturToken()` — cached OAuth, refreshes on expiry

---

## AI Filter Prompt

**System (bilingual):**
```
You are a JSON-only API that analyzes job listings.
Du bist eine JSON-only API, die Stellenanzeigen analysiert.
Respond ONLY with a valid JSON array. No markdown, no explanation.
```

**User prompt rules:**

`germanRequired: true` ONLY when:
- Level explicitly B2, C1, C2, Muttersprache, fließend, verhandlungssicher, sehr gute Deutschkenntnisse

`germanRequired: false` when:
- B1 or below, Grundkenntnisse, von Vorteil, nice to have, good to know, not mentioned
- Hint keywords: Deutschkenntnisse, Sprachkenntnisse Deutsch, German language skills

`locationCity: null` when:
- Job has `remote: true`, or location/title contains "Remote", "Home Office", "Homeoffice", "fully remote"

**Batch size:** 10 jobs per AI call (job text truncated to 600 chars).

---

## Client

### `useJobSearch` composable (`client/src/composables/useJobSearch.ts`)
Module-level singleton `selectedJob: Ref<JobListing | null>`.
- `selectJob(job)` — set the selected job
- `clearJob()` — clear after reading

### `JobSearchView.vue` (`/jobs` route)

**Search form:**
- Keyword input — auto-filled from `profile.experience[0].jobTitle`
- Location input — auto-filled from `profile.address` (first comma-separated segment)
- Enter key triggers search

**Results list:**
- Job card: title, company, location, Remote badge, tags (max 6), expandable description
- "Use for CV →" button — calls `selectJob(job)` then `router.push('/tailor')`
- "Open ↗" link — opens job URL in new tab
- Source label (Arbeitsagentur / ArbeitNow) + posted date
- "Load more" pagination

**AI Filter panel** (shown after first search, on demand):
- `[ ] Nur ohne Deutschpflicht` — hides jobs with germanRequired: true
- `[ ] Max Umkreis: [50] km` — hides jobs beyond distance threshold
- Location override input (defaults to CV address)
- "Filter anwenden" button → calls `/api/jobs/filter`
- "Clear filters" resets filter state
- Jobs that fail active filters: **dimmed to 35% opacity** (not removed)
- Badges on dimmed cards: `Deutsch B2+ erforderlich` (red) or `{N} km` (blue)

### `TailoringView.vue` — integration
On `onMounted`: if `selectedJob.value` exists, copy `job.description` into `jobDescription` ref and call `clearJob()`. User lands on tailor page with the job description pre-filled, ready to analyze.

---

## API Details

### ArbeitNow
- URL: `https://www.arbeitnow.com/api/job-board-api`
- Auth: none
- Pagination: `?page=N` (100 results/page)
- Response: `{ data: [...], links, meta }`
- Fields: `slug, company_name, title, description, remote, url, tags, job_types, location, created_at`
- Keyword filtering: **client-side** (no server-side search parameter)

### Arbeitsagentur
- Token: `POST https://rest.arbeitsagentur.de/oauth/gettoken_cc`
  - Body: `client_id=c003a37f-024f-462a-b36d-b001be4cd24a&client_secret=32a39620-32b3-4307-9aa1-511e3d7f48a8&grant_type=client_credentials`
- Jobs: `GET https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs`
  - Params: `was` (keyword), `wo` (location), `page`, `size=25`
  - Headers: `Authorization: Bearer {token}`, `X-API-Key: jobboerse-microservice`
- Fields: `titel, arbeitgeber, arbeitsort.ort, stellenbeschreibung, hashId, externeUrl`

### Nominatim (geocoding)
- URL: `https://nominatim.openstreetmap.org/search?q={city}&format=json&limit=1`
- Auth: none (User-Agent header required)
- Rate limit: 1 req/sec (acceptable with in-memory cache)

---

## File Map

| File | Change |
|------|--------|
| `shared/types.ts` | + `JobListing`, `JobFilterResult` |
| `server/src/routes/jobs.ts` | new — search + filter endpoints |
| `server/src/routes/ai.ts` | export `extractJson` |
| `server/src/app.ts` | mount `/api/jobs` router |
| `client/src/composables/useJobSearch.ts` | new — singleton selected job |
| `client/src/views/JobSearchView.vue` | new — full search UI |
| `client/src/views/TailoringView.vue` | read selectedJob on mount |
| `client/src/router/index.ts` | + `/jobs` route |
| `client/src/components/common/AppHeader.vue` | + Jobs nav link |

---

## Future: Additional Portals

To add StepStone, Indeed, LinkedIn etc.:
1. Add a new `fetch{Portal}()` function in `jobs.ts`
2. Include it in the `Promise.all` in `/search`
3. Map response fields to `JobListing` shape
4. Add `source` value to the union type

The filter and deduplication logic requires no changes.
