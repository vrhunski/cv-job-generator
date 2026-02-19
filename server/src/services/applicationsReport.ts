import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
import type { JobApplication } from '../../../shared/types'

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'bewerbungsnachweis.html')

const STATUS_LABELS: Record<string, string> = {
  gesendet: 'Sent',
  in_bearbeitung: 'In Progress',
  abgelehnt: 'Rejected',
  eingestellt: 'Hired',
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return escapeHtml(iso)
  return `${d}.${m}.${y}`
}

function renderRow(app: JobApplication, idx: number): string {
  const statusClass = `status-${app.status}`
  const statusLabel = STATUS_LABELS[app.status] || app.status
  return `
    <tr>
      <td class="col-nr">${idx + 1}</td>
      <td class="col-date">${formatDate(app.appliedDate)}</td>
      <td>${escapeHtml(app.company)}</td>
      <td>${escapeHtml(app.jobTitle)}</td>
      <td class="col-status"><span class="status-pill ${statusClass}">${escapeHtml(statusLabel)}</span></td>
    </tr>
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

export async function generateApplicationsPdf(
  applications: JobApplication[],
  fullName: string
): Promise<Buffer> {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8')

  const sorted = [...applications].sort((a, b) => a.appliedDate.localeCompare(b.appliedDate))

  const dateFrom = sorted.length > 0 ? formatDate(sorted[0].appliedDate) : '–'
  const dateTo = sorted.length > 0 ? formatDate(sorted[sorted.length - 1].appliedDate) : '–'

  const rows = sorted.map((app, idx) => renderRow(app, idx)).join('\n')
  const total = applications.length
  const totalSuffix = total !== 1 ? 's' : ''
  const createdAt = formatDate(new Date().toISOString().split('T')[0])

  const html = template
    .replace('{{fullName}}', escapeHtml(fullName))
    .replace('{{dateFrom}}', dateFrom)
    .replace('{{dateTo}}', dateTo)
    .replace('{{rows}}', rows)
    .replace('{{total}}', String(total))
    .replace('{{totalSuffix}}', totalSuffix)
    .replace('{{createdAt}}', createdAt)

  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
  })

  await page.close()
  return Buffer.from(pdf)
}
