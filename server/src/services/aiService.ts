import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface AiCallOptions {
  provider: 'anthropic' | 'openai' | 'gemini'
  apiKey: string
  model?: string
  systemPrompt: string
  userPrompt: string
}

export async function callAi(options: AiCallOptions): Promise<string> {
  const { provider, apiKey, model, systemPrompt, userPrompt } = options

  if (provider === 'anthropic') {
    return callAnthropic(apiKey, model || 'claude-sonnet-4-5-20250929', systemPrompt, userPrompt)
  }

  if (provider === 'openai') {
    return callOpenAI(apiKey, model || 'gpt-4o', systemPrompt, userPrompt)
  }

  if (provider === 'gemini') {
    return callGemini(apiKey, model || 'gemini-2.0-flash', systemPrompt, userPrompt)
  }

  throw new Error(`Unsupported provider: ${provider}`)
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Anthropic')
  }
  return textBlock.text
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = new OpenAI({ apiKey })

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4096,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }
  return content
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  })

  const result = await geminiModel.generateContent(userPrompt)
  const text = result.response.text()
  if (!text) {
    throw new Error('No response from Gemini')
  }
  return text
}
