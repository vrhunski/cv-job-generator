# CV Job Generator

A full-stack TypeScript application that tailors developer CVs to specific job descriptions using AI. Upload your master CV once, then generate targeted versions for each application — rewriting summaries, bolding keywords, and aligning your experience to what recruiters are looking for.

> **Core rule**: The AI only rephrases, reorders, or emphasizes existing profile data. It never fabricates new experiences, skills, or achievements.

---

## Features

- **CV Parsing** — Upload a PDF or DOCX; AI extracts the structured profile (experience, education, skills, languages, photo)
- **Profile Photo Extraction** — Automatically pulls embedded photos from uploaded CVs (FlateDecode PNG and DCTDecode JPEG)
- **AI-Powered Tailoring** — Paste a job description; the AI generates 8–15 ranked suggestions (keyword injection, bullet rewrites, title alignment, summary hooks)
- **Side-by-Side Preview** — Compare original vs. tailored CV before downloading
- **Suggestion Workflow** — Approve or reject individual suggestions; only approved changes appear in the export
- **Professional PDF Export** — Server-side Puppeteer rendering with tech-chip pills, keyword bolding, CEFR language badges, and a circular profile photo
- **Multi-Provider AI** — Switch between Claude, GPT-4o, Gemini, or browser-native Puter.js (no API key required)
- **Session History** — Past tailoring sessions saved locally for quick re-access and re-download

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Vue Router, TypeScript, Vite |
| Backend | Express, TypeScript, ts-node-dev |
| AI | Anthropic Claude, OpenAI GPT, Google Gemini, Puter.js |
| PDF | Puppeteer (headless Chromium) |
| File Parsing | pdf-parse, mammoth |
| State | localStorage (no database) |

---

## Project Structure

```
cv-job-generator/          # npm workspaces monorepo
├── client/                # Vue 3 + Vite — port 5173
│   └── src/
│       ├── views/         # Dashboard, Upload, Tailor, Preview
│       ├── components/    # CV form, suggestion cards, preview
│       ├── composables/   # useProfile, useSessions, useAiProvider
│       └── services/      # AI providers, PDF export, CV parser
├── server/                # Express — port 3001
│   └── src/
│       ├── routes/        # /api/parse, /api/ai/*, /api/pdf
│       ├── services/      # parserService, pdfGenerator, aiService
│       ├── prompts/       # AI system + user prompts
│       └── templates/     # cv-professional.html (PDF template)
└── shared/
    └── types.ts           # CVProfile, Suggestion, TailoredSession, …
```

---

## Getting Started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm 9+

### Install

```bash
git clone https://github.com/vrhunski/cv-job-generator.git
cd cv-job-generator
npm install
```

> **Note**: If you get permission errors on `~/.npm`, use:
> ```bash
> npm install --cache /tmp/npm-cache-tmp
> ```

### Run

```bash
npm run dev
```

This starts both the Vite dev server (`http://localhost:5173`) and the Express API (`http://localhost:3001`) in parallel. Vite proxies all `/api/*` requests to the server so there are no CORS issues.

### Build for Production

```bash
npm run build          # compiles shared → client → server
npm run start --workspace=server
```

---

## AI Provider Setup

Open the **Settings** panel in the app to configure your AI provider. API keys are stored in `localStorage` only — nothing is sent to or stored on the server beyond the current request.

| Provider | Model | API Key Required |
|----------|-------|-----------------|
| **Puter.js** | GPT-4o (browser-native) | No — free tier |
| **Google Gemini** | gemini-2.0-flash | Yes — [aistudio.google.com](https://aistudio.google.com) |
| **Anthropic Claude** | claude-sonnet-4-5 | Yes — [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI** | gpt-4o | Yes — [platform.openai.com](https://platform.openai.com) |

Default provider is **Gemini** (free tier available).

---

## Workflow

```
1. Upload CV (PDF / DOCX)
        ↓
   Server extracts text + photo
        ↓
   AI parses into structured CVProfile
        ↓
2. Review & edit parsed profile
        ↓
3. Paste job description
        ↓
   AI analyzes role → generates suggestions
        ↓
4. Approve / reject suggestions
        ↓
5. Preview side-by-side comparison
        ↓
6. Download tailored PDF
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/parse` | Upload CV file → returns extracted text + photo |
| `POST` | `/api/ai/parse` | Parse raw CV text into CVProfile JSON |
| `POST` | `/api/ai/suggest` | Generate tailoring suggestions for a job description |
| `POST` | `/api/pdf` | Render CVProfile → PDF binary |
| `POST` | `/api/pdf/html` | Render CVProfile → HTML string (for debugging) |
| `GET` | `/api/health` | Health check |

---

## PDF Template

The generated PDF uses a custom Handlebars-like template engine (no external dependency) supporting `{{variable}}`, `{{#if field}}`, and `{{#each array}}` syntax. Features:

- Dark navy gradient header with inline SVG contact icons
- Circular profile photo (when available)
- Timeline-style experience entries with coloured dot indicators
- Tech stack rendered as visual pill chips
- Keywords from the tech stack automatically **bolded** in achievement bullets
- CEFR-level badges on language entries
- Print-safe colours with `print-color-adjust: exact`

---

## Development Notes

- **Shared types**: Both client and server import from `../../../shared/types` — single source of truth
- **AI prompts**: Duplicated in `client/src/services/ai/prompts.ts` and `server/src/prompts/*.ts` — keep in sync when changing
- **JSON extraction**: AI models often return JSON wrapped in markdown fences; `extractJson()` in both client and server strips these before `JSON.parse()`
- **Port cleanup**: The server dev script kills any stale process on port 3001 before starting

---

## License

MIT
