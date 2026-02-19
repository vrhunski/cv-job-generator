<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CVProfile } from '../../../shared/types'
import FileDropzone from '@/components/common/FileDropzone.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ProfileForm from '@/components/cv/ProfileForm.vue'
import { useProfile } from '@/composables/useProfile'
import { parseFile } from '@/services/cvParser'
import { aiParseCV } from '@/services/ai/aiService'

// Normalize AI responses that may come in different shapes
function normalizeArray(val: any): any[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') return val.split(',').map((s: string) => s.trim()).filter(Boolean)
  if (val && typeof val === 'object') return Object.values(val)
  return []
}

function normalizeSkills(val: any): Array<{ id: string; category: string; skills: string[] }> {
  // Already correct format: [{ category, skills }]
  if (Array.isArray(val)) {
    return val.map((s: any) => ({
      id: crypto.randomUUID(),
      category: s.category || s.name || 'Other',
      skills: normalizeArray(s.skills || s.items || s.list),
    }))
  }
  // Object format: { "Cloud": ["AWS", ...], "Backend": [...] }
  if (val && typeof val === 'object') {
    return Object.entries(val).map(([category, skills]) => ({
      id: crypto.randomUUID(),
      category,
      skills: normalizeArray(skills),
    }))
  }
  return []
}

// Helper to get field value handling various naming conventions
function getField(parsed: any, ...keys: string[]): any {
  for (const key of keys) {
    if (parsed[key] !== undefined && parsed[key] !== null) {
      return parsed[key]
    }
  }
  return undefined
}

const router = useRouter()
const { profile, saveProfile } = useProfile()

const step = ref<'upload' | 'parsing' | 'review'>('upload')
const error = ref('')
const parsedProfile = ref<CVProfile | null>(profile.value ? { ...profile.value } : null)
const debugRaw = ref<any>(null)

if (profile.value) {
  step.value = 'review'
}

