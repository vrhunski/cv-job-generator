# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CV Job Generator — a full-stack TypeScript app that tailors developer CVs to job descriptions using AI. Monorepo with npm workspaces: `client/` (Vue 3 + Vite), `server/` (Express), `shared/` (types).

## Commands

```bash
# Development (starts both client:5173 and server:3001)
npm run dev

# Individual workspaces
npm run dev:client    # Vite dev server on :5173
npm run dev:server    # Express on :3001 (auto-kills stale port process)

# Type checking (client only — server uses transpile-only)
npm run type-check --workspace=client

# Production build (shared → client → server)
npm run build

# npm cache workaround (root ~/.npm has root-owned files)
npm install --cache /tmp/npm-cache-bv
```

## Architecture

### Data Flow
1. User uploads CV (PDF/DOCX) → `POST /api/parse` extracts text (pdf-parse/mammoth)
2. Text → AI parses into `CVProfile` JSON (via Puter.js client-side OR server-side API)
3. User pastes job description → AI generates `Suggestion[]` ranked by recruiter impact
4. User approves/rejects suggestions → tailored `CVProfile` derived (original never mutated)
5. Tailored profile → `POST /api/pdf` renders HTML template via Puppeteer → PDF download

### AI Provider Routing
```
aiService.ts (client)
├── provider === 'puter' → puterProvider.ts (browser-side, puter.ai.chat(), no API key)
└── provider !== 'puter' → directProvider.ts → POST /api/ai/* → server aiService.ts
                                                                  ├── Anthropic SDK
                                                                  ├── OpenAI SDK
                                                                  └── Google Generative AI SDK
```
Settings stored in `localStorage['cv-ai-settings']`. Default provider: Gemini (free tier).

### AI Response Handling
AI models frequently return JSON wrapped in markdown fences or mixed with prose. Both client (`services/ai/extractJson.ts`) and server (`routes/ai.ts`) use `extractJson()` which tries: (1) code fence extraction, (2) find `{...}` object, (3) find `[...]` array. All prompts use "You are a JSON-only API" system prompt with JSON.parse() requirement in user message.

### Shared Types (`shared/types.ts`)
Single source of truth: `CVProfile`, `WorkExperience`, `Education`, `SkillCategory`, `LanguageSkill`, `TailoredSession`, `Suggestion`, `SuggestionType` (18 types). Both client and server import via relative path `../../../shared/types`.

### Client State
All state in localStorage via composables:
- `useProfile` → `cv-profile` (CVProfile JSON)
- `useSessions` → `cv-sessions` (TailoredSession[])
- `useAiProvider` → `cv-ai-settings` (provider, keys, models)
- `useSuggestions` → in-memory only (filter, approve/reject)

### PDF Generation
Server-side Puppeteer with custom Handlebars-like template engine (no dependency). Template at `server/src/templates/cv-professional.html`. Supports `{{var}}`, `{{#if}}`, `{{#each}}`. Browser instance reused across requests.

## Key Conventions

- Vite proxies `/api/*` to `localhost:3001` in dev — no CORS issues client→server
- AI prompts duplicated in client (`services/ai/prompts.ts`) and server (`prompts/*.ts`) — keep in sync
- `normalizeSkills()` and `normalizeArray()` in `UploadView.vue` handle varying AI response shapes (object vs array, camelCase vs snake_case)
- Server dev script auto-kills port 3001 before starting; `app.ts` has SIGTERM/SIGINT handlers
- The "never fabricate" rule: AI suggestions can only rephrase/reorder/emphasize existing profile data
