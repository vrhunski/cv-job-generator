<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApplications } from '@/composables/useApplications'
import { useProfile } from '@/composables/useProfile'
import { useAiProvider } from '@/composables/useAiProvider'
import { useBridgeSettings } from '@/composables/useBridgeSettings'
import type { ApplicationStatus, JobApplication } from '../../../shared/types'

const { applications, addApplication, updateStatus, updateApplication, deleteApplication } = useApplications()
const { profile } = useProfile()
const { settings: aiSettings } = useAiProvider()
const { settings: bridge, updateSettings: updateBridge } = useBridgeSettings()

// ── Add form ────────────────────────────────────────────────────────────────
const showAddForm = ref(false)
const form = ref({ company: '', jobTitle: '', appliedDate: todayStr(), status: 'gesendet' as ApplicationStatus, notes: '' })

function todayStr(): string {
  return new Date().toISOString().split('T')[0]!
}

async function submitAdd() {
  if (!form.value.company.trim() || !form.value.jobTitle.trim()) return
  await addApplication({ ...form.value })
  form.value = { company: '', jobTitle: '', appliedDate: todayStr(), status: 'gesendet', notes: '' }
  showAddForm.value = false
}

// ── Edit modal ───────────────────────────────────────────────────────────────
const editModalApp = ref<JobApplication | null>(null)
const editModalForm = ref({ company: '', jobTitle: '', appliedDate: '', status: 'gesendet' as ApplicationStatus, notes: '' })
const editSaving = ref(false)

function openEditModal(app: JobApplication) {
  editModalApp.value = app
  editModalForm.value = { company: app.company, jobTitle: app.jobTitle, appliedDate: app.appliedDate, status: app.status, notes: app.notes || '' }
}

function closeEditModal() {
  editModalApp.value = null
}

async function saveEditModal() {
  if (!editModalApp.value) return
  editSaving.value = true
  await updateApplication(editModalApp.value.id, { ...editModalForm.value })
  editSaving.value = false
  closeEditModal()
}

// ── Status cycling ───────────────────────────────────────────────────────────
const STATUS_CYCLE: ApplicationStatus[] = ['gesendet', 'in_bearbeitung', 'abgelehnt', 'eingestellt']

async function cycleStatus(app: JobApplication) {
  const idx = STATUS_CYCLE.indexOf(app.status)
  const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]!
  await updateStatus(app.id, next)
}

// ── Status display ───────────────────────────────────────────────────────────
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  gesendet: 'Sent',
  in_bearbeitung: 'In Progress',
  abgelehnt: 'Rejected',
  eingestellt: 'Hired',
}

const STATUS_CLASS: Record<ApplicationStatus, string> = {
  gesendet: 'status-gesendet',
  in_bearbeitung: 'status-in-bearbeitung',
  abgelehnt: 'status-abgelehnt',
  eingestellt: 'status-eingestellt',
}

// ── Sorting ──────────────────────────────────────────────────────────────────
type SortKey = 'appliedDate' | 'company' | 'status'
const sortKey = ref<SortKey>('appliedDate')
const sortDir = ref<'asc' | 'desc'>('desc')

const STATUS_ORDER: Record<ApplicationStatus, number> = {
  gesendet: 0,
  in_bearbeitung: 1,
  eingestellt: 2,
  abgelehnt: 3,
}

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function sortArrow(key: SortKey): string {
  if (sortKey.value !== key) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

const sorted = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...applications.value].sort((a, b) => {
    if (sortKey.value === 'appliedDate') return dir * a.appliedDate.localeCompare(b.appliedDate)
    if (sortKey.value === 'company') return dir * a.company.localeCompare(b.company, undefined, { sensitivity: 'base' })
    if (sortKey.value === 'status') return dir * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    return 0
  })
})

// ── Date format ──────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ── Proton Mail import ────────────────────────────────────────────────────────
interface PreviewEmail {
  company: string | null
  jobTitle: string | null
  date: string | null
  senderEmail: string | null
  raw: string
  selected: boolean
}

const showImportPanel = ref(false)
const importStep = ref<1 | 2>(1)
const importing = ref(false)
const importError = ref('')
const previewEmails = ref<PreviewEmail[]>([])
const availableFolders = ref<string[]>([])
const loadingFolders = ref(false)
const aiError = ref<string | null>(null)

