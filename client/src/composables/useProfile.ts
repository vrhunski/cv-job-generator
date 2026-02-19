import { ref } from 'vue'
import type { CVProfile } from '../../../shared/types'

const profile = ref<CVProfile | null>(null)
const profileLoading = ref(false)

async function fetchProfile() {
  profileLoading.value = true
  try {
    const res = await fetch('/api/profile')
    if (res.status === 404) { profile.value = null; return }
    if (!res.ok) return
    profile.value = await res.json()
  } catch {
    profile.value = null
  } finally {
    profileLoading.value = false
  }
}

fetchProfile()

export function useProfile() {
  async function saveProfile(p: CVProfile) {
    p.updatedAt = new Date().toISOString()
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
    if (res.ok) {
      profile.value = await res.json()
    }
  }

  async function updateProfile(patch: Partial<CVProfile>) {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      profile.value = await res.json()
    }
  }

  async function clearProfile() {
    await fetch('/api/profile', { method: 'DELETE' })
    profile.value = null
  }

  function hasProfile(): boolean {
    return profile.value !== null
  }

  return {
    profile,
    profileLoading,
    saveProfile,
    updateProfile,
    clearProfile,
    hasProfile,
    fetchProfile,
  }
}
