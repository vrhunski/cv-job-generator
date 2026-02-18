import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import type { CVProfile } from '../../../shared/types'

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'cv-professional.html')

function renderTemplate(html: string, profile: CVProfile): string {
  // Simple Handlebars-like template engine
  let output = html

  // Replace simple variables
  const simpleFields = [
    'fullName', 'email', 'phone', 'address', 'linkedin', 'github',
    'website', 'nationality', 'dateOfBirth', 'gender', 'aboutMe', 'photo',
  ] as const

  for (const field of simpleFields) {
    const value = profile[field] || ''
    output = output.replace(new RegExp(`\\{\\{${field}\\}\\}`, 'g'), escapeHtml(String(value)))
  }

  // Derive currentTitle from first experience
  const currentTitle = profile.experience[0]?.jobTitle || ''
  output = output.replace(/\{\{currentTitle\}\}/g, escapeHtml(currentTitle))

  // Handle {{#if field}} ... {{/if}} blocks
  output = processConditionals(output, {
    ...profile,
    currentTitle,
    'skills.length': profile.skills.length > 0,
    'experience.length': profile.experience.length > 0,
    'education.length': profile.education.length > 0,
    'languages.length': profile.languages.length > 0,
  })

  // Handle {{#each experience}} ... {{/each}}
  output = processEach(output, 'experience', profile.experience, renderExperience)
  output = processEach(output, 'education', profile.education, renderEducation)
  output = processEach(output, 'skills', profile.skills, renderSkillCategory)
  output = processEach(output, 'languages', profile.languages, renderLanguage)

  return output
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function processConditionals(html: string, data: Record<string, any>): string {
  // Match {{#if field}} content {{else}} altContent {{/if}} or {{#if field}} content {{/if}}
  const ifRegex = /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g
  return html.replace(ifRegex, (_match, field: string, content: string) => {
    const elseMatch = content.split('{{else}}')
    const truthy = data[field]
    if (truthy) {
      return elseMatch[0]
    }
    return elseMatch[1] || ''
  })
}

function processEach(
  html: string,
  name: string,
  items: any[],
  renderer: (item: any) => string
): string {
  const regex = new RegExp(`\\{\\{#each ${name}\\}\\}([\\s\\S]*?)\\{\\{/each\\}\\}`, 'g')
  return html.replace(regex, () => items.map(renderer).join('\n'))
}

function processNestedEach(html: string): string {
  // Handle nested {{#each this.skills}} ... {{/each}} patterns
  const nestedRegex = /\{\{#each\s+this\.skills\}\}([\s\S]*?)\{\{\/each\}\}/g
  return html.replace(nestedRegex, (match, content: string) => {
    // Replace {{this}} with the actual skill value - this will be handled per-item
    return content.replace(/\{\{this\}\}/g, '{{skill}}')
  })
}

// ── Keyword helpers ───────────────────────────────────────────────────────

/** Split a tech-stack string into individual keyword tokens, longest first. */
function extractKeywords(techStack: string): string[] {
  if (!techStack) return []
  return techStack
    .split(/,\s*|\s+and\s+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .sort((a, b) => b.length - a.length) // longest first avoids partial matches
}

/**
 * Escape HTML and bold every occurrence of a keyword inside the text.
 * Uses a single combined regex so overlapping keywords are handled correctly.
 */
function boldKeywords(rawText: string, keywords: string[]): string {
  if (!keywords.length) return escapeHtml(rawText)

  const pattern = keywords
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')

  const regex = new RegExp(`\\b(${pattern})\\b`, 'gi')
  const parts: string[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null

  // eslint-disable-next-line no-cond-assign
  while ((m = regex.exec(rawText)) !== null) {
    if (m.index > lastIndex) {
      parts.push(escapeHtml(rawText.slice(lastIndex, m.index)))
    }
    parts.push(`<strong class="kw">${escapeHtml(m[0])}</strong>`)
    lastIndex = regex.lastIndex
  }
  if (lastIndex < rawText.length) {
    parts.push(escapeHtml(rawText.slice(lastIndex)))
  }
  return parts.join('')
}

/** Render the tech stack as visual pill chips instead of italic text. */
function renderTechChips(techStack: string): string {
  if (!techStack) return ''
  const techs = techStack
    .split(/,\s*|\s+and\s+/i)
    .map((t) => t.trim())
    .filter(Boolean)
  if (!techs.length) return ''
  const chips = techs.map((t) => `<span class="tech-chip">${escapeHtml(t)}</span>`).join('')
  return `<div class="tech-chips">${chips}</div>`
}

// ── Section renderers ──────────────────────────────────────────────────────

function renderExperience(exp: any): string {
  const keywords = extractKeywords(exp.techStack)

  // "Current" green badge instead of plain "Present" text
  const endDateHtml = exp.endDate
    ? escapeHtml(exp.endDate)
    : '<span class="current-badge">Current</span>'

  const bulletsHtml = (exp.bullets || []).length > 0
    ? `<ul class="exp-bullets">${(exp.bullets || []).map((b: string) => `<li>${boldKeywords(b, keywords)}</li>`).join('')}</ul>`
    : ''

  const locationHtml = exp.city
    ? `<span class="exp-location">${escapeHtml(exp.city)}${exp.country ? ', ' + escapeHtml(exp.country) : ''}</span>`
    : ''

  return `
    <div class="experience-entry">
      <div class="exp-header">
        <span class="exp-title">${escapeHtml(exp.jobTitle)}</span>
        <span class="exp-dates">${escapeHtml(exp.startDate)} — ${endDateHtml}</span>
      </div>
      <div class="exp-company-row">
        <span class="exp-company">${escapeHtml(exp.company)}</span>
        ${locationHtml}
      </div>
      ${bulletsHtml}
      ${renderTechChips(exp.techStack)}
    </div>
  `
}

function renderEducation(edu: any): string {
  const fieldStr = edu.field ? ` — ${escapeHtml(edu.field)}` : ''
  const locationStr = [edu.city, edu.country].filter(Boolean).map((v: string) => escapeHtml(v)).join(', ')
  return `
    <div class="edu-entry">
      <div class="edu-header">
        <span class="edu-degree">${escapeHtml(edu.degree)}${fieldStr}</span>
        <span class="edu-date">${escapeHtml(edu.graduationDate)}</span>
      </div>
      <div class="edu-institution">${escapeHtml(edu.institution)}</div>
      ${locationStr ? `<div class="edu-details">${locationStr}</div>` : ''}
    </div>
  `
}

function renderSkillCategory(cat: any): string {
  const skillsHtml = (cat.skills || [])
    .map((s: string) => `<span class="skill-tag">${escapeHtml(s)}</span>`)
    .join('')

  return `
    <div class="skill-category">
      <div class="skill-category-name">${escapeHtml(cat.category)}</div>
      <div class="skill-tags">${skillsHtml}</div>
    </div>
  `
}

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function highestCefr(levels: (string | undefined)[]): string {
  return levels
    .filter(Boolean)
    .map((l) => (l as string).toUpperCase())
    .reduce((best, curr) =>
      CEFR_ORDER.indexOf(curr) > CEFR_ORDER.indexOf(best) ? curr : best
    , '')
}

function renderLanguage(lang: any): string {
  if (lang.isMotherTongue) {
    return `
      <div class="language-item">
        <div class="language-name">${escapeHtml(lang.language)}</div>
        <span class="language-badge native">Native</span>
      </div>
    `
  }

  const parts: string[] = []
  if (lang.listening) parts.push(`L: ${escapeHtml(lang.listening)}`)
  if (lang.reading) parts.push(`R: ${escapeHtml(lang.reading)}`)
  if (lang.writing) parts.push(`W: ${escapeHtml(lang.writing)}`)
  if (lang.spokenProduction) parts.push(`SP: ${escapeHtml(lang.spokenProduction)}`)
  if (lang.spokenInteraction) parts.push(`SI: ${escapeHtml(lang.spokenInteraction)}`)

  const primary = highestCefr([lang.listening, lang.reading, lang.writing, lang.spokenProduction, lang.spokenInteraction])

  return `
    <div class="language-item">
      <div>
        <div class="language-name">${escapeHtml(lang.language)}</div>
        ${parts.length > 0 ? `<div class="language-details">${parts.join(' · ')}</div>` : ''}
      </div>
      ${primary ? `<span class="language-badge">${primary}</span>` : ''}
    </div>
  `
}

let browserInstance: puppeteer.Browser | null = null

async function getBrowser(): Promise<puppeteer.Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
  return browserInstance
}

export async function generatePdf(profile: CVProfile): Promise<Buffer> {
  const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf-8')
  const html = renderTemplate(templateHtml, profile)

  const browser = await getBrowser()
  const page = await browser.newPage()

  await page.setContent(html, { waitUntil: 'networkidle0' })

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })

  await page.close()
  return Buffer.from(pdf)
}

export async function generateHtml(profile: CVProfile): Promise<string> {
  const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf-8')
  return renderTemplate(templateHtml, profile)
}
