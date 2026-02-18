# Job Applications Tracker — Design

**Date:** 2026-02-18
**Purpose:** Track job applications and export a Bewerbungsnachweis PDF for Arbeit Zentrum appointments.

---

## Goals

- Log every job application (auto-created on CV download + manual entry)
- Track application status through a simple 4-stage workflow
- Export a clean PDF report (Bewerbungsnachweis) for the Jobcenter

---

## Data Model

Add to `shared/types.ts`:

```ts
export interface JobApplication {
  id: string
  sessionId?: string        // links to TailoredSession if auto-created from CV download
  company: string
  jobTitle: string
  appliedDate: string       // ISO date string
  status: ApplicationStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export type ApplicationStatus =
  | 'gesendet'
  | 'in_bearbeitung'
  | 'abgelehnt'
  | 'eingestellt'
```

Storage: `localStorage['cv-applications']` via new `useApplications` composable.

Auto-creation: when user clicks "Download PDF" on a session in DashboardView, a `JobApplication` is created (or updated if `sessionId` already exists).

---

## UI & Navigation

New route: `/applications` ("Bewerbungen") added to AppHeader nav.

### Action Bar
- "Bewerbung hinzufügen" button — opens inline form/modal (company, job title, date, status)
- "PDF exportieren" button — generates Arbeit Zentrum report

### Applications Table

Columns: Datum | Firma | Stelle | Status | Aktionen

- Status badges: 🔵 Gesendet, 🟡 In Bearbeitung, 🔴 Abgelehnt, 🟢 Eingestellt
- Click badge to cycle status inline
- Auto-created rows show a small "CV" icon linking back to the session
- Sorted by date descending

### Dashboard Integration
Existing session cards get a small indicator badge if a `JobApplication` exists for that session.

---

## PDF Export — Bewerbungsnachweis

New server endpoint: `POST /api/pdf/applications`
Reuses existing Puppeteer pipeline with a new HTML template.

### Report Format

```
Bewerbungsnachweis
Name: [CVProfile.fullName]     Zeitraum: [earliest] – [latest]
─────────────────────────────────────────────────────────────
Nr. │ Datum      │ Firma      │ Stelle        │ Status
────┼────────────┼────────────┼───────────────┼─────────────
1   │ 18.02.2026 │ Siemens AG │ Backend Dev   │ Gesendet
2   │ 15.02.2026 │ SAP        │ Senior Dev    │ Abgelehnt
─────────────────────────────────────────────────────────────
Gesamt: 2 Bewerbungen

Erstellt am: [today's date]
```

- Name pulled from `CVProfile` in localStorage (sent in request body)
- Date range computed from the applications being exported
- Optional date range filter on client before export (for monthly appointments)

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `shared/types.ts` | Add `JobApplication`, `ApplicationStatus` |
| `client/src/composables/useApplications.ts` | New composable (localStorage CRUD) |
| `client/src/views/ApplicationsView.vue` | New view (table + action bar) |
| `client/src/router/index.ts` | Add `/applications` route |
| `client/src/components/common/AppHeader.vue` | Add "Bewerbungen" nav link |
| `client/src/views/DashboardView.vue` | Auto-create application on PDF download; show indicator on session cards |
| `server/src/routes/pdf.ts` | Add `POST /api/pdf/applications` endpoint |
| `server/src/templates/bewerbungsnachweis.html` | New Puppeteer template |
