# CV Job Generator — Design Document

## Overview

A web application that generates tailored CV/resume PDF documents adjusted for each input job description. The app takes a developer's base CV profile and a job description as inputs, then produces an optimized PDF CV that matches keywords, skills, and requirements from the job posting — optimized for both ATS systems and the recruiter's 6-10 second first scan.

**Target user:** IT developers/consultants looking to tailor their CV per job application.

---

## Architecture

### Tech Stack

- **Frontend:** Vue 3 + TypeScript (Vite)
- **Backend:** Node.js + TypeScript + Express
- **AI Providers:**
  - Puter.js (client-side, default) — no API keys needed, supports Claude/GPT/Gemini/500+ models
  - Direct API keys (server-side) — Anthropic (Claude) and OpenAI (GPT) with user-provided keys
- **PDF Generation:** Puppeteer (server-side, HTML/CSS template)
- **Storage:** Browser localStorage / sessionStorage (Firebase planned for later phase)

### High-Level Flow

1. User uploads existing CV (PDF/DOCX) → sent to server for text extraction
2. AI parses the uploaded CV into structured JSON profile → saved in localStorage
3. User reviews and corrects parsed profile
4. User pastes a job description
5. AI analyzes the job description, compares against the profile, generates **guided suggestions**
6. User reviews and approves/rejects each suggestion individually
7. Approved changes produce a tailored CV (derived copy — original never mutated)
8. Puppeteer renders the tailored CV as a professional PDF on the server
9. PDF returned for download

---

## Data Model

### CVProfile (stored in localStorage)

```typescript
interface CVProfile {
  id: string
  // Personal Info
  fullName: string
  nationality?: string
  dateOfBirth?: string
  gender?: string
  phone: string
  email: string
  address?: string
  linkedin?: string
  github?: string
  website?: string
  photo?: string // base64 or blob URL

  // Professional Summary
  aboutMe: string

  // Work Experience
  experience: WorkExperience[]

  // Education
  education: Education[]

  // Technical Skills - categorized
  skills: SkillCategory[]

  // Languages
  languages: LanguageSkill[]

  // Raw text from uploaded file (for AI re-parsing)
  rawText: string
  uploadedFileName: string
  createdAt: string
  updatedAt: string
}

interface WorkExperience {
  id: string
  company: string
  city: string
  country: string
  website?: string
  businessSector?: string
  jobTitle: string
  startDate: string
  endDate?: string // null = "Current"
  bullets: string[]
  techStack: string
}

interface Education {
  id: string
  degree: string
  institution: string
  city: string
  country: string
  website?: string
  graduationDate: string
  field?: string
}

interface SkillCategory {
  id: string
  category: string // e.g. "Cloud", "Backend", "Frontend", "DevOps", "Databases"
  skills: string[]
}

interface LanguageSkill {
  language: string
  isMotherTongue: boolean
  listening?: string // CEFR level: A1-C2
  reading?: string
  writing?: string
  spokenProduction?: string
  spokenInteraction?: string
}
```

### TailoredSession (stored in localStorage)

```typescript
interface TailoredSession {
  id: string
  profileId: string
  jobDescription: string
  jobTitle: string       // AI-extracted
  company: string        // AI-extracted
  seniorityLevel: string // Junior | Mid | Senior | Lead
  suggestions: Suggestion[]
  tailoredProfile: CVProfile // copy with approved changes applied
  createdAt: string
}
```

### Suggestion

```typescript
interface Suggestion {
  id: string
  type: SuggestionType
  section: string
  experienceId?: string
  original?: string
  proposed: string
  reason: string
  matchedKeyword?: string
  impact: 'high' | 'medium' | 'low'
  status: 'pending' | 'approved' | 'rejected'
}

type SuggestionType =
  // Recruiter-first (P0 — first 6 seconds)
  | 'align_job_title'        // match CV title to job posting title
  | 'rewrite_summary_hook'   // first 2 lines must mirror job's core ask
  | 'front_load_keywords'    // put job's top keywords in first 30% of CV
  | 'highlight_brand'        // emphasize big-name clients (BMW, Porsche)
  | 'quantify_achievement'   // add numbers: team size, %, uptime, scale
  | 'match_seniority'        // align language to seniority level sought
  | 'ats_keyword_inject'     // ensure exact keyword phrasing from job post
  // Content optimization (P1)
  | 'rephrase_bullet'        // reword achievement to include job keywords
  | 'add_bullet'             // add a new bullet to an experience entry
  | 'remove_bullet'          // hide irrelevant bullet for this job
  | 'reorder_experience'     // promote most relevant job to top
  | 'add_skill'              // surface a skill you have but didn't list
  | 'highlight_skill'        // move a skill higher in the list
  | 'remove_skill'           // hide irrelevant skill to reduce noise
  | 'adjust_job_title'       // subtle title alignment per role
  | 'enhance_tech_stack'     // reorder/emphasize tech in a job's stack
  | 'add_keyword'            // inject a missing keyword naturally
  | 'rewrite_summary'        // full summary rewrite
```

