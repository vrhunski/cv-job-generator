<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfile } from '@/composables/useProfile'
import { useAiProvider } from '@/composables/useAiProvider'
import { useJobSearch } from '@/composables/useJobSearch'
import type { JobListing, JobFilterResult } from '../../../shared/types'

const router = useRouter()
const { profile } = useProfile()
const { settings: aiSettings } = useAiProvider()
const { selectJob } = useJobSearch()

// ── Search form ───────────────────────────────────────────────────────────────
const keyword = ref('')
const location = ref('')
const page = ref(1)
const searching = ref(false)
const searchError = ref('')
const jobs = ref<JobListing[]>([])
const hasSearched = ref(false)

onMounted(() => {
  // Auto-fill from CV profile
  if (profile.value) {
    const firstJob = profile.value.experience?.[0]
    if (firstJob?.jobTitle) keyword.value = firstJob.jobTitle
    if (profile.value.address) {
      // Extract city from address (take last meaningful part before country)
      const parts = profile.value.address.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
      location.value = parts[0] || ''
    }
  }
})

async function search(newPage = 1) {
  searching.value = true
  searchError.value = ''
  page.value = newPage
  if (newPage === 1) jobs.value = []

  try {
    const res = await fetch('/api/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: keyword.value, location: location.value, page: newPage }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Search failed')
    if (newPage === 1) {
      jobs.value = data.jobs
    } else {
      jobs.value = [...jobs.value, ...data.jobs]
    }
    hasSearched.value = true
  } catch (err: any) {
    searchError.value = err.message || 'Search failed'
  } finally {
    searching.value = false
  }
}

function loadMore() {
  search(page.value + 1)
}

// ── AI Filters ────────────────────────────────────────────────────────────────
const filterGermanOnly = ref(false)
const filterWithinKm = ref(false)
const filterKm = ref(50)
const filterLocation = ref('')
const filtering = ref(false)
const filterError = ref('')
const filterResults = ref<Map<string, JobFilterResult>>(new Map())
const filtersApplied = ref(false)

onMounted(() => {
  if (profile.value?.address) {
    const parts = profile.value.address.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    filterLocation.value = parts[0] || ''
  }
})

function getAiConfig() {
  const p = aiSettings.provider
  if (p === 'puter') return { provider: 'gemini', apiKey: aiSettings.geminiKey, model: aiSettings.geminiModel }
  if (p === 'anthropic') return { provider: 'anthropic', apiKey: aiSettings.anthropicKey, model: aiSettings.anthropicModel }
  if (p === 'openai') return { provider: 'openai', apiKey: aiSettings.openaiKey, model: aiSettings.openaiModel }
  return { provider: 'gemini', apiKey: aiSettings.geminiKey, model: aiSettings.geminiModel }
}

