import type { CVProfile, Suggestion } from '../../../../shared/types'

interface DirectParseResult {
  fullName: string
  [key: string]: any
}

export async function directParseCV(
  rawText: string,
  provider: 'anthropic' | 'openai' | 'gemini',
  apiKey: string,
  model?: string
): Promise<DirectParseResult> {
  const res = await fetch('/api/ai/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, provider, apiKey, model }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI parse failed' }))
    throw new Error(err.error || 'Failed to parse CV with AI')
  }

  return res.json()
}

export async function directSuggest(
  profile: CVProfile,
  jobDescription: string,
  provider: 'anthropic' | 'openai' | 'gemini',
  apiKey: string,
  model?: string
): Promise<{ jobTitle: string; company: string; seniorityLevel: string; suggestions: Suggestion[] }> {
  const res = await fetch('/api/ai/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, jobDescription, provider, apiKey, model }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI suggest failed' }))
    throw new Error(err.error || 'Failed to generate suggestions')
  }

  return res.json()
}
