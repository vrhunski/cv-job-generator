# CV Tailoring Improvement — Gap Analysis & Senior/Lead Prompts

**Date:** 2026-02-19

## Problem

The original suggestions pipeline had two main weaknesses:

- **Coverage (C):** Important gaps were missed — missing keywords, weak summary, unaddressed leadership signals.
- **Quality (B):** Proposed rewrites were generic and not calibrated for senior/lead roles. No quantified achievements or leadership framing.

## Solution Overview

Insert a dedicated **Gap Analysis** AI step between job analysis and suggestion generation. The gap report acts as a mandatory checklist that the suggestions prompt must address in full. Add senior/lead language rules and AI-driven keyword bolding in the generated PDF.

---

## New Data Flow

```
1. parseCV          →  CVProfile          (unchanged)
2. analyzeJob       →  JobAnalysis         (enhanced: +leadershipSignals, +teamSizeHint, +toneExpected)
3. [NEW] gapAnalysis → GapReport          (new AI call)
4. generateSuggestions → Suggestion[]     (enhanced: uses GapReport as checklist)
```

---

## GapReport Type (`shared/types.ts`)

```ts
interface GapReport {
  missingKeywords: string[]
  weakSections: { section: string; reason: string }[]
  leadershipGaps: string[]
  unquantifiedAchievements: {
    experienceId: string
    bullet: string
    suggestedTemplate: string   // e.g. "Led a team of [X] engineers..."
  }[]
  existingMetrics: {
    experienceId: string
    bullet: string
    metric: string              // number/stat to amplify
  }[]
  seniorityMismatch: string | null
}
```

---

## Enhanced Job Analysis Prompt

New fields added to `JobAnalysis` output:

| Field | Description |
|-------|-------------|
| `leadershipSignals` | Verbatim phrases about managing/mentoring teams |
| `teamSizeHint` | Team size if mentioned (e.g. "team of 5"); null otherwise |
| `toneExpected` | `"lead"` / `"senior-ic"` / `"executive"` inferred from context |

---

## Gap Analysis Prompt (`server/src/prompts/gapAnalysis.ts`)

**System:** Senior recruiter performing a structured CV audit.

**Rules:**
- `missingKeywords`: required skills/tools absent from the CV
- `weakSections`: sections that exist but don't reflect job priorities
- `leadershipGaps`: leadership signals from the job not surfaced in the CV
- `unquantifiedAchievements`: bullets with clear impact but no numbers → generate `suggestedTemplate` with `[X]`, `[Y]`, `[%]` placeholders
- `existingMetrics`: all numbers/percentages already in the CV to amplify
- `seniorityMismatch`: one sentence if CV tone is too passive/junior; null if fine

---

## Enhanced Suggestions Prompt (`server/src/prompts/generateSuggestions.ts`)

### Coverage rules (mandatory)
- Every `missingKeyword` → at least one suggestion incorporating it naturally
- Every `unquantifiedAchievement` → `rephrase_bullet` or `quantify_achievement` with placeholder template intact (`[X]`, `[%]`)
- Every `existingMetric` → suggestion front-loading or amplifying that metric
- Every `leadershipGap` → targeted suggestion surfacing leadership explicitly
- Non-null `seniorityMismatch` → always include a `match_seniority` suggestion

### Senior/lead language rules (when `toneExpected` is `"lead"` or `"executive"`)
- **Use:** "Architected", "Drove", "Owned", "Led", "Defined", "Established", "Spearheaded"
- **Avoid:** "Worked on", "Helped with", "Participated in", "Assisted with", "Was responsible for"
- Frame with scope: "Across a team of [X]...", "Owning end-to-end delivery of..."

### Keyword bolding
- Wrap matched job keywords in `**double asterisks**` within `proposed` text
- Bold only the keyword token, not the whole phrase
- Example: `"Migrated CI/CD to **GitHub Actions**, cutting build time by **40%**"`

---

## PDF Rendering (`server/src/services/pdfGenerator.ts`)

Added `renderMarkdownBold()`:
```ts
function renderMarkdownBold(html: string): string {
  return html.replace(/\*\*(.+?)\*\*/g, '<strong class="ai-kw">$1</strong>')
}
```

Applied to:
- Bullet points (after existing `boldKeywords()` tech-stack bolding)
- `aboutMe` / summary field

CSS class `.ai-kw` added to template with `font-weight: 700`.

---

## Files Changed

| File | Change |
|------|--------|
| `shared/types.ts` | Added `GapReport` interface |
| `server/src/prompts/analyzeJob.ts` | Added `leadershipSignals`, `teamSizeHint`, `toneExpected` |
| `server/src/prompts/gapAnalysis.ts` | **New file** — gap audit prompt |
| `server/src/prompts/generateSuggestions.ts` | Coverage rules, language rules, bolding, GapReport input |
| `client/src/services/ai/prompts.ts` | Mirror of all server prompt changes |
| `server/src/routes/ai.ts` | Gap analysis AI call added (Step 2 of 3) |
| `client/src/services/ai/aiService.ts` | Gap analysis call added for Puter provider path |
| `server/src/services/pdfGenerator.ts` | `renderMarkdownBold()` function + applied to bullets and aboutMe |
| `server/src/templates/cv-professional.html` | `.ai-kw` CSS class |

## Commit

`d492672` — feat: improve CV tailoring with gap analysis step and senior/lead prompts