async function applyFilters() {
  if (!filterGermanOnly.value && !filterWithinKm.value) return
  if (!jobs.value.length) return

  filtering.value = true
  filterError.value = ''

  try {
    const ai = getAiConfig()
    if (!ai.apiKey) {
      filterError.value = 'No AI API key configured in Settings.'
      return
    }
    const res = await fetch('/api/jobs/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobs: jobs.value,
        userLocation: filterLocation.value || location.value,
        filters: {
          germanOnly: filterGermanOnly.value,
          withinKm: filterWithinKm.value ? filterKm.value : null,
        },
        provider: ai.provider,
        apiKey: ai.apiKey,
        model: ai.model,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Filter failed')

    const map = new Map<string, JobFilterResult>()
    for (const r of data.results as JobFilterResult[]) {
      map.set(r.id, r)
    }
    filterResults.value = map
    filtersApplied.value = true
  } catch (err: any) {
    filterError.value = err.message || 'Filter failed'
  } finally {
    filtering.value = false
  }
}

function clearFilters() {
  filterResults.value = new Map()
  filtersApplied.value = false
}

// ── Job display ───────────────────────────────────────────────────────────────
function jobFilterResult(id: string): JobFilterResult | undefined {
  return filterResults.value.get(id)
}

function isJobDimmed(job: JobListing): boolean {
  if (!filtersApplied.value) return false
  const r = jobFilterResult(job.id)
  if (!r) return false
  if (filterGermanOnly.value && r.germanRequired) return true
  if (filterWithinKm.value && !r.remote && r.distanceKm !== null && r.distanceKm > filterKm.value) return true
  return false
}

function jobBadges(job: JobListing): string[] {
  const badges: string[] = []
  if (!filtersApplied.value) return badges
  const r = jobFilterResult(job.id)
  if (!r) return badges
  if (r.germanRequired) badges.push('Deutsch B2+ erforderlich')
  if (r.remote) badges.push('Remote')
  else if (r.distanceKm !== null) badges.push(`${r.distanceKm} km`)
  return badges
}

function useJobForTailor(job: JobListing) {
  selectJob(job)
  router.push('/tailor')
}

// ── Expand description ────────────────────────────────────────────────────────
const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function shortDescription(desc: string): string {
  return desc.replace(/<[^>]+>/g, '').slice(0, 200).trim() + '…'
}
</script>

<template>
  <div class="job-search-view">
    <div class="page-header">
      <div>
        <h1>Job Search</h1>
        <p class="subtitle">Search jobs from Arbeitsagentur &amp; ArbeitNow</p>
      </div>
    </div>

    <!-- Search form -->
    <div class="card search-form">
      <div class="search-grid">
        <div class="form-group">
          <label>Keyword / Job Title</label>
          <input
            v-model="keyword"
            type="text"
            placeholder="e.g. Backend Developer"
            @keydown.enter="search(1)"
          />
        </div>
        <div class="form-group">
          <label>Location</label>
          <input
            v-model="location"
            type="text"
            placeholder="e.g. Berlin"
            @keydown.enter="search(1)"
          />
        </div>
      </div>
      <div class="search-actions">
        <button class="btn btn-primary" :disabled="searching" @click="search(1)">
          {{ searching ? 'Searching…' : 'Search / Suchen' }}
        </button>
      </div>
      <p v-if="searchError" class="error-msg">{{ searchError }}</p>
    </div>

    <!-- AI Filters -->
    <div v-if="hasSearched && jobs.length > 0" class="card filter-panel">
      <div class="filter-title">AI Filters <span class="filter-hint">(runs on demand)</span></div>
      <div class="filter-row">
        <label class="filter-check">
          <input type="checkbox" v-model="filterGermanOnly" />
          Nur ohne Deutschpflicht (B1 or below acceptable)
        </label>
        <label class="filter-check">
          <input type="checkbox" v-model="filterWithinKm" />
          Max Umkreis:
          <input
            v-model.number="filterKm"
            type="number"
            min="10"
            max="500"
            step="10"
            class="km-input"
            :disabled="!filterWithinKm"
          /> km
        </label>
      </div>
      <div class="filter-location" v-if="filterWithinKm">
        <label>From location:</label>
        <input v-model="filterLocation" type="text" placeholder="City or address" class="location-override" />
      </div>
      <div class="filter-actions">
        <button
          class="btn btn-primary btn-sm"
          :disabled="filtering || (!filterGermanOnly && !filterWithinKm)"
          @click="applyFilters"
        >
          {{ filtering ? 'Analysing…' : 'Filter anwenden' }}
        </button>
        <button v-if="filtersApplied" class="btn btn-secondary btn-sm" @click="clearFilters">
          Clear filters
        </button>
      </div>
      <p v-if="filterError" class="error-msg">{{ filterError }}</p>
    </div>

    <!-- Results -->
    <div v-if="hasSearched">
      <div class="results-header" v-if="jobs.length > 0">
        {{ jobs.length }} jobs found
        <span v-if="filtersApplied" class="filter-active-hint">
          · {{ jobs.filter(j => !isJobDimmed(j)).length }} pass filters
        </span>
      </div>

      <div v-if="jobs.length === 0 && !searching" class="card empty-state">
        <p>No jobs found. Try different keywords or location.</p>
      </div>

      <div class="job-list">
        <div
          v-for="job in jobs"
          :key="job.id"
          class="job-card card"
          :class="{ 'job-dimmed': isJobDimmed(job) }"
        >
          <div class="job-header">
            <div class="job-main">
              <div class="job-title">{{ job.title }}</div>
              <div class="job-meta">
                <span class="job-company">{{ job.company }}</span>
                <span class="job-sep">·</span>
                <span class="job-location">{{ job.location }}</span>
                <span v-if="job.remote" class="tag tag-remote">Remote</span>
              </div>
            </div>
            <div class="job-actions">
              <button class="btn btn-primary btn-sm" @click="useJobForTailor(job)">
                Use for CV →
              </button>
              <a :href="job.url" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
                Open ↗
              </a>
            </div>
          </div>

          <!-- AI filter badges -->
          <div v-if="filtersApplied && jobBadges(job).length > 0" class="badge-row">
            <span
              v-for="badge in jobBadges(job)"
              :key="badge"
              class="filter-badge"
              :class="{ 'badge-warn': badge.includes('B2+'), 'badge-info': !badge.includes('B2+') }"
            >{{ badge }}</span>
          </div>

          <!-- Tags -->
          <div v-if="job.tags.length > 0" class="tag-row">
            <span v-for="tag in job.tags.slice(0, 6)" :key="tag" class="tag">{{ tag }}</span>
          </div>

          <!-- Description toggle -->
          <div class="job-desc">
            <span v-if="expandedId !== job.id" class="desc-short">{{ shortDescription(job.description) }}</span>
            <div v-else class="desc-full" v-html="job.description"></div>
            <button class="desc-toggle" @click="toggleExpand(job.id)">
              {{ expandedId === job.id ? 'Show less' : 'Show more' }}
            </button>
          </div>

          <div class="job-footer">
            <span class="job-source">{{ job.source === 'arbeitsagentur' ? 'Arbeitsagentur' : 'ArbeitNow' }}</span>
            <span v-if="job.postedAt" class="job-date">{{ new Date(job.postedAt).toLocaleDateString('de-DE') }}</span>
          </div>
        </div>
      </div>

      <div v-if="jobs.length > 0 && !searching" class="load-more">
        <button class="btn btn-secondary" @click="loadMore" :disabled="searching">
          Load more
        </button>
      </div>
      <div v-if="searching && jobs.length > 0" class="loading-more">Searching…</div>
    </div>

    <!-- Initial empty state -->
    <div v-if="!hasSearched" class="card empty-state">
      <p>Enter a job title and location, then click Search.</p>
      <p class="muted" v-if="!profile">Upload your CV first to auto-fill the search form.</p>
    </div>
  </div>
</template>

<style scoped>
.job-search-view {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

h1 {
  margin-bottom: 4px;
}

.subtitle {
  color: var(--color-text-muted);
  font-size: 14px;
}

/* Search form */
.search-form {
  margin-bottom: 16px;
}

.search-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.form-group input {
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--color-bg);
  color: var(--color-text);
}

.search-actions {
  display: flex;
  gap: 8px;
}

.error-msg {
  color: #dc2626;
  font-size: 13px;
  margin-top: 8px;
}

/* Filter panel */
.filter-panel {
  margin-bottom: 16px;
}

.filter-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--color-text);
}

