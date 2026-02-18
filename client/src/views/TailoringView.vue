<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProfile } from '@/composables/useProfile'
import { useSuggestions } from '@/composables/useSuggestions'
import { aiSuggest } from '@/services/ai/aiService'
import JobInput from '@/components/tailoring/JobInput.vue'
import SuggestionList from '@/components/tailoring/SuggestionList.vue'
import AiProviderToggle from '@/components/tailoring/AiProviderToggle.vue'

const router = useRouter()
const { profile, hasProfile } = useProfile()
const { totalCount, setSuggestions } = useSuggestions()

const jobDescription = ref('')
const jobTitle = ref('')
const company = ref('')
const seniorityLevel = ref('')
const loading = ref(false)
const error = ref('')

if (!hasProfile()) {
  router.push('/upload')
}

async function handleAnalyze() {
  if (!profile.value || !jobDescription.value.trim()) return

  loading.value = true
  error.value = ''

  try {
    const result = await aiSuggest(profile.value, jobDescription.value)

    jobTitle.value = result.jobTitle
    company.value = result.company
    seniorityLevel.value = result.seniorityLevel
    setSuggestions(result.suggestions)
  } catch (err: any) {
    error.value = err.message || 'Failed to generate suggestions'
  } finally {
    loading.value = false
  }
}

function goToPreview() {
  // Store the current job context in sessionStorage for preview page
  sessionStorage.setItem('cv-tailor-job', JSON.stringify({
    jobDescription: jobDescription.value,
    jobTitle: jobTitle.value,
    company: company.value,
    seniorityLevel: seniorityLevel.value,
  }))
  router.push('/preview')
}
</script>

<template>
  <div class="tailoring-view">
    <h1>Tailor Your CV</h1>

    <div class="two-col">
      <div class="left-col">
        <JobInput v-model="jobDescription" :loading="loading" @analyze="handleAnalyze" />
        <AiProviderToggle />

        <div v-if="jobTitle" class="job-info card">
          <div class="info-row"><strong>Job Title:</strong> {{ jobTitle }}</div>
          <div class="info-row"><strong>Company:</strong> {{ company }}</div>
          <div class="info-row"><strong>Seniority:</strong> {{ seniorityLevel }}</div>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </div>

      <div class="right-col">
        <div v-if="totalCount > 0">
          <SuggestionList />
          <button class="btn btn-primary preview-btn" @click="goToPreview">
            Preview Tailored CV
          </button>
        </div>
        <div v-else class="empty-state card">
          <p>Paste a job description and click "Analyze" to generate suggestions.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tailoring-view h1 {
  margin-bottom: 20px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 768px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.job-info {
  margin-top: 12px;
}

.info-row {
  font-size: 13px;
  margin-bottom: 4px;
}

.error {
  color: var(--color-danger);
  font-size: 14px;
  margin-top: 12px;
}

.empty-state {
  text-align: center;
  color: var(--color-text-muted);
  padding: 48px 24px;
}

.preview-btn {
  width: 100%;
  margin-top: 16px;
}
</style>
