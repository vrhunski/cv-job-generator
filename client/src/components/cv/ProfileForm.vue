<script setup lang="ts">
import { ref } from 'vue'
import type { CVProfile, WorkExperience, Education, Project } from '../../../../shared/types'
import ExperienceCard from './ExperienceCard.vue'
import SkillsEditor from './SkillsEditor.vue'
import EducationCard from './EducationCard.vue'
import LanguageEditor from './LanguageEditor.vue'
import ProjectCard from './ProjectCard.vue'

const profile = defineModel<CVProfile>({ required: true })
const photoInput = ref<HTMLInputElement | null>(null)
const photoError = ref('')

function addExperience() {
  profile.value.experience.push({
    id: crypto.randomUUID(),
    company: '',
    city: '',
    country: '',
    jobTitle: '',
    startDate: '',
    bullets: [],
    techStack: '',
  })
}

function addEducation() {
  profile.value.education.push({
    id: crypto.randomUUID(),
    degree: '',
    institution: '',
    city: '',
    country: '',
    graduationDate: '',
  })
}

function addProject() {
  if (!profile.value.projects) profile.value.projects = []
  profile.value.projects.push({
    id: crypto.randomUUID(),
    name: '',
    description: '',
    techStack: '',
  })
}

function handlePhotoUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  photoError.value = ''
  if (file.size > 2 * 1024 * 1024) {
    photoError.value = 'Image must be under 2MB'
    return
  }
  const reader = new FileReader()
  reader.onload = () => { profile.value.photo = reader.result as string }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="profile-form" v-if="profile">
    <section class="card form-section">
      <h3>Personal Information</h3>

      <!-- Photo: show preview if present, upload button if not -->
      <div v-if="profile.photo" class="photo-preview">
        <img :src="profile.photo" alt="Profile photo" class="photo-img" />
        <div class="photo-meta">
          <span class="photo-label">Profile photo</span>
          <button class="btn-remove-photo" @click="profile.photo = undefined">Remove</button>
        </div>
      </div>
      <div v-else class="photo-upload">
        <button class="btn btn-secondary btn-sm" @click="photoInput?.click()">
          + Add profile photo
        </button>
        <span v-if="photoError" class="photo-error">{{ photoError }}</span>
        <input
          ref="photoInput"
          type="file"
          accept="image/*"
          class="photo-input-hidden"
          @change="handlePhotoUpload"
        />
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="profile.fullName" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="profile.email" type="email" />
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input v-model="profile.phone" />
        </div>
        <div class="form-group">
          <label>Address</label>
          <input v-model="profile.address" />
        </div>
        <div class="form-group">
          <label>Nationality</label>
          <input v-model="profile.nationality" />
        </div>
        <div class="form-group">
          <label>Date of Birth</label>
          <input v-model="profile.dateOfBirth" />
        </div>
        <div class="form-group">
          <label>LinkedIn</label>
          <input v-model="profile.linkedin" />
        </div>
        <div class="form-group">
          <label>GitHub</label>
          <input v-model="profile.github" />
        </div>
        <div class="form-group">
          <label>Website</label>
          <input v-model="profile.website" />
        </div>
      </div>
    </section>

    <section class="card form-section">
      <h3>About Me</h3>
      <div class="form-group">
        <textarea v-model="profile.aboutMe" rows="4"></textarea>
      </div>
    </section>

    <section class="form-section">
      <h3>Work Experience</h3>
      <ExperienceCard
        v-for="(exp, i) in profile.experience"
        :key="exp.id || i"
        :model-value="exp"
        @update:model-value="(val) => profile.experience[i] = val"
        @remove="profile.experience.splice(i, 1)"
      />
      <button class="btn btn-secondary btn-sm" @click="addExperience">
        + Add Experience
      </button>
    </section>

    <section class="form-section">
      <h3>Education</h3>
      <EducationCard
        v-for="(edu, i) in profile.education"
        :key="edu.id || i"
        :model-value="edu"
        @update:model-value="(val) => profile.education[i] = val"
        @remove="profile.education.splice(i, 1)"
      />
      <button class="btn btn-secondary btn-sm" @click="addEducation">
        + Add Education
      </button>
    </section>

    <section class="form-section">
      <h3>Projects</h3>
      <ProjectCard
        v-for="(proj, i) in profile.projects"
        :key="proj.id || i"
        :model-value="proj"
        @update:model-value="(val) => profile.projects![i] = val"
        @remove="profile.projects!.splice(i, 1)"
      />
      <button class="btn btn-secondary btn-sm" @click="addProject">
        + Add Project
      </button>
    </section>

    <section class="form-section">
      <h3>Skills</h3>
      <SkillsEditor v-model="profile.skills" />
    </section>

    <section class="form-section">
      <h3>Languages</h3>
      <LanguageEditor v-model="profile.languages" />
    </section>
  </div>
</template>

<style scoped>
.form-section {
  margin-bottom: 24px;
}

.form-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: var(--color-primary);
}

.photo-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.photo-img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}

.photo-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.photo-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.btn-remove-photo {
  font-size: 12px;
  color: var(--color-danger);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.btn-remove-photo:hover {
  text-decoration: underline;
}

.photo-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.photo-input-hidden {
  display: none;
}

.photo-error {
  font-size: 12px;
  color: var(--color-danger);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
