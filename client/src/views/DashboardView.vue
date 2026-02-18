<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useProfile } from '@/composables/useProfile'
import { useSessions } from '@/composables/useSessions'
import { useApplications } from '@/composables/useApplications'
import { downloadPdf } from '@/services/pdfExport'

const router = useRouter()
const { profile, hasProfile } = useProfile()
const { sessions, deleteSession } = useSessions()
const { hasApplicationForSession, createFromSession } = useApplications()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

async function handleDownload(session: any) {
  try {
    await downloadPdf(session.tailoredProfile)
    createFromSession(session.id, session.company, session.jobTitle)
  } catch (err: any) {
    alert(err.message || 'PDF download failed')
  }
}
</script>

<template>
  <div class="dashboard">
    <h1>CV Tailor</h1>
    <p class="subtitle">Tailor your CV for every job application.</p>

    <div v-if="!hasProfile()" class="empty-state card">
      <h2>Get Started</h2>
      <p>Upload your CV to create a profile, then tailor it for each job.</p>
      <button class="btn btn-primary" @click="router.push('/upload')">Upload CV</button>
    </div>

    <template v-else>
      <div class="profile-summary card">
        <div class="profile-info">
          <h2>{{ profile?.fullName }}</h2>
          <p>{{ profile?.email }} {{ profile?.phone ? `· ${profile.phone}` : '' }}</p>
          <p class="muted">{{ profile?.experience?.length || 0 }} experience entries · {{ profile?.skills?.length || 0 }} skill categories</p>
        </div>
        <div class="profile-actions">
          <button class="btn btn-secondary" @click="router.push('/upload')">Edit Profile</button>
          <button class="btn btn-primary" @click="router.push('/tailor')">Tailor for New Job</button>
        </div>
      </div>

      <div v-if="sessions.length > 0" class="sessions-section">
        <h3>Recent Sessions</h3>
        <div class="sessions-grid">
          <div v-for="session in sessions" :key="session.id" class="card session-card">
            <div class="session-info">
              <div class="session-title-row">
                <strong>{{ session.jobTitle }}</strong>
                <span v-if="hasApplicationForSession(session.id)" class="applied-badge">Beworben</span>
              </div>
              <span class="company">{{ session.company }}</span>
              <span class="date">{{ formatDate(session.createdAt) }}</span>
            </div>
            <div class="session-stats">
              <span class="badge badge-high">{{ session.suggestions.filter((s: any) => s.status === 'approved').length }} approved</span>
              <span class="muted">of {{ session.suggestions.length }} suggestions</span>
            </div>
            <div class="session-actions">
              <button class="btn btn-sm btn-primary" @click="handleDownload(session)">Download PDF</button>
              <button class="btn btn-sm btn-danger" @click="deleteSession(session.id)">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 4px;
}

.subtitle {
  color: var(--color-text-muted);
  margin-bottom: 24px;
}

.empty-state {
  text-align: center;
  padding: 48px;
}

.empty-state h2 {
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--color-text-muted);
  margin-bottom: 20px;
}

.profile-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.profile-info h2 {
  margin-bottom: 2px;
  font-size: 18px;
}

.profile-info p {
  font-size: 13px;
}

.muted {
  color: var(--color-text-muted);
}

.profile-actions {
  display: flex;
  gap: 8px;
}

.sessions-section h3 {
  margin-bottom: 12px;
  font-size: 16px;
}

.sessions-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.session-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.session-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.applied-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  background: #dcfce7;
  color: #166534;
}

.session-info .company {
  color: var(--color-accent);
  font-size: 13px;
}

.session-info .date {
  color: var(--color-text-muted);
  font-size: 12px;
}

.session-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.session-actions {
  display: flex;
  gap: 6px;
}
</style>
