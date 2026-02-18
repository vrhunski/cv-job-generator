<script setup lang="ts">
import type { SkillCategory } from '../../../../shared/types'
import TagChips from '@/components/common/TagChips.vue'

const skills = defineModel<SkillCategory[]>({ required: true })

function addCategory() {
  skills.value.push({
    id: crypto.randomUUID(),
    category: 'New Category',
    skills: [],
  })
}

function removeCategory(i: number) {
  skills.value.splice(i, 1)
}

function addSkill(catIndex: number, skill: string) {
  const cat = skills.value[catIndex]
  if (cat) cat.skills.push(skill)
}

function removeSkill(catIndex: number, skillIndex: number) {
  const cat = skills.value[catIndex]
  if (cat) cat.skills.splice(skillIndex, 1)
}
</script>

<template>
  <div class="skills-editor">
    <div v-for="(cat, i) in skills" :key="cat.id || i" class="card skill-category">
      <div class="cat-header">
        <input v-model="cat.category" class="cat-name" />
        <button class="btn btn-sm btn-danger" @click="removeCategory(i)">Remove</button>
      </div>
      <TagChips
        :tags="cat.skills"
        :removable="true"
        @remove="(si) => removeSkill(i, si)"
        @add="(s) => addSkill(i, s)"
      />
    </div>
    <button class="btn btn-secondary btn-sm" @click="addCategory">+ Add Category</button>
  </div>
</template>

<style scoped>
.skill-category {
  margin-bottom: 12px;
}

.cat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.cat-name {
  border: none;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
  font-weight: 600;
  padding: 4px 0;
  background: transparent;
  color: var(--color-primary);
}

.cat-name:focus {
  outline: none;
  border-bottom-color: var(--color-accent);
}
</style>
