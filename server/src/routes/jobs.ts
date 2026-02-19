import { Router } from 'express'
import { callAi } from '../services/aiService'
import { extractJson } from './ai'
import type { JobListing, JobFilterResult } from '../../../shared/types'

const router = Router()

// ── Haversine distance ────────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Nominatim geocoding (in-memory cache for session) ────────────────────────
const geocodeCache = new Map<string, { lat: number; lon: number } | null>()

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  const key = city.toLowerCase().trim()
  if (geocodeCache.has(key)) return geocodeCache.get(key)!
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'cv-job-generator/1.0' } })
    const data = await res.json() as any[]
    const result = data[0] ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null
    geocodeCache.set(key, result)
    return result
  } catch {
    geocodeCache.set(key, null)
    return null
  }
}

// ── Arbeitsagentur token (cached for 1 hour) ──────────────────────────────────
let aaToken: string | null = null
let aaTokenExpiry = 0

async function getArbeitsagenturToken(): Promise<string | null> {
  if (aaToken && Date.now() < aaTokenExpiry) return aaToken
  try {
    const res = await fetch('https://rest.arbeitsagentur.de/oauth/gettoken_cc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'client_id=c003a37f-024f-462a-b36d-b001be4cd24a&client_secret=32a39620-32b3-4307-9aa1-511e3d7f48a8&grant_type=client_credentials',
    })
    if (!res.ok) return null
    const data = await res.json() as any
    aaToken = data.access_token
    aaTokenExpiry = Date.now() + (data.expires_in - 60) * 1000
    return aaToken
  } catch {
    return null
  }
}

// ── Fetch from ArbeitNow ──────────────────────────────────────────────────────
async function fetchArbeitNow(keyword: string, page: number): Promise<JobListing[]> {
  try {
    const url = `https://www.arbeitnow.com/api/job-board-api?page=${page}`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return []
    const data = await res.json() as any
    const jobs: JobListing[] = (data.data || []).map((j: any) => ({
      id: `arbeitnow-${j.slug}`,
      source: 'arbeitnow' as const,
      title: j.title || '',
      company: j.company_name || '',
      location: j.location || '',
      description: j.description || '',
      url: j.url || `https://www.arbeitnow.com/jobs/${j.slug}`,
      remote: j.remote === true,
      tags: Array.isArray(j.tags) ? j.tags : [],
      postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : undefined,
    }))
    // Filter locally by keyword (title or description contains keyword)
    if (!keyword.trim()) return jobs
    const kw = keyword.toLowerCase()
    return jobs.filter(j =>
      j.title.toLowerCase().includes(kw) ||
      j.company.toLowerCase().includes(kw) ||
      j.tags.some(t => t.toLowerCase().includes(kw))
    )
  } catch {
    return []
  }
}

// ── Fetch from Arbeitsagentur ─────────────────────────────────────────────────
async function fetchArbeitsagentur(keyword: string, location: string, page: number): Promise<JobListing[]> {
  try {
    const token = await getArbeitsagenturToken()
    if (!token) return []
    const params = new URLSearchParams({ size: '25', page: String(page) })
    if (keyword) params.set('was', keyword)
    if (location) params.set('wo', location)
    const url = `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?${params}`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'jobboerse-microservice',
      },
    })
    if (!res.ok) return []
    const data = await res.json() as any
    return ((data.stellenangebote || data.jobs || []) as any[]).map((j: any) => ({
      id: `aa-${j.hashId || j.refnr || Math.random()}`,
      source: 'arbeitsagentur' as const,
      title: j.titel || j.title || '',
      company: j.arbeitgeber || j.company || '',
      location: j.arbeitsort?.ort || j.location || '',
      description: j.stellenbeschreibung || j.beschreibung || j.description || '',
      url: j.externeUrl || `https://www.arbeitsagentur.de/jobsuche/jobdetail/${j.hashId}`,
      remote: false,
      tags: [],
      postedAt: j.eintrittsdatum || j.aktuelleVeroeffentlichungsdatum,
    }))
  } catch {
    return []
  }
}

