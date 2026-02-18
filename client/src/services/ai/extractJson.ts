/**
 * Extracts JSON from an AI response that may contain markdown, code fences,
 * or other surrounding text.
 */
export function extractJson(raw: string): string {
  let text = raw.trim()

  // 1. Try to extract from ```json ... ``` or ``` ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim()
  }

  // 2. Try to find a JSON object { ... } in the text - use balanced brace matching
  const objMatch = findBalancedJson(text, '{', '}')
  if (objMatch) {
    try {
      JSON.parse(objMatch)
      return objMatch
    } catch {}
  }

  // 3. Try to find a JSON array [ ... ] in the text - use balanced bracket matching
  const arrMatch = findBalancedJson(text, '[', ']')
  if (arrMatch) {
    try {
      JSON.parse(arrMatch)
      return arrMatch
    } catch {}
  }

  // 4. Return as-is and let JSON.parse throw with a clear message
  return text
}

/**
 * Finds balanced JSON object/array in text by counting opening/closing braces.
 */
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

export function parseJsonResponse(raw: string): any {
  const json = extractJson(raw)
  try {
    return JSON.parse(json)
  } catch (e) {
    throw new Error(`AI returned invalid JSON. First 200 chars: ${raw.slice(0, 200)}`)
  }
}
