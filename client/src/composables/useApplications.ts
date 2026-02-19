import { ref } from 'vue'
import type { JobApplication, ApplicationStatus } from '../../../shared/types'

const applications = ref<JobApplication[]>([])

async function fetchApplications() {
  try {
    const res = await fetch('/api/applications')
    if (res.ok) applications.value = await res.json()
  } catch {
    applications.value = []
  }
}

fetchApplications()

export function useApplications() {
  async function addApplication(
    app: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JobApplication> {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app),
    })
    const newApp: JobApplication = await res.json()
    applications.value.unshift(newApp)
    return newApp
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: JobApplication = await res.json()
      const idx = applications.value.findIndex((a) => a.id === id)
      if (idx !== -1) applications.value[idx] = updated
    }
  }

  async function updateApplication(
    id: string,
    patch: Partial<Pick<JobApplication, 'company' | 'jobTitle' | 'appliedDate' | 'status' | 'notes' | 'sessionId'>>
  ) {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated: JobApplication = await res.json()
      const idx = applications.value.findIndex((a) => a.id === id)
      if (idx !== -1) applications.value[idx] = updated
    }
  }

  async function linkSession(id: string, sessionId: string) {
    await updateApplication(id, { sessionId })
  }

  async function deleteApplication(id: string) {
    await fetch(`/api/applications/${id}`, { method: 'DELETE' })
    applications.value = applications.value.filter((a) => a.id !== id)
  }

  function hasApplicationForSession(sessionId: string): boolean {
    return applications.value.some((a) => a.sessionId === sessionId)
  }

  async function createFromSession(
    sessionId: string,
    company: string,
    jobTitle: string
  ): Promise<JobApplication> {
    const existing = applications.value.find((a) => a.sessionId === sessionId)
    if (existing) return existing
    return addApplication({
      sessionId,
      company,
      jobTitle,
      appliedDate: new Date().toISOString().split('T')[0]!,
      status: 'gesendet',
    })
  }

  return {
    applications,
    addApplication,
    updateStatus,
    updateApplication,
    linkSession,
    deleteApplication,
    hasApplicationForSession,
    createFromSession,
    fetchApplications,
  }
}