// ── POST /api/jobs/search ─────────────────────────────────────────────────────
router.post('/search', async (req, res) => {
  try {
    const { keyword = '', location = '', page = 1 } = req.body as {
      keyword?: string; location?: string; page?: number
    }
    const [arbeitNowJobs, aaJobs] = await Promise.all([
      fetchArbeitNow(keyword, page),
      fetchArbeitsagentur(keyword, location, page - 1),
    ])
    // Merge, deduplicate by title+company
    const seen = new Set<string>()
    const merged: JobListing[] = []
    for (const job of [...aaJobs, ...arbeitNowJobs]) {
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(job)
      }
    }
    res.json({ jobs: merged, total: merged.length })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/jobs/filter ─────────────────────────────────────────────────────
const FILTER_SYSTEM = `You are a JSON-only API that analyzes job listings.
Du bist eine JSON-only API, die Stellenanzeigen analysiert.
Respond ONLY with a valid JSON array. No markdown, no explanation. No code fences.`

function buildFilterPrompt(jobs: Pick<JobListing, 'id' | 'title' | 'location' | 'description' | 'remote'>[]): string {
  const jobsPayload = jobs.map(j => ({
    id: j.id,
    title: j.title,
    location: j.location,
    remote: j.remote,
    text: j.description.slice(0, 600),
  }))
  return `Analyze each job listing and return a JSON array with exactly one object per job.

For each job determine:
1. germanRequired: true ONLY if the job requires German at B2 level or higher.
   Keywords indicating strict requirement: fließend, verhandlungssicher, C1, C2, Muttersprache, business level, professional level, sehr gute Deutschkenntnisse.
   Set false if: B1 or below, "von Vorteil", "Grundkenntnisse", "nice to have", "good to know", "basic German", not mentioned at all.
   Hint words: Deutschkenntnisse, Sprachkenntnisse Deutsch, German language skills.

2. locationCity: Extract the main city name from the location field.
   Return null if the job is remote (location or title contains: Remote, remote, Home Office, Homeoffice, fully remote, 100% remote).
   If the job has remote:true in the data, also return null.

Für jede Stelle bestimme:
1. germanRequired: true NUR wenn Deutsch auf B2-Niveau oder höher zwingend erforderlich ist.
   false wenn: B1 oder darunter, "von Vorteil", "Grundkenntnisse", oder nicht erwähnt.
2. locationCity: Stadtnamen extrahieren. null wenn Remote/Home Office.

Return format (JSON array, no other text):
[{"id":"...","germanRequired":true,"locationCity":"Berlin or null"}]

Jobs:
${JSON.stringify(jobsPayload, null, 2)}`
}

router.post('/filter', async (req, res) => {
  try {
    const { jobs, userLocation, filters, provider, apiKey, model } = req.body as {
      jobs: JobListing[]
      userLocation: string
      filters: { germanOnly: boolean; withinKm: number | null }
      provider: string
      apiKey: string
      model?: string
    }

    if (!jobs?.length) return res.json({ results: [] })

    // Geocode user location once
    const userCoords = await geocodeCity(userLocation)

    // Process in batches of 10
    const BATCH = 10
    const allResults: JobFilterResult[] = []

    for (let i = 0; i < jobs.length; i += BATCH) {
      const batch = jobs.slice(i, i + BATCH)
      let aiResults: Array<{ id: string; germanRequired: boolean; locationCity: string | null }> = []

      try {
        const raw = await callAi({
          provider,
          apiKey,
          model,
          systemPrompt: FILTER_SYSTEM,
          userPrompt: buildFilterPrompt(batch),
        })
        const parsed = JSON.parse(extractJson(raw))
        aiResults = Array.isArray(parsed) ? parsed : []
      } catch {
        // AI failed for this batch — default all to false/null
        aiResults = batch.map(j => ({ id: j.id, germanRequired: false, locationCity: null }))
      }

      // Calculate distances
      for (const aiR of aiResults) {
        const job = batch.find(j => j.id === aiR.id)
        const isRemote = job?.remote || !aiR.locationCity
        let distanceKm: number | null = null

        if (!isRemote && aiR.locationCity && userCoords) {
          const jobCoords = await geocodeCity(aiR.locationCity)
          if (jobCoords) {
            distanceKm = Math.round(haversineKm(userCoords.lat, userCoords.lon, jobCoords.lat, jobCoords.lon))
          }
        }

        allResults.push({
          id: aiR.id,
          germanRequired: aiR.germanRequired,
          distanceKm,
          remote: isRemote,
        })
      }
    }

    res.json({ results: allResults })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
