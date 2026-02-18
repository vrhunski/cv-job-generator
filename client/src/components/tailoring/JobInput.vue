<script setup lang="ts">
const jobDescription = defineModel<string>({ required: true })
const emit = defineEmits<{ analyze: [] }>()

defineProps<{
  loading?: boolean
}>()
</script>

<template>
  <div class="job-input">
    <div class="form-group">
      <label>Paste Job Description</label>
      <textarea
        v-model="jobDescription"
        rows="12"
        placeholder="Paste the full job description here..."
      ></textarea>
    </div>
    <button
      class="btn btn-primary"
      :disabled="!jobDescription.trim() || loading"
      @click="emit('analyze')"
    >
      {{ loading ? 'Analyzing...' : 'Analyze & Generate Suggestions' }}
    </button>
  </div>
</template>

<style scoped>
.job-input textarea {
  resize: vertical;
  min-height: 200px;
}

.btn {
  width: 100%;
}
</style>