const selectedCount = computed(() => previewEmails.value.filter((e) => e.selected).length)

function openImport() {
  showImportPanel.value = true
  importStep.value = 1
  importError.value = ''
  previewEmails.value = []
  availableFolders.value = []
}

async function loadFolders() {
  loadingFolders.value = true
  importError.value = ''
  try {
    const res = await fetch('/api/mail/list-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: bridge.host, port: bridge.port, username: bridge.username, password: bridge.password }),
    })
    const data = await res.json()
    if (!res.ok) { importError.value = data.error || 'Failed to load folders'; return }
    availableFolders.value = data.folders
  } catch {
    importError.value = 'Network error'
  } finally {
    loadingFolders.value = false
  }
}

function closeImport() {
  showImportPanel.value = false
}

function getAiConfig() {
  const p = aiSettings.provider
  if (p === 'puter') {
    return { provider: 'gemini', apiKey: aiSettings.geminiKey, model: aiSettings.geminiModel }
  }
  if (p === 'anthropic') return { provider: 'anthropic', apiKey: aiSettings.anthropicKey, model: aiSettings.anthropicModel }
  if (p === 'openai') return { provider: 'openai', apiKey: aiSettings.openaiKey, model: aiSettings.openaiModel }
  return { provider: 'gemini', apiKey: aiSettings.geminiKey, model: aiSettings.geminiModel }
}

async function fetchPreview() {
  importError.value = ''
  importing.value = true
  updateBridge({ ...bridge })
  try {
    const ai = getAiConfig()
    if (!ai.apiKey) {
      importError.value = 'No AI API key configured in Settings.'
      return
    }
    const res = await fetch('/api/mail/import-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: bridge.host,
        port: bridge.port,
        username: bridge.username,
        password: bridge.password,
        folder: bridge.folder,
        provider: ai.provider,
        apiKey: ai.apiKey,
        model: ai.model,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      importError.value = data.error || 'Connection error'
      return
    }
    aiError.value = data.aiError || null
    previewEmails.value = (data.emails as PreviewEmail[]).map((e) => ({
      ...e,
      selected: true,
    }))
    importStep.value = 2
  } catch {
    importError.value = 'Network error — is the server running?'
  } finally {
    importing.value = false
  }
}

async function confirmImport() {
  const toImport = previewEmails.value.filter((e) => e.selected)
  for (const email of toImport) {
    const company = (email.company || '').trim() || 'Unknown'
    const jobTitle = (email.jobTitle || '').trim() || 'Unknown'
    const appliedDate: string = email.date || todayStr()
    const duplicate = applications.value.some(
      (a) => a.appliedDate === appliedDate && a.company.toLowerCase() === company.toLowerCase()
    )
    if (duplicate) continue
    await addApplication({
      company,
      jobTitle,
      appliedDate,
      status: 'gesendet',
      senderEmail: email.senderEmail || undefined,
    })
  }
  closeImport()
}

// ── PDF export ───────────────────────────────────────────────────────────────
const exporting = ref(false)
const exportError = ref('')

