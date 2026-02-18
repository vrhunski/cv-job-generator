import { Router } from 'express'
import { callAi } from '../services/aiService'
import { PARSE_CV_SYSTEM, buildParseCVPrompt } from '../prompts/parseCV'
import { ANALYZE_JOB_SYSTEM, buildAnalyzeJobPrompt } from '../prompts/analyzeJob'
import { SUGGESTIONS_SYSTEM, buildSuggestionsPrompt } from '../prompts/generateSuggestions'

function extractJson(raw: string): string {
  const text = raw.trim()

  // 1. Extract from code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // 2. Find a JSON object { ... } using balanced brace matching
  const objMatch = findBalancedJson(text, '{', '}')
  if (objMatch) {
    try { JSON.parse(objMatch); return objMatch } catch {}
  }

  // 3. Find a JSON array [ ... ] using balanced bracket matching
  const arrMatch = findBalancedJson(text, '[', ']')
  if (arrMatch) {
    try { JSON.parse(arrMatch); return arrMatch } catch {}
  }

  return text
}

function findBalancedJson(text: string, openChar: string, closeChar: string): string | null {
  const startIndex = text.indexOf(openChar)
  if (startIndex === -1) return null

  let count = 0
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === openChar) count++
    if (text[i] === closeChar) count--
    if (count === 0) {
      const candidate = text.slice(startIndex, i + 1)
      // Quick validation: must have at least one key-value pair for objects
      if (openChar === '{' && !candidate.includes(':')) return null
      return candidate
    }
  }
  return null
}

const router = Router()

// POST /api/ai/parse — Parse raw CV text into structured profile
router.post('/parse', async (req, res) => {
  try {
    const { rawText, provider, apiKey, model } = req.body

    if (!rawText || !provider || !apiKey) {
      return res.status(400).json({ error: 'rawText, provider, and apiKey are required' })
    }

    const result = await callAi({
      provider,
      apiKey,
      model,
      systemPrompt: PARSE_CV_SYSTEM,
      userPrompt: buildParseCVPrompt(rawText),
    })

    const profile = JSON.parse(extractJson(result))
    res.json(profile)
  } catch (err: any) {
    console.error('AI parse error:', err)
    res.status(500).json({ error: err.message || 'Failed to parse CV with AI' })
  }
})

// POST /api/ai/suggest — Generate tailored suggestions
router.post('/suggest', async (req, res) => {
  try {
    const { profile, jobDescription, provider, apiKey, model } = req.body

    if (!profile || !jobDescription || !provider || !apiKey) {
      return res.status(400).json({ error: 'profile, jobDescription, provider, and apiKey are required' })
    }

    // Step 1: Analyze job description
    const jobAnalysis = await callAi({
      provider,
      apiKey,
      model,
      systemPrompt: ANALYZE_JOB_SYSTEM,
      userPrompt: buildAnalyzeJobPrompt(jobDescription),
    })

    // Step 2: Generate suggestions
    const suggestionsRaw = await callAi({
      provider,
      apiKey,
      model,
      systemPrompt: SUGGESTIONS_SYSTEM,
      userPrompt: buildSuggestionsPrompt(
        JSON.stringify(profile),
        jobAnalysis,
        jobDescription
      ),
    })

    const jobInfo = JSON.parse(extractJson(jobAnalysis))
    const suggestions = JSON.parse(extractJson(suggestionsRaw))

    res.json({
      jobTitle: jobInfo.jobTitle,
      company: jobInfo.company,
      seniorityLevel: jobInfo.seniorityLevel,
      suggestions,
    })
  } catch (err: any) {
    console.error('AI suggest error:', err)
    res.status(500).json({ error: err.message || 'Failed to generate suggestions' })
  }
})

export default router
