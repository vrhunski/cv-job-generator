<script setup lang="ts">
import { ref } from 'vue'
import type { WorkExperience } from '../../../../shared/types'

const exp = defineModel<WorkExperience>({ required: true })
const emit = defineEmits<{ remove: [] }>()
const expanded = ref(true)
const newBullet = ref('')

function addBullet() {
  if (newBullet.value.trim()) {
    exp.value.bullets.push(newBullet.value.trim())
    newBullet.value = ''
  }
}

function removeBullet(i: number) {
  exp.value.bullets.splice(i, 1)
}
</script>

<template>
  <div class="card exp-card">
    <div class="exp-header" @click="expanded = !expanded">
      <div>
        <strong>{{ exp.jobTitle || 'New Position' }}</strong>
        <span class="company">{{ exp.company ? ` at ${exp.company}` : '' }}</span>
      </div>
      <div class="actions">
        <span class="toggle">{{ expanded ? '&#9660;' : '&#9654;' }}</span>
        <button class="btn btn-sm btn-danger" @click.stop="emit('remove')">Remove</button>
      </div>
    </div>

    <div v-if="expanded" class="exp-body">
      <div class="form-grid">
        <div class="form-group">
          <label>Job Title</label>
          <input v-model="exp.jobTitle" />
        </div>
        <div class="form-group">
          <label>Company</label>
          <input v-model="exp.company" />
        </div>
        <div class="form-group">
          <label>City</label>
          <input v-model="exp.city" />
        </div>
        <div class="form-group">
          <label>Country</label>
          <input v-model="exp.country" />
        </div>
        <div class="form-group">
          <label>Start Date</label>
          <input v-model="exp.startDate" placeholder="Jan 2020" />
        </div>
        <div class="form-group">
          <label>End Date</label>
          <input v-model="exp.endDate" placeholder="Present" />
        </div>
        <div class="form-group">
          <label>Business Sector</label>
          <input v-model="exp.businessSector" />
        </div>
        <div class="form-group">
          <label>Website</label>
          <input v-model="exp.website" />
        </div>
      </div>

      <div class="form-group">
        <label>Tech Stack</label>
        <input v-model="exp.techStack" placeholder="Java, Spring Boot, AWS..." />
      </div>

      <div class="form-group">
        <label>Bullet Points</label>
        <ul class="bullets">
          <li v-for="(bullet, i) in exp.bullets" :key="i">
            <input v-model="exp.bullets[i]" />
            <button class="remove-btn" @click="removeBullet(i)">&times;</button>
          </li>
        </ul>
        <div class="add-bullet">
          <input v-model="newBullet" placeholder="Add bullet point..." @keydown.enter="addBullet" />
          <button class="btn btn-sm btn-secondary" @click="addBullet">Add</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exp-card {
  margin-bottom: 12px;
}

.exp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.company {
  color: var(--color-text-muted);
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

.exp-body {
  margin-top: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.bullets {
  list-style: none;
  padding: 0;
}

.bullets li {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  align-items: center;
}

.bullets li input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: 18px;
  cursor: pointer;
}

.add-bullet {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.add-bullet input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
}
</style>
