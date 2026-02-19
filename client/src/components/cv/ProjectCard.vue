<script setup lang="ts">
import { ref } from 'vue'
import type { Project } from '../../../../shared/types'

const project = defineModel<Project>({ required: true })
const emit = defineEmits<{ remove: [] }>()
const expanded = ref(true)
</script>

<template>
  <div class="card project-card">
    <div class="project-header" @click="expanded = !expanded">
      <strong>{{ project.name || 'New Project' }}</strong>
      <div class="actions">
        <span class="toggle">{{ expanded ? '&#9660;' : '&#9654;' }}</span>
        <button class="btn btn-sm btn-danger" @click.stop="emit('remove')">Remove</button>
      </div>
    </div>

    <div v-if="expanded" class="project-body">
      <div class="form-group">
        <label>Project Name</label>
        <input v-model="project.name" placeholder="e.g. Open Source Scheduler" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea v-model="project.description" rows="3" placeholder="Briefly describe the project, your role, and impact..." />
      </div>
      <div class="form-group">
        <label>Tech Stack</label>
        <input v-model="project.techStack" placeholder="React, Node.js, PostgreSQL..." />
        <span class="hint">Comma-separated</span>
      </div>
      <div class="form-group">
        <label>Link <span class="optional">(optional)</span></label>
        <input v-model="project.link" type="url" placeholder="https://github.com/..." />
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  margin-bottom: 12px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toggle {
  font-size: 12px;
  color: var(--color-text-muted);
}

.project-body {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
  display: block;
}

.optional {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 400;
}
</style>
