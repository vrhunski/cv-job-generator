# Arbeitsagentur Job Search Fix

**Date:** 2026-02-19

## Problem

Arbeitsagentur jobs returned zero results on every search. The failure was completely silent due to broad `catch { return [] }` error handling masking all errors.

## Diagnosis

Added `[AA]` console logging to `getArbeitsagenturToken()` and `fetchArbeitsagentur()` to surface the actual failures. One test search revealed:

```
[AA] Fetching OAuth token...
[AA] Token response status: 403 Forbidden
[AA] Token response body:
[AA] Token fetch failed (non-ok)
[AA] Skipping jobs fetch — no token
```

**Two bugs found:**

### Bug 1 — Broken OAuth (403 Forbidden)
The code used a hardcoded OAuth client credential flow:
```
POST https://rest.arbeitsagentur.de/oauth/gettoken_cc
client_id=c003a37f-024f-462a-b36d-b001be4cd24a
client_secret=32a39620-32b3-4307-9aa1-511e3d7f48a8
```
These well-known public credentials had been **revoked by Arbeitsagentur**. The endpoint returned `403` with an empty body, so no token was ever issued and the entire AA fetch was skipped.

### Bug 2 — Wrong page offset (400 Bad Request)
Even with auth fixed, the first search would send `page=0`:
```ts
fetchArbeitsagentur(keyword, location, page - 1)  // page=1 → sends page=0
```
The Arbeitsagentur API expects **pages starting at 1**, so `page=0` returned `400 Bad Request`.

## Fix

Discovered via `jobsuche.api.bund.dev` and `github.com/bundesAPI/jobsuche-api`:

**No OAuth required** — the API uses a static API key header:
```
X-API-Key: jobboerse-jobsuche
```

Changes in `server/src/routes/jobs.ts`:
1. Removed entire OAuth token fetch (`getArbeitsagenturToken()` function deleted)
2. Replaced with constant: `const AA_API_KEY = 'jobboerse-jobsuche'`
3. `fetchArbeitsagentur()` now sends only `X-API-Key` header (no `Authorization: Bearer`)
4. Fixed page offset: `fetchArbeitsagentur(keyword, location, page)` (was `page - 1`)
5. Added `j.beruf` as fallback for job title field

## Result

```
Total: 25 | Arbeitsagentur: 24 | ArbeitNow: 1
  AA: Software Developer w/m/d - FullStack | Computacenter AG & Co. oHG | Berlin
  AA: Software Developer (Flutter) (m/w/d) | Public Cloud Group | Berlin
  AA: Senior Software Developer - Digital Government (m/w/d) | Bundesdruckerei Gruppe | Berlin
```

## Lesson

The silent `catch { return [] }` pattern made the failure invisible for a long time. Diagnostic `console.log` calls should be added early when integrating third-party APIs. The logging was cleaned up after diagnosis (replaced with `console.error` only for actual failures).

## API Reference

- Docs: `https://jobsuche.api.bund.dev`
- Community repo: `https://github.com/bundesAPI/jobsuche-api`
- Endpoint: `GET https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs`
- Auth: `X-API-Key: jobboerse-jobsuche`
- Pages: start at 1

## Commit

`817bc08` — fix: restore Arbeitsagentur job search with correct API key and page offset