---

## AI Suggestion Engine

### How it works

1. **Extract** — AI parses the job description into: required skills, nice-to-have skills, role focus (backend/frontend/fullstack/lead), industry, seniority level
2. **Compare** — AI maps extracted requirements against the CV profile, finding gaps and matches
3. **Generate** — AI produces a ranked list of suggestions, prioritized by `impact`

### Golden rules

- **Never fabricate** — suggestions can only rephrase, reorder, or emphasize what's already in the profile. Never invent experience or skills the user doesn't have.
- **Mirror the job posting's language** — if they say "Backend Engineer," don't say "Fullstack Developer." If they say "Kubernetes," don't say "container orchestration."
- **Front-load impact** — the first 30% of the CV (title, summary, top experience) gets the most aggressive tailoring because that's what recruiters scan.
- **Quantify everything** — numbers catch recruiter eyes: team sizes, transaction volumes, uptime percentages, project scale.
- **Brand-name prominence** — recognizable companies/clients (BMW, Porsche, etc.) should be visually prominent and easy to spot.

### Recruiter psychology priorities

| Priority | What recruiter scans | Time | AI focus |
|----------|---------------------|------|----------|
| P0 | Job title match | 0-2s | `align_job_title` |
| P0 | First 2 lines of summary | 2-4s | `rewrite_summary_hook` |
| P0 | Company names / brands | 4-6s | `highlight_brand` |
| P1 | Tech stack keywords | 6-10s | `ats_keyword_inject`, `highlight_skill` |
| P1 | Achievement numbers | 6-10s | `quantify_achievement` |
| P2 | Experience details | 10-30s | `rephrase_bullet`, `reorder_experience` |
| P2 | Education, languages | 30s+ | lower priority suggestions |

### AI provider architecture

```
User toggles provider
        │
        ├── Puter.js (default)
        │     └── Runs in browser
        │     └── No API key needed
        │     └── Calls puter.ai.chat()
        │
        └── Direct API (optional)
              └── User provides API key
              └── Client sends to server /api/ai/suggest
              └── Server calls Anthropic/OpenAI API
              └── Returns suggestions
```

---

## UI Flow & Pages

### Page 1: Dashboard (Home)

- **"Upload CV"** button — first-time flow
- **"Tailor for new job"** button — if profile exists in localStorage
- **Recent sessions list** — cards showing past tailored CVs (job title, company, date, download link)

### Page 2: CV Upload & Profile Review

**Step 1 — Upload:**
- Drag & drop zone for PDF/DOCX
- File sent to backend → AI parses into structured CVProfile
- Loading state: "AI is reading your CV..."

**Step 2 — Profile review:**
- Parsed data displayed in editable form sections:
  - Personal info (pre-filled, editable)
  - About Me (text area)
  - Experience entries (expandable cards with bullets)
  - Skills (tag chips, grouped by category)
  - Education
  - Languages (CEFR dropdowns)
- User corrects any parsing mistakes
- **"Save Profile"** → stores to localStorage

### Page 3: Job Tailoring (core page)

**Two-column layout:**

**Left column — Input:**
- Large textarea: "Paste job description here"
- Auto-extracted fields (editable): Job title, Company name, Seniority level tag
- **"Analyze & Generate Suggestions"** button
- AI provider toggle: Puter.js / Direct API key
  - If Direct: provider dropdown (Claude/OpenAI) + API key input

**Right column — Suggestions panel:**
- Header: "12 suggestions found — 5 high impact"
- Filter tabs: All | High | Medium | Low
- Each suggestion as a card showing: impact level, type, current text, proposed text, reason
- Approve / Reject buttons per card (toggleable)
- Running counter: "7/12 approved"
- **"Preview Tailored CV"** button

### Page 4: Preview & Export

