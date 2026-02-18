import { ref } from 'vue'
import type { JobApplication, ApplicationStatus } from '../../../shared/types'

const STORAGE_KEY = 'cv-applications'

function loadApplications(): JobApplication[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

const applications = ref<JobApplication[]>(loadApplications())

export function useApplications() {
  function saveApplications() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications.value))
  }

  function addApplication(app: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>): JobApplication {
    const now = new Date().toISOString()
    const newApp: JobApplication = {
      ...app,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    applications.value.unshift(newApp)
    saveApplications()
    return newApp
  }

  function updateStatus(id: string, status: ApplicationStatus) {
    const app = applications.value.find((a) => a.id === id)
    if (app) {
      app.status = status
      app.updatedAt = new Date().toISOString()
      saveApplications()
    }
  }

  function linkSession(id: string, sessionId: string) {
    const app = applications.value.find((a) => a.id === id)
    if (app) {
      app.sessionId = sessionId
      app.updatedAt = new Date().toISOString()
      saveApplications()
    }
  }

  function updateApplication(id: string, patch: Partial<Pick<JobApplication, 'company' | 'jobTitle' | 'appliedDate' | 'status' | 'notes'>>) {
    const app = applications.value.find((a) => a.id === id)
    if (app) {
      Object.assign(app, patch, { updatedAt: new Date().toISOString() })
      saveApplications()
    }
  }

  function deleteApplication(id: string) {
    applications.value = applications.value.filter((a) => a.id !== id)
    saveApplications()
  }

  function hasApplicationForSession(sessionId: string): boolean {
    return applications.value.some((a) => a.sessionId === sessionId)
  }

  function createFromSession(sessionId: string, company: string, jobTitle: string): JobApplication {
    const existing = applications.value.find((a) => a.sessionId === sessionId)
    if (existing) return existing
    return addApplication({
      sessionId,
      company,
      jobTitle,
      appliedDate: new Date().toISOString().split('T')[0],
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
  }
}
