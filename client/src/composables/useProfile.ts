import { ref, watch } from 'vue'
import type { CVProfile } from '../../../shared/types'

const STORAGE_KEY = 'cv-profile'

function loadProfile(): CVProfile | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const profile = ref<CVProfile | null>(loadProfile())

export function useProfile() {
  function saveProfile(p: CVProfile) {
    p.updatedAt = new Date().toISOString()
    profile.value = p
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  }

  function clearProfile() {
    profile.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function hasProfile(): boolean {
    return profile.value !== null
  }

  return {
    profile,
    saveProfile,
    clearProfile,
    hasProfile,
  }
}
