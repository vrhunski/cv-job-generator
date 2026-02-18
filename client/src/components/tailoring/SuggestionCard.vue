<script setup lang="ts">
import type { Suggestion } from '../../../../shared/types'

const props = defineProps<{
  suggestion: Suggestion
}>()

const emit = defineEmits<{
  approve: [id: string]
  reject: [id: string]
}>()

const typeLabels: Record<string, string> = {
  align_job_title: 'Align Job Title',
  rewrite_summary_hook: 'Summary Hook',
  front_load_keywords: 'Front-load Keywords',
  highlight_brand: 'Highlight Brand',
  quantify_achievement: 'Quantify',
  match_seniority: 'Match Seniority',
  ats_keyword_inject: 'ATS Keyword',
  rephrase_bullet: 'Rephrase Bullet',
  add_bullet: 'Add Bullet',
  remove_bullet: 'Remove Bullet',
  reorder_experience: 'Reorder',
  add_skill: 'Add Skill',
  highlight_skill: 'Highlight Skill',
  remove_skill: 'Remove Skill',
  adjust_job_title: 'Adjust Title',
  enhance_tech_stack: 'Enhance Tech',
  add_keyword: 'Add Keyword',
  rewrite_summary: 'Rewrite Summary',
}
</script>

<template>
  <div class="suggestion-card card" :class="[`status-${suggestion.status}`]">
    <div class="card-header">
      <span class="badge" :class="`badge-${suggestion.impact}`">{{ suggestion.impact }}</span>
      <span class="type-label">{{ typeLabels[suggestion.type] || suggestion.type }}</span>
      <span class="section-label">{{ suggestion.section }}</span>
    </div>

    <div v-if="suggestion.original" class="original">
      <span class="label">Current:</span>
      <span>{{ suggestion.original }}</span>
    </div>

    <div class="proposed">
      <span class="label">Suggested:</span>
      <span>{{ suggestion.proposed }}</span>
    </div>

    <div class="reason">{{ suggestion.reason }}</div>

    <div v-if="suggestion.matchedKeyword" class="keyword">
      Keyword: <strong>{{ suggestion.matchedKeyword }}</strong>
    </div>

    <div class="card-actions">
      <button
        class="btn btn-sm"
        :class="suggestion.status === 'approved' ? 'btn-primary' : 'btn-secondary'"
        @click="emit('approve', suggestion.id)"
      >
        {{ suggestion.status === 'approved' ? 'Approved' : 'Approve' }}
      </button>
      <button
        class="btn btn-sm"
        :class="suggestion.status === 'rejected' ? 'btn-danger' : 'btn-secondary'"
        @click="emit('reject', suggestion.id)"
      >
        {{ suggestion.status === 'rejected' ? 'Rejected' : 'Reject' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.suggestion-card {
  border-left: 3px solid var(--color-border);
  transition: all 0.2s;
}

.suggestion-card.status-approved {
  border-left-color: var(--color-success);
  background: rgba(16, 185, 129, 0.03);
}

.suggestion-card.status-rejected {
  border-left-color: var(--color-danger);
  opacity: 0.6;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.type-label {
  font-weight: 600;
  font-size: 13px;
}

.section-label {
  color: var(--color-text-muted);
  font-size: 12px;
}

.original, .proposed {
  font-size: 13px;
  margin-bottom: 6px;
  line-height: 1.5;
}

.label {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--color-text-muted);
  display: block;
  margin-bottom: 2px;
}

.original {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.proposed {
  color: var(--color-text);
}

.reason {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  font-style: italic;
}

.keyword {
  font-size: 12px;
  margin-bottom: 8px;
}

.card-actions {
  display: flex;
  gap: 6px;
}
</style>
