import { ref } from 'vue'
import type { TailoredSession } from '../../../shared/types'

const STORAGE_KEY = 'cv-sessions'

function loadSessions(): TailoredSession[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

const sessions = ref<TailoredSession[]>(loadSessions())

export function useSessions() {
  function saveSessions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
  }

  function addSession(session: TailoredSession) {
    sessions.value.unshift(session)
    saveSessions()
  }

  function deleteSession(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id)
    saveSessions()
  }

  function getSession(id: string): TailoredSession | undefined {
    return sessions.value.find((s) => s.id === id)
  }

  return {
    sessions,
    addSession,
    deleteSession,
    getSession,
  }
}
