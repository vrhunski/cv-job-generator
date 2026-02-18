import { reactive } from 'vue'

export interface BridgeSettings {
  host: string
  port: number
  username: string
  password: string
  folder: string
}

const STORAGE_KEY = 'cv-bridge-settings'

function loadSettings(): BridgeSettings {
  const defaults: BridgeSettings = {
    host: 'localhost',
    port: 1143,
    username: '',
    password: '',
    folder: 'applied',
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaults
  try {
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return defaults
  }
}

const settings = reactive<BridgeSettings>(loadSettings())

export function useBridgeSettings() {
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }

  function updateSettings(partial: Partial<BridgeSettings>) {
    Object.assign(settings, partial)
    save()
  }

  return { settings, updateSettings }
}
