import { reactive } from 'vue'

export interface AiSettings {
  provider: 'puter' | 'anthropic' | 'openai' | 'gemini'
  anthropicKey: string
  anthropicModel: string
  openaiKey: string
  openaiModel: string
  geminiKey: string
  geminiModel: string
  puterModel: string
}

const STORAGE_KEY = 'cv-ai-settings'

function loadSettings(): AiSettings {
  const defaults: AiSettings = {
    provider: 'gemini',
    anthropicKey: '',
    anthropicModel: 'claude-sonnet-4-5-20250929',
    openaiKey: '',
    openaiModel: 'gpt-4o',
    geminiKey: '',
    geminiModel: 'gemini-2.0-flash',
    puterModel: 'gpt-4o',
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaults
  try {
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return defaults
  }
}

const settings = reactive<AiSettings>(loadSettings())

export function useAiProvider() {
  function updateSettings(partial: Partial<AiSettings>) {
    Object.assign(settings, partial)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }

  return {
    settings,
    updateSettings,
  }
}
