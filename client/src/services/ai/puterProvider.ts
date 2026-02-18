declare const puter: any

function getPuter(): any {
  if (typeof puter === 'undefined') {
    throw new Error('Puter.js not loaded. Make sure the Puter.js script is included in index.html')
  }
  return puter
}

export async function puterChat(systemPrompt: string, userPrompt: string, model?: string): Promise<string> {
  const p = getPuter()

  // Combine system + user into a single messages array for better control
  const response = await p.ai.chat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    {
      model: model || 'gpt-4o',
      max_tokens: 4096,
    }
  )

  // Check for error responses
  if (response?.success === false || response?.error) {
    const err = response.error
    if (err?.code === 'insufficient_funds') {
      throw new Error('Puter.js usage limit reached. Please try again later or sign in to Puter for higher limits.')
    }
    throw new Error(err?.message || 'Puter.js AI request failed')
  }

  // Extract text from response
  if (typeof response === 'string') return response

  // Standard chat completion response
  if (response?.message?.content) {
    const content = response.message.content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      const text = content.find((b: any) => b.type === 'text')
      if (text?.text) return text.text
    }
  }

  // Some models return via response.text or response.content
  if (response?.text) return response.text
  if (typeof response?.content === 'string') return response.content

  // Last resort
  const str = JSON.stringify(response)
  if (str.includes('"error"')) {
    throw new Error('Puter.js request failed: ' + str.slice(0, 200))
  }
  return str
}
