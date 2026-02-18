import { Router } from 'express'
import { fetchJobEmails, listFolders } from '../services/mailImport'
import { callAi } from '../services/aiService'
import type { ParsedEmail } from '../services/mailImport'

const router = Router()

function extractJson(raw: string): string {
  // 1. Strip markdown fences by replacing opening + closing tags
  let text = raw.trim()
  const stripped = text
    .replace(/^```(?:\w+)?\s*\r?\n?/, '')  // remove opening fence
    .replace(/\r?\n?```\s*$/, '')           // remove closing fence
    .trim()
  try { JSON.parse(stripped); return stripped } catch {}

  // 2. Find balanced [ ... ] array only — never fall back to single object
  const arrStart = text.indexOf('[')
  if (arrStart !== -1) {
    let depth = 0
    for (let i = arrStart; i < text.length; i++) {
      if (text[i] === '[') depth++
      if (text[i] === ']') depth--
      if (depth === 0) {
        const candidate = text.slice(arrStart, i + 1)
        try { JSON.parse(candidate); return candidate } catch {}
        break
      }
    }
  }

  return text
}

// POST /api/mail/list-folders
router.post('/list-folders', async (req, res) => {
  const { host, port, username, password } = req.body
  if (!host || !port || !username || !password) {
    return res.status(400).json({ error: 'IMAP-Zugangsdaten unvollständig' })
  }
  try {
    const folders = await listFolders({ host, port: Number(port), username, password })
    res.json({ folders })
  } catch (err: any) {
    const msg = (err.message || '').toLowerCase()
    const resp = (err.responseText || '').toLowerCase()
    const all = msg + ' ' + resp
    console.error('[mail] list-folders error:', err.message, '| responseText:', err.responseText)
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || msg.includes('econnrefused')) {
      return res.status(503).json({ error: 'Proton Bridge nicht erreichbar' })
    }
    if (all.includes('no such user') || all.includes('command failed') || all.includes('authentication') || all.includes('login')) {
      return res.status(401).json({ error: `Falsche Bridge-Zugangsdaten — ${err.responseText || err.message}` })
    }
    res.status(500).json({ error: err.message })
  }
})

// POST /api/mail/import-preview
router.post('/import-preview', async (req, res) => {
  const { host, port, username, password, folder, provider, apiKey, model } = req.body

  if (!host || !port || !username || !password || !folder) {
    return res.status(400).json({ error: 'IMAP-Zugangsdaten unvollständig' })
  }
  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'AI-Provider und API-Key erforderlich' })
  }

  // 1. Fetch emails via IMAP
  let rawEmails
  try {
    rawEmails = await fetchJobEmails({ host, port: Number(port), username, password, folder })
  } catch (err: any) {
    const msg = (err.message || '').toLowerCase()
    const resp = (err.responseText || '').toLowerCase()
    const all = msg + ' ' + resp
    console.error('[mail] IMAP error — message:', err.message, '| responseText:', err.responseText, '| code:', err.code)

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('timeout')) {
      return res.status(503).json({ error: 'Proton Bridge nicht erreichbar. Ist Bridge gestartet und eingeloggt?' })
    }
    if (all.includes('no such user') || all.includes('user unknown') || all.includes('authentication') || all.includes('invalid credentials') || all.includes('command failed') || all.includes('login')) {
      return res.status(401).json({ error: `Falsche Bridge-Zugangsdaten — ${err.responseText || err.message}` })
    }
    if (all.includes('mailbox') || all.includes('nonexistent') || all.includes('no select')) {
      return res.status(404).json({ error: `Ordner/Label "${folder}" nicht gefunden` })
    }
    return res.status(500).json({ error: `IMAP-Fehler: ${err.message}${err.responseText ? ' — ' + err.responseText : ''}` })
  }

  if (rawEmails.length === 0) {
    return res.json({ emails: [] })
  }

  // 2. Send emails to AI in batches of 20 to stay within token limits
  const BATCH_SIZE = 20
  const systemPrompt = 'You are a JSON-only API. Output must be a raw JSON array — no wrapper object, no markdown, no explanation.'

  function buildPrompt(batch: typeof rawEmails) {
    return `Extract job application data from these ${batch.length} email envelopes.

Output a JSON array of exactly ${batch.length} objects, one per email, in the same order:
[{ "company": string|null, "jobTitle": string|null, "date": "YYYY-MM-DD"|null, "senderEmail": string|null }, ...]

Rules:
- Start your response with [ and end with ]
- Use null for any field you cannot determine
- "company": the hiring company name (not a recruiter/staffing agency)
- "jobTitle": the position being applied for
- "date": use the provided date field as-is

Emails:
${JSON.stringify(batch.map((e) => ({ subject: e.subject, senderName: e.senderName, senderEmail: e.senderEmail, date: e.date })), null, 2)}`
  }

  async function extractBatch(batch: typeof rawEmails): Promise<(Omit<ParsedEmail, 'raw'>)[]> {
    const aiRaw = await callAi({ provider, apiKey, model, systemPrompt, userPrompt: buildPrompt(batch) })
    console.log('[mail] AI batch response (first 200):', aiRaw.slice(0, 200))
    const jsonStr = extractJson(aiRaw)
    const aiResult = JSON.parse(jsonStr)
    if (!Array.isArray(aiResult)) throw new Error(`AI returned ${typeof aiResult}, expected array`)
    return aiResult
  }

  const parsed: ParsedEmail[] = []
  let aiError: string | null = null

  for (let i = 0; i < rawEmails.length; i += BATCH_SIZE) {
    const batch = rawEmails.slice(i, i + BATCH_SIZE)
    let aiResult: any[] = []
    try {
      aiResult = await extractBatch(batch)
    } catch (err: any) {
      console.error(`[mail] AI batch ${i / BATCH_SIZE + 1} failed:`, err.message)
      if (!aiError) aiError = err.message
    }
    for (let j = 0; j < batch.length; j++) {
      const email = batch[j]
      const r = aiResult[j] || {}
      parsed.push({
        company: r.company || null,
        jobTitle: r.jobTitle || null,
        date: r.date || email.date,
        senderEmail: r.senderEmail || email.senderEmail || null,
        raw: email.subject,
      })
    }
  }

  res.json({ emails: parsed, aiError })
})

export default router