**Side-by-side comparison:**
- Left: Original CV rendered
- Right: Tailored CV with approved changes highlighted in green
- Top bar actions:
  - **"Download PDF"** — Puppeteer server-side render
  - **"Back to suggestions"** — adjust selections
  - **"Save session"** — store to localStorage history

### Settings panel (header accessible)

- AI Provider toggle: Puter.js / Direct API
- API Keys: input fields for Anthropic / OpenAI (stored in localStorage only)
- Preferred AI model dropdown per provider

---

## Project Structure

```
cv-job-generator/
├── client/                          # Vue 3 + TypeScript (Vite)
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/              # AppHeader, FileDropzone, TagChips, LoadingSpinner
│   │   │   ├── cv/                  # ProfileForm, ExperienceCard, SkillsEditor, EducationCard, LanguageEditor
│   │   │   ├── tailoring/           # JobInput, SuggestionCard, SuggestionList, AiProviderToggle
│   │   │   └── preview/             # CvPreview, CvComparison, PdfDownload
│   │   ├── composables/
│   │   │   ├── useProfile.ts        # localStorage CRUD for CVProfile
│   │   │   ├── useSessions.ts       # localStorage CRUD for TailoredSessions
│   │   │   ├── useAiProvider.ts     # Puter.js vs direct API switching
│   │   │   └── useSuggestions.ts    # suggestion state management
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── aiService.ts     # unified AI interface
│   │   │   │   ├── puterProvider.ts # Puter.js implementation
│   │   │   │   └── directProvider.ts# direct API key implementation
│   │   │   ├── cvParser.ts          # calls backend parse endpoint
│   │   │   └── pdfExport.ts         # calls backend PDF endpoint
│   │   ├── types/
│   │   │   ├── cv.ts
│   │   │   ├── suggestion.ts
│   │   │   └── ai.ts
│   │   ├── views/
│   │   │   ├── DashboardView.vue
│   │   │   ├── UploadView.vue
│   │   │   ├── TailoringView.vue
│   │   │   └── PreviewView.vue
│   │   ├── router/
│   │   │   └── index.ts
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                          # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/
│   │   │   ├── parse.ts             # POST /api/parse
│   │   │   ├── pdf.ts               # POST /api/pdf
│   │   │   └── ai.ts               # POST /api/ai/suggest
│   │   ├── services/
│   │   │   ├── parserService.ts     # PDF/DOCX text extraction
│   │   │   ├── pdfGenerator.ts      # Puppeteer HTML → PDF
│   │   │   └── aiService.ts         # Anthropic/OpenAI direct API calls
│   │   ├── templates/
│   │   │   └── cv-professional.html # HTML/CSS template for Puppeteer
│   │   ├── prompts/
│   │   │   ├── parseCV.ts           # prompt for parsing raw CV text
│   │   │   ├── analyzeJob.ts        # prompt for job description analysis
│   │   │   └── generateSuggestions.ts # prompt for suggestion generation
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── app.ts                   # Express app setup
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                          # Shared types between client & server
│   └── types.ts
│
├── docs/
│   └── plans/
│       └── 2026-02-17-cv-job-generator-design.md
│
├── package.json                     # root — npm workspaces
├── .gitignore
└── README.md
```

---

## API Endpoints (Server)

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| POST | `/api/parse` | CV file (PDF/DOCX multipart) | `CVProfile` JSON |
| POST | `/api/ai/suggest` | `{ profile: CVProfile, jobDescription: string, provider: string, apiKey: string }` | `Suggestion[]` |
| POST | `/api/pdf` | `CVProfile` (tailored) | PDF binary buffer |

---

## Key Principles

1. **Original profile is never mutated** — each tailored CV is a derived copy tied to a specific job description
2. **Never fabricate** — AI can only rephrase, reorder, or emphasize existing experience/skills
3. **Recruiter-first optimization** — title match, summary hook, brand names, and keyword density in the first 30% of the CV
4. **ATS compatibility** — clean HTML template, standard headings, exact keyword matching from job posts
5. **User stays in control** — guided suggestions with approve/reject per item, no black-box changes
6. **Provider flexibility** — Puter.js for zero-config start, direct API keys for power users

---

## Future Enhancements (out of scope for MVP)

- Firebase auth + Firestore persistence
- Multiple CV templates (modern, minimal, two-column)
- Bulk tailoring (multiple job descriptions at once)
- Job description URL scraping (paste a link instead of text)
- ATS score preview (estimated keyword match percentage)
- Cover letter generation
- LinkedIn profile import