async function handleFileSelected(file: File) {
  step.value = 'parsing'
  error.value = ''

  try {
    const { text, fileName, photo } = await parseFile(file)

    const parsed = await aiParseCV(text)
    debugRaw.value = parsed

    console.log('[UploadView] Parsed CV:', parsed)

    parsedProfile.value = {
      id: crypto.randomUUID(),
      photo: photo || undefined,
      fullName: getField(parsed, 'fullName', 'full_name', 'name') || '',
      nationality: getField(parsed, 'nationality', 'nationality'),
      dateOfBirth: getField(parsed, 'dateOfBirth', 'date_of_birth', 'dob', 'birthDate', 'birth_date') || undefined,
      gender: getField(parsed, 'gender', 'gender'),
      phone: getField(parsed, 'phone', 'phoneNumber', 'phone_number', 'mobile', 'telephone') || '',
      email: getField(parsed, 'email', 'emailAddress', 'email_address') || '',
      address: getField(parsed, 'address', 'location', 'city', 'fullAddress', 'full_address') || undefined,
      linkedin: getField(parsed, 'linkedin', 'linkedIn', 'linkedin_url', 'LinkedIn') || undefined,
      github: getField(parsed, 'github', 'gitHub', 'github_url', 'GitHub') || undefined,
      website: getField(parsed, 'website', 'portfolio', 'portfolioUrl', 'portfolio_url') || undefined,
      aboutMe: getField(parsed, 'aboutMe', 'about_me', 'summary', 'profile', 'bio', 'personalStatement') || '',
      experience: normalizeArray(getField(parsed, 'experience', 'workExperience', 'work_experience', 'jobs', 'employment')).map((e: any) => ({
        id: crypto.randomUUID(),
        company: getField(e, 'company', 'companyName', 'company_name', 'employer', 'organization') || '',
        city: getField(e, 'city', 'location', 'workCity') || '',
        country: getField(e, 'country', 'workCountry') || '',
        website: getField(e, 'website', 'companyUrl', 'company_url'),
        businessSector: getField(e, 'businessSector', 'business_sector', 'industry', 'sector'),
        jobTitle: getField(e, 'jobTitle', 'job_title', 'title', 'role', 'position') || '',
        startDate: getField(e, 'startDate', 'start_date', 'from', 'fromDate', 'from_date') || '',
        endDate: getField(e, 'endDate', 'end_date', 'to', 'toDate', 'to_date', 'present') || undefined,
        bullets: normalizeArray(getField(e, 'bullets', 'responsibilities', 'description', 'achievements', 'tasks', 'duties')),
        techStack: getField(e, 'techStack', 'tech_stack', 'technologies', 'skills', 'tools') || '',
      })),
      education: normalizeArray(getField(parsed, 'education', 'educationHistory', 'academicBackground', 'studies')).map((e: any) => ({
        id: crypto.randomUUID(),
        degree: getField(e, 'degree', 'qualification', 'title', 'degreeName', 'degree_name') || '',
        institution: getField(e, 'institution', 'school', 'university', 'institutionName', 'institution_name', 'college') || '',
        city: getField(e, 'city', 'location', 'studyCity') || '',
        country: getField(e, 'country', 'studyCountry') || '',
        website: getField(e, 'website', 'institutionUrl', 'institution_url'),
        graduationDate: getField(e, 'graduationDate', 'graduation_date', 'year', 'endDate', 'end_date', 'completionDate') || '',
        field: getField(e, 'field', 'fieldOfStudy', 'field_of_study', 'major', 'discipline', 'specialization'),
      })),
      skills: normalizeSkills(getField(parsed, 'skills', 'skillCategories', 'skill_categories', 'technicalSkills', 'technical_skills', 'competencies')),
      languages: normalizeArray(getField(parsed, 'languages', 'languageSkills', 'language_skills', 'spokenLanguages', 'spoken_languages')).map((l: any) => ({
        language: getField(l, 'language', 'name', 'languageName', 'language_name') || '',
        isMotherTongue: getField(l, 'isMotherTongue', 'is_mother_tongue', 'native', 'isNative', 'is_native') || false,
        listening: getField(l, 'listening', 'listeningLevel', 'listening_level'),
        reading: getField(l, 'reading', 'readingLevel', 'reading_level'),
        writing: getField(l, 'writing', 'writingLevel', 'writing_level'),
        spokenProduction: getField(l, 'spokenProduction', 'spoken_production', 'speaking', 'spokenProductionLevel'),
        spokenInteraction: getField(l, 'spokenInteraction', 'spoken_interaction', 'conversation', 'spokenInteractionLevel'),
      })),
      rawText: text,
      uploadedFileName: fileName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    console.log('[UploadView] Normalized profile:', parsedProfile.value)

    step.value = 'review'
  } catch (err: any) {
    console.error('[UploadView] Error:', err)
    error.value = err.message || 'Failed to parse CV'
    step.value = 'upload'
  }
}

async function handleSave() {
  if (parsedProfile.value) {
    await saveProfile(parsedProfile.value)
    router.push('/')
  }
}
</script>

<template>
  <div class="upload-view">
    <h1>Upload & Review CV</h1>

    <div v-if="step === 'upload'" class="upload-step">
      <p class="subtitle">Upload your CV and let AI parse it into a structured profile.</p>
      <FileDropzone @file-selected="handleFileSelected" />
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-if="step === 'parsing'" class="parsing-step">
      <LoadingSpinner message="AI is reading your CV..." />
    </div>

    <div v-if="step === 'review' && parsedProfile" class="review-step">
      <div class="review-header">
        <p class="subtitle">Review the parsed data and correct any mistakes.</p>
        <div class="review-actions">
          <button class="btn btn-secondary" @click="step = 'upload'">Upload Different CV</button>
          <button class="btn btn-primary" @click="handleSave">Save Profile</button>
        </div>
      </div>
      <ProfileForm v-model="parsedProfile" />
      <div class="bottom-actions">
        <button class="btn btn-primary" @click="handleSave">Save Profile</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-view {
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 8px;
}

.subtitle {
  color: var(--color-text-muted);
  margin-bottom: 20px;
  font-size: 14px;
}

.error {
  color: var(--color-danger);
  margin-top: 12px;
  font-size: 14px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.review-actions {
  display: flex;
  gap: 8px;
}

.bottom-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
