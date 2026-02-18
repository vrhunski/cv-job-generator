import type { CVProfile } from '../../../../shared/types'
import { useAiProvider } from '@/composables/useAiProvider'
import { puterChat } from './puterProvider'
import { directParseCV, directSuggest } from './directProvider'
import { parseJsonResponse } from './extractJson'
import {
  PARSE_CV_SYSTEM,
  buildParseCVPrompt,
  ANALYZE_JOB_SYSTEM,
  buildAnalyzeJobPrompt,
  SUGGESTIONS_SYSTEM,
  buildSuggestionsPrompt,
} from './prompts'

export async function aiParseCV(rawText: string): Promise<any> {
  const { settings } = useAiProvider()

  if (settings.provider === 'puter') {
    const result = await puterChat(
      PARSE_CV_SYSTEM,
      buildParseCVPrompt(rawText),
      settings.puterModel
    )
    return parseJsonResponse(result)
  }

  const { provider, apiKey, model } = getDirectConfig(settings)
  return directParseCV(rawText, provider, apiKey, model)
}

export async function aiSuggest(
  profile: CVProfile,
  jobDescription: string
): Promise<{ jobTitle: string; company: string; seniorityLevel: string; suggestions: any[] }> {
  const { settings } = useAiProvider()

  if (settings.provider === 'puter') {
    const jobAnalysis = await puterChat(
      ANALYZE_JOB_SYSTEM,
      buildAnalyzeJobPrompt(jobDescription),
      settings.puterModel
    )

    const suggestionsRaw = await puterChat(
      SUGGESTIONS_SYSTEM,
      buildSuggestionsPrompt(JSON.stringify(profile), jobAnalysis, jobDescription),
      settings.puterModel
    )

    const jobInfo = parseJsonResponse(jobAnalysis)
    const suggestions = parseJsonResponse(suggestionsRaw)

    return {
      jobTitle: jobInfo.jobTitle || '',
      company: jobInfo.company || '',
      seniorityLevel: jobInfo.seniorityLevel || 'Mid',
      suggestions,
    }
  }

  const { provider, apiKey, model } = getDirectConfig(settings)
  return directSuggest(profile, jobDescription, provider, apiKey, model)
}

function getDirectConfig(settings: any): { provider: 'anthropic' | 'openai' | 'gemini'; apiKey: string; model: string } {
  const provider = settings.provider as 'anthropic' | 'openai' | 'gemini'
  let apiKey: string
  let model: string

  switch (provider) {
    case 'anthropic':
      apiKey = settings.anthropicKey
      model = settings.anthropicModel
      break
    case 'openai':
      apiKey = settings.openaiKey
      model = settings.openaiModel
      break
    case 'gemini':
      apiKey = settings.geminiKey
      model = settings.geminiModel
      break
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }

  if (!apiKey) throw new Error(`Please set your ${provider} API key in Settings`)
  return { provider, apiKey, model }
}
