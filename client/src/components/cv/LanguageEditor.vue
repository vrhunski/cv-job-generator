<script setup lang="ts">
import type { LanguageSkill } from '../../../../shared/types'

const languages = defineModel<LanguageSkill[]>({ required: true })

const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function addLanguage() {
  languages.value.push({
    language: '',
    isMotherTongue: false,
  })
}

function removeLanguage(i: number) {
  languages.value.splice(i, 1)
}
</script>

<template>
  <div class="lang-editor">
    <div v-for="(lang, i) in languages" :key="i" class="card lang-item">
      <div class="lang-header">
        <input v-model="lang.language" placeholder="Language" class="lang-name" />
        <label class="mother-tongue">
          <input type="checkbox" v-model="lang.isMotherTongue" />
          Mother tongue
        </label>
        <button class="btn btn-sm btn-danger" @click="removeLanguage(i)">Remove</button>
      </div>
      <div v-if="!lang.isMotherTongue" class="cefr-grid">
        <div class="form-group">
          <label>Listening</label>
          <select v-model="lang.listening">
            <option value="">-</option>
            <option v-for="l in cefrLevels" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Reading</label>
          <select v-model="lang.reading">
            <option value="">-</option>
            <option v-for="l in cefrLevels" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Writing</label>
          <select v-model="lang.writing">
            <option value="">-</option>
            <option v-for="l in cefrLevels" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Spoken Production</label>
          <select v-model="lang.spokenProduction">
            <option value="">-</option>
            <option v-for="l in cefrLevels" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Spoken Interaction</label>
          <select v-model="lang.spokenInteraction">
            <option value="">-</option>
            <option v-for="l in cefrLevels" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
      </div>
    </div>
    <button class="btn btn-secondary btn-sm" @click="addLanguage">+ Add Language</button>
  </div>
</template>

<style scoped>
.lang-item {
  margin-bottom: 12px;
}

.lang-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.lang-name {
  border: none;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
  font-weight: 600;
  padding: 4px 0;
  background: transparent;
}

.lang-name:focus {
  outline: none;
  border-bottom-color: var(--color-accent);
}

.mother-tongue {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.cefr-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

@media (max-width: 600px) {
  .cefr-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
