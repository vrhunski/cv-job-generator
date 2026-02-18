<script setup lang="ts">
import type { CVProfile } from '../../../../shared/types'

defineProps<{
  profile: CVProfile
  label?: string
}>()
</script>

<template>
  <div class="cv-preview">
    <div v-if="label" class="preview-label">{{ label }}</div>
    <div class="cv-content">
      <div class="cv-header">
        <div class="cv-header-inner">
          <div class="cv-header-text">
            <h2>{{ profile.fullName }}</h2>
            <div class="contact-line">
              <span v-if="profile.email">{{ profile.email }}</span>
              <span v-if="profile.phone"> · {{ profile.phone }}</span>
              <span v-if="profile.address"> · {{ profile.address }}</span>
            </div>
            <div class="links-line">
              <span v-if="profile.linkedin">{{ profile.linkedin }}</span>
              <span v-if="profile.github"> · {{ profile.github }}</span>
            </div>
          </div>
          <img v-if="profile.photo" :src="profile.photo" class="cv-header-photo" alt="Profile" />
        </div>
      </div>

      <div v-if="profile.aboutMe" class="cv-section">
        <h3>About Me</h3>
        <p>{{ profile.aboutMe }}</p>
      </div>

      <div v-if="profile.experience?.length" class="cv-section">
        <h3>Work Experience</h3>
        <div v-for="exp in profile.experience" :key="exp.id" class="exp-item">
          <div class="exp-top">
            <strong>{{ exp.jobTitle }}</strong>
            <span class="dates">{{ exp.startDate }} — {{ exp.endDate || 'Present' }}</span>
          </div>
          <div class="exp-company">{{ exp.company }} · {{ exp.city }}, {{ exp.country }}</div>
          <ul v-if="exp.bullets?.length">
            <li v-for="(b, i) in exp.bullets" :key="i">{{ b }}</li>
          </ul>
          <div v-if="exp.techStack" class="tech">Tech: {{ exp.techStack }}</div>
        </div>
      </div>

      <div v-if="profile.education?.length" class="cv-section">
        <h3>Education</h3>
        <div v-for="edu in profile.education" :key="edu.id" class="edu-item">
          <strong>{{ edu.degree }}{{ edu.field ? ` — ${edu.field}` : '' }}</strong>
          <div>{{ edu.institution }} · {{ edu.city }}, {{ edu.country }} · {{ edu.graduationDate }}</div>
        </div>
      </div>

      <div v-if="profile.skills?.length" class="cv-section">
        <h3>Skills</h3>
        <div v-for="cat in profile.skills" :key="cat.id" class="skill-row">
          <strong>{{ cat.category }}:</strong> {{ cat.skills.join(', ') }}
        </div>
      </div>

      <div v-if="profile.languages?.length" class="cv-section">
        <h3>Languages</h3>
        <div v-for="lang in profile.languages" :key="lang.language" class="lang-row">
          <strong>{{ lang.language }}</strong>
          <span v-if="lang.isMotherTongue"> — Mother tongue</span>
          <span v-else-if="lang.listening"> — {{ lang.listening }}/{{ lang.reading }}/{{ lang.writing }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cv-preview {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.preview-label {
  background: var(--color-primary);
  color: white;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cv-content {
  padding: 20px;
  font-size: 12px;
  line-height: 1.5;
}

.cv-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-primary);
}

.cv-header-inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.cv-header-text {
  flex: 1;
  min-width: 0;
}

.cv-header-photo {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}

.cv-header h2 {
  font-size: 18px;
  margin-bottom: 4px;
}

.contact-line, .links-line {
  font-size: 11px;
  color: var(--color-text-muted);
}

.cv-section {
  margin-bottom: 14px;
}

.cv-section h3 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 3px;
  margin-bottom: 8px;
}

.exp-item {
  margin-bottom: 10px;
}

.exp-top {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.dates {
  color: var(--color-text-muted);
  font-size: 11px;
}

.exp-company {
  color: var(--color-accent);
  font-size: 11px;
  margin-bottom: 4px;
}

ul {
  padding-left: 16px;
  margin: 4px 0;
}

li {
  font-size: 11px;
  margin-bottom: 2px;
}

.tech {
  font-size: 10px;
  color: var(--color-text-muted);
}

.edu-item {
  margin-bottom: 6px;
  font-size: 12px;
}

.edu-item div {
  font-size: 11px;
  color: var(--color-text-muted);
}

.skill-row, .lang-row {
  font-size: 12px;
  margin-bottom: 3px;
}
</style>
