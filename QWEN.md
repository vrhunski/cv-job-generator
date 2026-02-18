# CV Job Generator

## Project Overview

**CV Job Generator** is a full-stack TypeScript application that tailors developer CVs to specific job descriptions using AI. The application parses uploaded CVs (PDF/DOCX), analyzes job descriptions, and generates actionable suggestions to align the CV with the target role while preserving factual accuracy.

### Architecture

Monorepo with npm workspaces:
- **client/** — Vue 3 + Vite frontend with Pinia state management
- **server/** — Express.js backend with TypeScript
- **shared/** — Shared TypeScript types and interfaces

### Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | Vue 3, Vite, Pinia, Vue Router, TypeScript |
| Backend | Express, TypeScript, ts-node-dev |
| AI Providers | Anthropic SDK, OpenAI SDK, Google Generative AI, Puter.js |
| PDF | Puppeteer (generation), pdf-parse (parsing), mammoth (DOCX) |

## Building and Running

### Prerequisites
- Node.js: `^20.19.0 || >=22.12.0`
- npm with workspaces support

### Installation
```bash
npm install
```

### Development
```bash
# Start both client (port 5173) and server (port 3001)
npm run dev

# Start individual workspaces
npm run dev:client   # Vite dev server
npm run dev:server   # Express server (auto-kills stale port 3001)
```

### Production Build
```bash
# Builds in order: shared → client → server
npm run build
```

### Type Checking
```bash
npm run type-check --workspace=client
```

### npm Cache Workaround
If encountering cache issues:
```bash
npm install --cache /tmp/npm-cache-bv
```

## Project Structure

```
cv-job-generator/
├── client/
│   ├── src/
│   │   ├── components/     # Vue components (common, cv, preview, tailoring)
│   │   ├── composables/    # Pinia stores: useProfile, useSessions, useAiProvider, useSuggestions
│   │   ├── services/       # AI providers, CV parser, PDF export
│   │   ├── views/          # Page views: Dashboard, Upload, Tailoring, Preview
│   │   ├── router/         # Vue Router configuration
│   │   ├── App.vue         # Root component with AppHeader
│   │   └── main.ts         # App entry point
│   ├── vite.config.ts      # Vite config with /api proxy to :3001
│   └── package.json
├── server/
│   ├── src/
│   │   ├── routes/         # Express routes: parse, pdf, ai
│   │   ├── services/       # Business logic: aiService, parserService, pdfGenerator
│   │   ├── prompts/        # AI prompt templates
│   │   ├── templates/      # HTML CV template for Puppeteer
│   │   └── app.ts          # Express app entry
│   └── package.json
├── shared/
│   └── types.ts            # Shared TypeScript interfaces
└── package.json            # Root workspace configuration
```

## Key Workflows

### 1. CV Upload & Parsing
1. User uploads CV (PDF/DOCX) → `POST /api/parse`
2. Server extracts text using `pdf-parse` or `mammoth`
3. AI parses text into structured `CVProfile` JSON
4. Profile stored in localStorage (`cv-profile`)

### 2. AI Provider Routing
```
client/services/ai/aiService.ts
├── provider === 'puter' → puterProvider.ts (browser-side, no API key)
└── provider !== 'puter' → directProvider.ts → POST /api/ai/* → server/services/aiService.ts
                                                        ├── Anthropic SDK
                                                        ├── OpenAI SDK
                                                        └── Google Generative AI SDK
```
Settings stored in `localStorage['cv-ai-settings']`. Default: Gemini (free tier).

### 3. Job Tailoring
1. User pastes job description
2. AI generates `Suggestion[]` ranked by recruiter impact
3. User approves/rejects suggestions
4. Tailored `CVProfile` derived (original never mutated)
5. Session saved to localStorage (`cv-sessions`)

### 4. PDF Generation
1. Tailored profile → `POST /api/pdf`
2. Server renders HTML template via Puppeteer
3. PDF returned for download

## Shared Types (`shared/types.ts`)

Core interfaces used across client and server:
- `CVProfile` — Complete CV structure
- `WorkExperience`, `Education`, `SkillCategory`, `LanguageSkill` — CV sections
- `TailoredSession` — Saved tailoring session
- `Suggestion` — AI-generated change proposal
- `SuggestionType` — 18 suggestion types (e.g., `rewrite_summary_hook`, `quantify_achievement`)

## Client State Management

All state persisted in localStorage via Pinia composables:
| Composable | Storage Key | Data |
|------------|-------------|------|
| `useProfile` | `cv-profile` | CVProfile JSON |
| `useSessions` | `cv-sessions` | TailoredSession[] |
| `useAiProvider` | `cv-ai-settings` | Provider config, API keys, models |
| `useSuggestions` | In-memory | Filter, approve/reject operations |

## Development Conventions

### Code Style
- TypeScript strict mode enabled
- Vue 3 Composition API with `<script setup lang="ts">`
- Path alias `@` resolves to `client/src/`

### AI Response Handling
- AI models return JSON wrapped in markdown or prose
- `extractJson()` utility (client & server) handles:
  1. Code fence extraction
  2. Finding `{...}` object
  3. Finding `[...]` array
- All prompts use "JSON-only API" system prompt

### Key Conventions
- Vite proxies `/api/*` to `localhost:3001` — no CORS in dev
- AI prompts duplicated in client (`services/ai/prompts.ts`) and server (`prompts/*.ts`) — keep in sync
- `normalizeSkills()` and `normalizeArray()` in `UploadView.vue` handle varying AI response shapes
- Server auto-kills port 3001 before starting (`lsof -ti:3001 | xargs kill -9`)
- **"Never fabricate" rule**: AI suggestions can only rephrase/reorder/emphasize existing data

### Server Handlers
- `SIGTERM`/`SIGINT` handlers for graceful shutdown
- Health check: `GET /api/health`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/parse` | Parse uploaded CV |
| POST | `/api/ai/*` | AI operations (provider-specific) |
| POST | `/api/pdf` | Generate PDF from profile |