async function exportPdf() {
  exporting.value = true
  exportError.value = ''
  try {
    const res = await fetch('/api/pdf/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applications: sorted.value,
        fullName: profile.value?.fullName || '',
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'PDF export failed' }))
      throw new Error(err.error || 'PDF export failed')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Applications_Report.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err: any) {
    exportError.value = err.message || 'PDF export failed'
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="applications-view">
    <div class="page-header">
      <div>
        <h1>Applications</h1>
        <p class="subtitle">Proof of applications for the job center</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="showAddForm = !showAddForm">
          + Add Application
        </button>
        <button class="btn btn-secondary" @click="openImport">
          Import from Proton Mail
        </button>
        <button class="btn btn-primary" :disabled="exporting || applications.length === 0" @click="exportPdf">
          {{ exporting ? 'Exporting…' : 'Export PDF' }}
        </button>
      </div>
    </div>

    <p v-if="exportError" class="error-msg">{{ exportError }}</p>

    <!-- Add form -->
    <div v-if="showAddForm" class="card add-form">
      <h3>New Application</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Company *</label>
          <input v-model="form.company" type="text" placeholder="e.g. Siemens AG" />
        </div>
        <div class="form-group">
          <label>Job Title *</label>
          <input v-model="form.jobTitle" type="text" placeholder="e.g. Backend Developer" />
        </div>
        <div class="form-group">
          <label>Date</label>
          <input v-model="form.appliedDate" type="date" />
        </div>
        <div class="form-group">
          <label>Status</label>
          <select v-model="form.status">
            <option value="gesendet">Sent</option>
            <option value="in_bearbeitung">In Progress</option>
            <option value="abgelehnt">Rejected</option>
            <option value="eingestellt">Hired</option>
          </select>
        </div>
        <div class="form-group form-group-full">
          <label>Notes</label>
          <input v-model="form.notes" type="text" placeholder="Optional" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" @click="submitAdd">Add</button>
        <button class="btn btn-secondary" @click="showAddForm = false">Cancel</button>
      </div>
    </div>

    <!-- Proton Mail import panel -->
    <div v-if="showImportPanel" class="card import-panel">
      <!-- Step 1: credentials -->
      <div v-if="importStep === 1">
        <h3>Import from Proton Mail</h3>
        <p class="import-hint">Proton Bridge must be running. Use the IMAP credentials from the Bridge app.</p>
        <div class="form-grid">
          <div class="form-group">
            <label>IMAP Host</label>
            <input :value="bridge.host" @input="updateBridge({ host: ($event.target as HTMLInputElement).value })" placeholder="localhost" />
          </div>
          <div class="form-group">
            <label>Port</label>
            <input :value="bridge.port" type="number" @input="updateBridge({ port: Number(($event.target as HTMLInputElement).value) })" placeholder="1143" />
          </div>
          <div class="form-group form-group-full">
            <label>Username</label>
            <input :value="bridge.username" @input="updateBridge({ username: ($event.target as HTMLInputElement).value })" placeholder="From Bridge app" autocomplete="username" />
          </div>
          <div class="form-group form-group-full">
            <label>Password</label>
            <input :value="bridge.password" type="password" @input="updateBridge({ password: ($event.target as HTMLInputElement).value })" placeholder="From Bridge app" autocomplete="current-password" />
          </div>
          <div class="form-group form-group-full">
            <label>Folder / Label</label>
            <div class="folder-row">
              <select
                v-if="availableFolders.length > 0"
                :value="bridge.folder"
                class="folder-select"
                @change="updateBridge({ folder: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="f in availableFolders" :key="f" :value="f">{{ f }}</option>
              </select>
              <input
                v-else
                :value="bridge.folder"
                @input="updateBridge({ folder: ($event.target as HTMLInputElement).value })"
                placeholder="applied"
                class="folder-input"
              />
              <button class="btn btn-sm btn-secondary" :disabled="loadingFolders || !bridge.username || !bridge.password" @click="loadFolders">
                {{ loadingFolders ? '…' : 'Load folders' }}
              </button>
            </div>
            <small class="hint" v-if="availableFolders.length === 0">Click "Load folders" to see available IMAP folders</small>
          </div>
        </div>
        <p v-if="importError" class="error-msg">{{ importError }}</p>
        <div class="form-actions">
          <button class="btn btn-primary" :disabled="importing" @click="fetchPreview">
            {{ importing ? 'Connecting…' : 'Connect & Load Preview' }}
          </button>
          <button class="btn btn-secondary" @click="closeImport">Cancel</button>
        </div>
      </div>

      <!-- Step 2: preview -->
      <div v-if="importStep === 2">
        <h3>Preview — {{ previewEmails.length }} email{{ previewEmails.length !== 1 ? 's' : '' }} found</h3>

        <div v-if="aiError" class="ai-error-banner">
          ⚠ AI extraction failed: {{ aiError }}<br>
          <small>Company and job title can be entered manually.</small>
        </div>
        <p v-else class="import-hint">Company and job title can be edited directly in the table.</p>

        <div class="table-wrapper preview-table-wrapper">
          <table class="applications-table preview-table">
            <thead>
              <tr>
                <th style="width:36px"></th>
                <th>Date</th>
                <th>Email Subject</th>
                <th>Sender</th>
                <th>Company</th>
                <th>Job Title</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(email, idx) in previewEmails"
                :key="idx"
                :class="{ 'row-unparsed': !email.company && !email.jobTitle }"
              >
                <td><input type="checkbox" v-model="email.selected" /></td>
                <td class="col-date">{{ email.date ? formatDate(email.date) : '–' }}</td>
                <td class="col-subject" :title="email.raw">{{ email.raw || '–' }}</td>
                <td class="col-sender">{{ email.senderEmail || '–' }}</td>
                <td><input v-model="email.company" class="preview-edit" placeholder="Company" /></td>
                <td><input v-model="email.jobTitle" class="preview-edit" placeholder="Job Title" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="form-actions" style="margin-top: 16px">
          <button class="btn btn-primary" :disabled="selectedCount === 0" @click="confirmImport">
            Import ({{ selectedCount }})
          </button>
          <button class="btn btn-secondary" @click="importStep = 1">Back</button>
          <button class="btn btn-secondary" @click="closeImport">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="applications.length === 0" class="card empty-state">
      <p>No applications added yet.</p>
      <p class="muted">Applications are added automatically when you download a tailored CV, or you can add them manually.</p>
    </div>

    <!-- Table -->
    <div v-else class="table-wrapper card">
      <table class="applications-table">
        <thead>
          <tr>
            <th>No.</th>
            <th class="th-sortable" :class="{ 'th-active': sortKey === 'appliedDate' }" @click="setSort('appliedDate')">
              Date <span class="sort-arrow" :class="{ 'arrow-active': sortKey === 'appliedDate' }">{{ sortArrow('appliedDate') }}</span>
            </th>
            <th class="th-sortable" :class="{ 'th-active': sortKey === 'company' }" @click="setSort('company')">
              Company <span class="sort-arrow" :class="{ 'arrow-active': sortKey === 'company' }">{{ sortArrow('company') }}</span>
            </th>
            <th>Job Title</th>
            <th>Contact</th>
            <th class="th-sortable" :class="{ 'th-active': sortKey === 'status' }" @click="setSort('status')">
              Status <span class="sort-arrow" :class="{ 'arrow-active': sortKey === 'status' }">{{ sortArrow('status') }}</span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(app, idx) in sorted" :key="app.id">
            <tr>
              <td class="col-nr">{{ idx + 1 }}</td>
              <td class="col-date">{{ formatDate(app.appliedDate) }}</td>
              <td class="col-company">
                {{ app.company }}
                <span v-if="app.sessionId" class="cv-badge" title="Created from CV session">CV</span>
              </td>
              <td class="col-title">{{ app.jobTitle }}</td>
              <td class="col-sender-email">
                <a v-if="app.senderEmail" :href="`mailto:${app.senderEmail}`" class="sender-link">{{ app.senderEmail }}</a>
                <span v-else class="muted">–</span>
              </td>
              <td class="col-status">
                <button
                  class="status-badge"
                  :class="STATUS_CLASS[app.status]"
                  :title="'Click to change'"
                  @click="cycleStatus(app)"
                >
                  {{ STATUS_LABELS[app.status] }}
                </button>
              </td>
              <td class="col-actions">
                <button class="btn btn-sm btn-secondary" @click="openEditModal(app)">Edit</button>
                <button class="btn btn-sm btn-danger" @click="deleteApplication(app.id)">Delete</button>
              </td>
            </tr>
            <!-- Notes sub-row -->
            <tr v-if="app.notes" class="notes-row">
              <td></td>
              <td colspan="6" class="notes-cell">{{ app.notes }}</td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="7" class="total-row">Total: {{ applications.length }} application{{ applications.length !== 1 ? 's' : '' }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <!-- Edit modal -->
  <Teleport to="body">
    <div v-if="editModalApp" class="modal-backdrop" @click.self="closeEditModal" @keydown.esc="closeEditModal">
      <div class="modal" @keydown.ctrl.enter="saveEditModal">
        <div class="modal-header">
          <h3>Edit Application</h3>
          <button class="modal-close" @click="closeEditModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Company *</label>
              <input v-model="editModalForm.company" type="text" placeholder="e.g. Siemens AG" />
            </div>
            <div class="form-group">
              <label>Job Title *</label>
              <input v-model="editModalForm.jobTitle" type="text" placeholder="e.g. Backend Developer" />
            </div>
            <div class="form-group">
              <label>Date</label>
              <input v-model="editModalForm.appliedDate" type="date" />
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="editModalForm.status">
                <option value="gesendet">Sent</option>
                <option value="in_bearbeitung">In Progress</option>
                <option value="abgelehnt">Rejected</option>
                <option value="eingestellt">Hired</option>
              </select>
            </div>
            <div class="form-group form-group-full">
              <label>Notes</label>
              <textarea v-model="editModalForm.notes" rows="3" placeholder="Optional"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeEditModal">Cancel</button>
          <button class="btn btn-primary" :disabled="editSaving" @click="saveEditModal">
            {{ editSaving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.applications-view {
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

h1 {
  margin-bottom: 4px;
}

.subtitle {
  color: var(--color-text-muted);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.error-msg {
  color: #dc2626;
  margin-bottom: 12px;
  font-size: 13px;
}

/* Add form */
.add-form {
  margin-bottom: 24px;
}

.add-form h3 {
  margin-bottom: 16px;
  font-size: 15px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group-full {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.form-group input,
.form-group select {
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--color-bg);
  color: var(--color-text);
}

.form-actions {
  display: flex;
  gap: 8px;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 48px;
}

.empty-state p {
  margin-bottom: 8px;
}

.muted {
  color: var(--color-text-muted);
  font-size: 13px;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
  padding: 0;
}

.applications-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.applications-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
}

.applications-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.applications-table tbody tr:last-child td {
  border-bottom: none;
}

.applications-table tbody tr:hover {
  background: var(--color-bg-secondary, rgba(0,0,0,0.02));
}

.col-nr {
  width: 40px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.col-date {
  width: 110px;
  white-space: nowrap;
}

.col-status {
  width: 140px;
}

.col-actions {
  width: 170px;
}

.cv-badge {
  display: inline-block;
  margin-left: 6px;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-accent, #2563eb);
  color: white;
  vertical-align: middle;
}

/* Status badges */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.status-badge:hover {
  opacity: 0.8;
}

.status-gesendet {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-in-bearbeitung {
  background: #fef9c3;
  color: #92400e;
}

.status-abgelehnt {
  background: #fee2e2;
  color: #991b1b;
}

.status-eingestellt {
  background: #dcfce7;
  color: #166534;
}

/* Sortable headers */
.th-sortable {
  cursor: pointer;
  user-select: none;
}

.th-sortable:hover {
  color: var(--color-text);
}

.th-active {
  color: var(--color-text);
}

.sort-arrow {
  font-size: 10px;
  opacity: 0.3;
  margin-left: 3px;
}

.arrow-active {
  opacity: 1;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg, #fff);
  border-radius: 10px;
  width: 480px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px 0;
}

.modal-header h3 {
  font-size: 15px;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--color-text-muted);
  line-height: 1;
  padding: 0 4px;
}

.modal-close:hover {
  color: var(--color-text);
}

.modal-body {
  padding: 16px 20px;
}

.modal-body .form-group input,
.modal-body .form-group select,
.modal-body .form-group textarea {
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--color-bg);
  color: var(--color-text);
  width: 100%;
  box-sizing: border-box;
}

.modal-body .form-group textarea {
  resize: vertical;
  font-family: inherit;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 18px;
}

/* Notes sub-row */
.notes-row td {
  padding-top: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
}

.notes-cell {
  font-size: 12px;
  color: var(--color-text-muted);
  font-style: italic;
}

/* Footer total */
.total-row {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 12px 16px;
  border-top: 2px solid var(--color-border);
}

.col-actions {
  display: table-cell;
}

.col-actions .btn + .btn {
  margin-left: 6px;
}

.folder-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.folder-select,
.folder-input {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--color-bg);
  color: var(--color-text);
}

.hint {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

/* Import panel */
.import-panel {
  margin-bottom: 24px;
}

.import-panel h3 {
  margin-bottom: 8px;
  font-size: 15px;
}

.import-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
  line-height: 1.5;
}

.preview-table-wrapper {
  max-height: 340px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.preview-table {
  font-size: 13px;
}

.col-sender {
  color: var(--color-text-muted);
  font-size: 12px;
}

.col-sender-email {
  font-size: 12px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sender-link {
  color: var(--color-accent);
  text-decoration: none;
}

.sender-link:hover {
  text-decoration: underline;
}

.row-unparsed td {
  background: #fffbeb;
}

.col-subject {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--color-text-muted);
}

.preview-edit {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--color-bg);
  color: var(--color-text);
  min-width: 100px;
}

.preview-edit:focus {
  outline: none;
  border-color: var(--color-accent);
}

.ai-error-banner {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #92400e;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 12px;
  line-height: 1.5;
}
</style>
