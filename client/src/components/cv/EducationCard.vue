<script setup lang="ts">
import type { Education } from '../../../../shared/types'

const edu = defineModel<Education>({ required: true })
const emit = defineEmits<{ remove: [] }>()
</script>

<template>
  <div class="card edu-card">
    <div class="edu-header">
      <strong>{{ edu.degree || 'New Education' }}</strong>
      <button class="btn btn-sm btn-danger" @click="emit('remove')">Remove</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Degree</label>
        <input v-model="edu.degree" />
      </div>
      <div class="form-group">
        <label>Field of Study</label>
        <input v-model="edu.field" />
      </div>
      <div class="form-group">
        <label>Institution</label>
        <input v-model="edu.institution" />
      </div>
      <div class="form-group">
        <label>Graduation Date</label>
        <input v-model="edu.graduationDate" placeholder="2020" />
      </div>
      <div class="form-group">
        <label>City</label>
        <input v-model="edu.city" />
      </div>
      <div class="form-group">
        <label>Country</label>
        <input v-model="edu.country" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.edu-card {
  margin-bottom: 12px;
}

.edu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
