<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { CVProfile, TailoredSession } from '../../../shared/types'
import { useProfile } from '@/composables/useProfile'
import { useSessions } from '@/composables/useSessions'
import { useSuggestions } from '@/composables/useSuggestions'
import { useApplications } from '@/composables/useApplications'
import { downloadPdf } from '@/services/pdfExport'
import CvComparison from '@/components/preview/CvComparison.vue'

const router = useRouter()
const { profile } = useProfile()
const { addSession } = useSessions()
const { suggestions, getApproved } = useSuggestions()
const { createFromSession, addApplication, linkSession } = useApplications()

const downloading = ref(false)
const saved = ref(false)
const savedSessionId = ref<string | null>(null)
const downloadedAppId = ref<string | null>(null)

const jobContext = (() => {
  try {
    return JSON.parse(sessionStorage.getItem('cv-tailor-job') || '{}')
  } catch {
    return {}
  }
})()

const tailoredProfile = computed<CVProfile | null>(() => {
  if (!profile.value) return null

  const copy: CVProfile = JSON.parse(JSON.stringify(profile.value))
  const approved = getApproved()

  for (const sug of approved) {
    switch (sug.type) {
      case 'align_job_title':
      case 'adjust_job_title':
        if (sug.experienceId) {
          const exp = copy.experience.find((e) => e.id === sug.experienceId)
          if (exp) exp.jobTitle = sug.proposed
        }
        break

      case 'rewrite_summary_hook':
      case 'rewrite_summary':
        copy.aboutMe = sug.proposed
        break

      case 'rephrase_bullet':
        if (sug.experienceId) {
          const exp = copy.experience.find((e) => e.id === sug.experienceId)
          if (exp && sug.original) {
            const idx = exp.bullets.indexOf(sug.original)
            if (idx >= 0) exp.bullets[idx] = sug.proposed
          }
        }
        break

      case 'add_bullet':
        if (sug.experienceId) {
          const exp = copy.experience.find((e) => e.id === sug.experienceId)
          if (exp) exp.bullets.push(sug.proposed)
        }
        break

      case 'remove_bullet':
        if (sug.experienceId && sug.original) {
          const exp = copy.experience.find((e) => e.id === sug.experienceId)
          if (exp) {
            exp.bullets = exp.bullets.filter((b) => b !== sug.original)
          }
        }
        break

      case 'add_skill':
      case 'highlight_skill':
        // Add to first matching category or create new one
        if (sug.proposed) {
          const targetCat = copy.skills.find((c) =>
            c.category.toLowerCase() === (sug.section || '').toLowerCase()
          )
          if (targetCat && !targetCat.skills.includes(sug.proposed)) {
            targetCat.skills.unshift(sug.proposed)
          }
        }
        break

      case 'remove_skill':
        if (sug.original) {
          for (const cat of copy.skills) {
            cat.skills = cat.skills.filter((s) => s !== sug.original)
          }
        }
        break

      case 'enhance_tech_stack':
        if (sug.experienceId) {
          const exp = copy.experience.find((e) => e.id === sug.experienceId)
          if (exp) exp.techStack = sug.proposed
        }
        break

      default:
        // For other types, if it targets aboutMe
        if (sug.section === 'summary' || sug.section === 'aboutMe') {
          copy.aboutMe = sug.proposed
        }
        break
    }
  }

  return copy
})

if (!profile.value) {
  router.push('/upload')
}

async function handleDownload() {
  if (!tailoredProfile.value) return
  downloading.value = true
  try {
    await downloadPdf(tailoredProfile.value)
    // Auto-log the application
    if (savedSessionId.value) {
      // Session already saved — link to it (no-op if already exists)
      createFromSession(savedSessionId.value, jobContext.company || 'Unknown', jobContext.jobTitle || 'Unknown')
    } else if (!downloadedAppId.value) {
      // Not yet saved as a session — create a standalone entry
      const app = addApplication({
        company: jobContext.company || 'Unknown',
        jobTitle: jobContext.jobTitle || 'Unknown',
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'gesendet',
      })
      downloadedAppId.value = app.id
    }
  } catch (err: any) {
    alert(err.message || 'PDF download failed')
  } finally {
    downloading.value = false
  }
}

function handleSaveSession() {
  if (!tailoredProfile.value || !profile.value) return

  const session: TailoredSession = {
    id: crypto.randomUUID(),
    profileId: profile.value.id,
    jobDescription: jobContext.jobDescription || '',
    jobTitle: jobContext.jobTitle || 'Unknown',
    company: jobContext.company || 'Unknown',
    seniorityLevel: jobContext.seniorityLevel || 'Mid',
    suggestions: [...suggestions.value],
    tailoredProfile: tailoredProfile.value,
    createdAt: new Date().toISOString(),
  }

  addSession(session)
  savedSessionId.value = session.id
  saved.value = true

  // If already downloaded (standalone entry exists), link it to the session
  if (downloadedAppId.value) {
    linkSession(downloadedAppId.value, session.id)
  }
}
</script>

<template>
  <div class="preview-view" v-if="profile && tailoredProfile">
    <div class="preview-header">
      <h1>Preview & Export</h1>
      <div class="actions">
        <button class="btn btn-secondary" @click="router.push('/tailor')">Back to Suggestions</button>
        <button class="btn btn-secondary" :disabled="saved" @click="handleSaveSession">
          {{ saved ? 'Session Saved' : 'Save Session' }}
        </button>
        <button class="btn btn-primary" :disabled="downloading" @click="handleDownload">
          {{ downloading ? 'Generating...' : 'Download PDF' }}
        </button>
      </div>
    </div>

    <div v-if="jobContext.jobTitle" class="job-info">
      Tailored for: <strong>{{ jobContext.jobTitle }}</strong> at <strong>{{ jobContext.company }}</strong>
    </div>

    <CvComparison :original="profile" :tailored="tailoredProfile" />
  </div>

  <div v-else class="empty card">
    <p>No profile loaded. Please <router-link to="/upload">upload a CV</router-link> first.</p>
  </div>
</template>

<style scoped>
.preview-view {
  max-width: 1200px;
  margin: 0 auto;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  gap: 8px;
}

.job-info {
  font-size: 14px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.empty {
  text-align: center;
  padding: 48px;
}
</style>