.filter-hint {
  font-weight: 400;
  color: var(--color-text-muted);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 10px;
}

.filter-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.km-input {
  width: 64px;
  padding: 3px 6px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  font-size: 13px;
  background: var(--color-bg);
  color: var(--color-text);
}

.filter-location {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 10px;
}

.location-override {
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  font-size: 13px;
  background: var(--color-bg);
  color: var(--color-text);
  width: 200px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-active-hint {
  color: var(--color-text-muted);
  font-size: 13px;
}

/* Results */
.results-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.job-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-card {
  padding: 16px;
  transition: opacity 0.2s;
}

.job-dimmed {
  opacity: 0.35;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.job-main {
  flex: 1;
  min-width: 0;
}

.job-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 3px;
}

.job-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.job-sep {
  opacity: 0.4;
}

.job-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* Badges */
.badge-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.filter-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.badge-warn {
  background: #fee2e2;
  color: #991b1b;
}

.badge-info {
  background: #dbeafe;
  color: #1d4ed8;
}

/* Tags */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--color-bg-secondary, #f1f5f9);
  color: var(--color-text-muted);
}

.tag-remote {
  background: #dcfce7;
  color: #166534;
}

/* Description */
.job-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.desc-short {
  display: block;
  margin-bottom: 4px;
}

.desc-full {
  margin-bottom: 4px;
  line-height: 1.6;
  color: var(--color-text);
}

.desc-toggle {
  background: none;
  border: none;
  color: var(--color-accent, #2563eb);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.desc-toggle:hover {
  text-decoration: underline;
}

/* Footer */
.job-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.7;
}

/* Load more */
.load-more {
  text-align: center;
  margin-top: 20px;
}

.loading-more {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 12px;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 48px;
}

.empty-state p {
  margin-bottom: 8px;
}

.muted {
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
