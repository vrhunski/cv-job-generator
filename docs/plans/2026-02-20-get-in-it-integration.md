# get-in-it.de Integration & Job Source Selection

**Date:** 2026-02-20

## Overview

Added [get-in-it.de](https://www.get-in-it.de) as a third job source alongside Arbeitsagentur and ArbeitNow, and introduced per-source selection with pill toggles in the search form.

---

## API Research

### What get-in-it.de is

German IT-focused job portal. Search URL: `https://www.get-in-it.de/jobsuche?city={city}&radius={radius}`. Returns ~1,000 IT jobs for major German cities (Stuttgart, Berlin, Munich, etc.).

### No public API

- No REST/GraphQL API exists
- The `_next/data/{buildId}/jobsuche.json` route returns **404** (disabled by the site)
- String city names work directly in the URL (`?city=berlin`) — no numeric ID mapping needed
- Keyword filtering via URL has no effect — must filter locally post-fetch

### Data source: `__NEXT_DATA__`

Jobs are embedded in the page HTML as a Next.js SSR state blob:

```
<script id="__NEXT_DATA__" type="application/json">{...}</script>
```

**List page** — jobs at `props.initialState.jobSearchJobs.jobs`, each with:

| Field | Description |
|---|---|
| `id` | Numeric job ID |
| `title` | Job title |
| `url` | Relative URL `/jobsuche/p{id}` |
| `homeOffice` | Boolean — maps to `remote` |
| `careers[]` | Array of `{id, name}` — maps to `tags` |
| `locations[]` | Array of `{id, name}` — multiple cities joined |
| `company.title` | Company name |

**No description in list** — `stellenbeschreibung` is defined in their `JobDetails` schema but not returned in list responses.

**Detail page** (`/jobsuche/p{id}`) — full description at `props.initialState.jobJob.job.content` as HTML string.

### Default page size

39 jobs per fetch. Pagination parameters (`start`, `limit`) appear to be ignored server-side — results are static per SSR render. No mechanism found for fetching beyond the first 39.

---

## Implementation

### Server (`server/src/routes/jobs.ts`)

**Caches (15-min TTL):**
```ts
const giitListCache   = new Map<string, { jobs: JobListing[]; ts: number }>()
const giitDetailCache = new Map<string, { description: string; ts: number }>()
```

**`parseNextData(html)`** — extracts and JSON-parses the `__NEXT_DATA__` script tag.

**`fetchGetInIt(city, radius, keyword)`:**
- Fetches `https://www.get-in-it.de/jobsuche?city={city}&radius={radius}`
- Parses jobs from `__NEXT_DATA__`
- Caches per `city|radius` key for 15 min
- Applies keyword filter locally on title + career tag names

**`GET /api/jobs/getinit-detail/:id`:**
- Fetches `/jobsuche/p{id}`
- Extracts `content` from `__NEXT_DATA__`
- Caches per job ID for 15 min

**`POST /api/jobs/search` — `sources[]` param:**
- Accepts `sources?: string[]` in body (defaults to all three if omitted)
- Each fetcher is conditionally skipped: `sources.includes('getinit') && location ? fetchGetInIt(...) : []`
- get-in-IT always skipped if no location (platform requires a city)

### Client (`client/src/views/JobSearchView.vue`)

**Source definitions:**
```ts
const SOURCE_DEFS = [
  { id: 'arbeitnow',      label: 'ArbeitNow',     needsLocation: false },
  { id: 'arbeitsagentur', label: 'Arbeitsagentur', needsLocation: false },
  { id: 'getinit',        label: 'get-in-IT',      needsLocation: true  },
]
```

**State:**
- `selectedSources` — loaded from `localStorage['cv-job-sources']`, defaults to `['arbeitnow']`
- `lastSearchSources` — snapshot of sources sent in the last search request
- `watch(selectedSources)` → auto-saves to localStorage

**`toggleSource(id)`** — adds/removes source; prevents deselecting the last one.

**`visibleJobs` computed** — filters `jobs` by `selectedSources` for instant client-side toggle without re-fetching.

**`needsResearch` computed** — true when `selectedSources` contains a source not in `lastSearchSources` (new source enabled after search).

**On-demand description (`fetchJobDescription`):**
- Only runs for `getinit` source with empty description
- Calls `GET /api/jobs/getinit-detail/{numericId}`
- Patches `job.description` in-place (cached after first fetch)
- Triggered by "Show description" button or "Use for CV →"

### Shared types (`shared/types.ts`)

```ts
source: 'arbeitsagentur' | 'arbeitnow' | 'getinit'
```

---

## Limitations

| Limitation | Impact |
|---|---|
| 39 jobs per search (no pagination) | Cannot load more get-in-IT results |
| No keyword URL filter | All 39 results fetched, then filtered locally — low recall for rare keywords |
| Behind Cloudflare | Aggressive scraping may get IP-blocked; 15-min cache mitigates this |
| HTML scraping is fragile | If get-in-it.de changes their Next.js page structure or build, the integration silently returns 0 results |
| No `postedAt` in list | Posting date not available |
| German language filter | AI filter can't detect B2+ requirements (no description at search time); passes AA and get-in-IT jobs through as `germanRequired: false` |

---

## Also Fixed in This Session

### Arbeitsagentur job URLs broken (`/undefined`)

**Root cause:** `fetchArbeitsagentur` built the fallback URL using `j.hashId`:
```ts
url: j.externeUrl || `https://www.arbeitsagentur.de/jobsuche/jobdetail/${j.hashId}`
```
The list API (`Stellenangebot` schema) does **not** include `hashId` — only `refnr`. So every job without an `externeUrl` got `/undefined`.

**Fix:** Use `j.refnr` (always present) with `j.hashId` as fallback:
```ts
url: j.externeUrl || `https://www.arbeitsagentur.de/jobsuche/jobdetail/${j.refnr || j.hashId}`
```

### Arbeitsagentur descriptions always empty

**Root cause:** The `stellenbeschreibung` field exists in the AA `JobDetails` schema but is not returned by the list endpoint (`/pc/v4/jobs`). A detail endpoint (`/pc/v4/jobs/{hashId}`) returns **403** with both `X-API-Key: jobboerse-jobsuche` and without any key. No public detail endpoint exists.

**Resolution:** Accepted as a platform limitation. AA jobs show "Description not available from API. View on Arbeitsagentur ↗" with a working link (after the URL fix above).

---

## Commit

`7c5ecb0` — feat: add get-in-IT job source and per-source search selection
