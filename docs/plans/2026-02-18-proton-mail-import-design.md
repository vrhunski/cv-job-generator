# Proton Mail Import — Design

**Date:** 2026-02-18
**Purpose:** One-time import of historical job application confirmation emails from Proton Mail into the Bewerbungen table, via Proton Bridge IMAP + AI extraction.

---

## How It Works

Proton Bridge decrypts Proton Mail locally and exposes a standard IMAP server on `localhost:1143`. The Express server connects to Bridge with IMAP credentials (provided by Bridge), fetches emails from the `applied` label/folder, and sends them to AI for field extraction.

```
Proton Mail (cloud, E2EE)
        ↓
Proton Bridge (Mac app, localhost:1143)
        ↓  standard IMAP
Express server — imapflow library
        ↓
Fetch emails from "applied" IMAP folder
        ↓
AI extracts: company, jobTitle, date, senderEmail
        ↓
Client shows preview → user confirms → Bewerbungen populated
```

---

## Data Model Changes

Add `senderEmail` to `JobApplication` in `shared/types.ts`:

```ts
export interface JobApplication {
  // ... existing fields ...
  senderEmail?: string   // NEW: sender email from the confirmation email
}
```

Add Bridge credentials to settings (stored in `localStorage['cv-ai-settings']` or a new key):

```ts
export interface BridgeSettings {
  host: string       // default: localhost
  port: number       // default: 1143
  username: string   // from Bridge app
  password: string   // from Bridge app
  folder: string     // default: applied
}
```

---

## UI Flow

### Import button
In `ApplicationsView.vue` action bar: **"Import aus Proton Mail"** button opens an import panel.

### Step 1 — Bridge credentials (one-time, saved)
```
IMAP Host:    localhost
IMAP Port:    1143
Username:     [from Bridge]
Password:     [from Bridge]
Folder:       applied
              [Verbinden & Vorschau laden]
```

### Step 2 — Preview table
```
☑  18.02.2026  careers@siemens.com   Siemens AG   Backend Developer
☑  15.02.2026  jobs@sap.com          SAP SE        Senior Java Dev
☐  10.02.2026  noreply@x.com         [unbekannt]   [unbekannt]      ← unchecked
               [Importieren (2)]
```

- Entries where AI returned `null` for company/jobTitle are shown in red and unchecked by default
- User can uncheck any entry
- Duplicate detection: skip entries where `date + company` already exists in Bewerbungen
- After import: panel closes, Bewerbungen table refreshes

---

## Server API

### `POST /api/mail/import-preview`

**Request:**
```json
{
  "host": "localhost",
  "port": 1143,
  "username": "...",
  "password": "...",
  "folder": "applied"
}
```

**Process:**
1. Connect to IMAP via `imapflow`
2. Open the `applied` mailbox
3. Fetch all messages: `envelope` (subject, from, date) + first 500 chars of text body
4. Send all emails in one AI call for batch extraction
5. Return parsed results

**Response:**
```json
{
  "emails": [
    {
      "company": "Siemens AG",
      "jobTitle": "Backend Developer",
      "date": "2026-02-18",
      "senderEmail": "careers@siemens.com",
      "raw": "Ihre Bewerbung als Backend Developer bei Siemens AG"
    },
    {
      "company": null,
      "jobTitle": null,
      "date": "2026-02-10",
      "senderEmail": "noreply@unknownco.com",
      "raw": "Danke für Ihre Nachricht"
    }
  ]
}
```

---

## AI Extraction

Single batch call using the existing AI service. System prompt: `"You are a JSON-only API."` User prompt:

```
Extract job application data from these confirmation emails.
For each email return: { company, jobTitle, date, senderEmail }.
Use null for any field you cannot determine. Return a JSON array only.

Emails:
[{ subject, senderName, senderEmail, date, bodySnippet }, ...]
```

`extractJson()` handles markdown fence stripping (existing pattern).

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `shared/types.ts` | Add `senderEmail?: string` to `JobApplication`; add `BridgeSettings` interface |
| `server/src/routes/mail.ts` | New route: `POST /api/mail/import-preview` |
| `server/src/services/mailImport.ts` | IMAP connection + email fetch via `imapflow` |
| `server/src/services/aiService.ts` | Add `extractApplicationsFromEmails()` method |
| `server/src/app.ts` | Mount `/api/mail` router |
| `client/src/views/ApplicationsView.vue` | Add import button + two-step import panel |
| `client/src/components/common/SettingsPanel.vue` | Add Bridge credentials fields |

## Dependencies to Install

```bash
npm install imapflow --workspace=server
```

---

## Notes

- Bridge must be running on the Mac for import to work (graceful error if not)
- Bridge credentials are distinct from Proton login credentials
- `imapflow` is the modern successor to `node-imap`, maintained by Nodemailer team
- Emails fetched read-only — nothing is modified in Proton Mail
- Import is one-time; no background sync, no polling
