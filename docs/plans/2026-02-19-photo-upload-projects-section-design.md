# Profile Photo Upload & Projects Section

**Date:** 2026-02-19

## Problem

Two missing features on the Upload & Review CV page:

1. **Profile photo upload** — when the uploaded CV contains no photo, there was no way to add one. The `photo` field and PDF template already supported it, but no upload UI existed.
2. **Projects section** — no way to list personal projects, side projects, or open-source contributions. The section was absent from the data model, form, and PDF.

---

## Feature 1 — Profile Photo Upload

### Approach
Pure client-side, no server endpoint needed. `CVProfile.photo` is already a string field, and the PDF template already renders `{{#if photo}}<img src="{{photo}}">{{/if}}`. Only the UI was missing.

### Implementation

**`ProfileForm.vue`** — photo block now has two states:

| State | UI |
|-------|----|
| `profile.photo` truthy | Existing preview + "Remove" button (unchanged) |
| `profile.photo` falsy | "+ Add profile photo" button |

On click → triggers hidden `<input type="file" accept="image/*">` → `FileReader.readAsDataURL()` → validates ≤ 2MB → sets `profile.photo` to base64 data URL.

No PDF changes needed — base64 data URLs render directly in Puppeteer.

---

## Feature 2 — Projects Section

### Data Model (`shared/types.ts`)

```ts
interface Project {
  id: string
  name: string
  description: string
  techStack: string   // comma-separated, same pattern as WorkExperience
  link?: string       // GitHub or live URL
}
```

`CVProfile` gains:
```ts
projects?: Project[]   // optional — existing profiles remain valid
```

### UI — `ProjectCard.vue`

New component following the `ExperienceCard` pattern:
- Collapsible card (expanded by default)
- Fields: name, description (textarea), techStack (with "comma-separated" hint), link (optional, type="url")
- Emits `remove` event

**`ProfileForm.vue`** additions:
- Projects section between Education and Skills
- `v-for` over `profile.projects` rendering `<ProjectCard>`
- `addProject()` pushes blank entry with `crypto.randomUUID()`

### AI Parse Prompt

Both `server/src/prompts/parseCV.ts` and `client/src/services/ai/prompts.ts` updated:

```
Schema addition: "projects": [{"name": string, "description": string, "techStack": string, "link": string|null}]

Rule: extract only if the CV explicitly lists personal projects, side projects,
or open-source contributions; otherwise return []
```

### PDF Rendering (`pdfGenerator.ts`)

New `renderProject()` function:
- Renders project name + optional link on one row
- Description rendered with `boldKeywords()` + `renderMarkdownBold()` (reuses existing helpers)
- Tech stack rendered as pill chips via `renderTechChips()` (reuses existing helper)

Wired into `renderTemplate()`:
- `'projects.length'` added to `processConditionals()` data map
- `processEach('projects', ...)` added after other section renderers

### PDF Template (`cv-professional.html`)

Projects section inserted between Skills and Languages:
```html
{{#if projects.length}}
<div class="section">
  <h2 class="section-title">Projects</h2>
  {{#each projects}}{{/each}}
</div>
{{/if}}
```

CSS classes added: `.project-entry`, `.project-header-row`, `.project-name`, `.project-link`, `.project-desc`

---

## Files Changed

| File | Change |
|------|--------|
| `shared/types.ts` | `Project` interface + `projects?: Project[]` on `CVProfile` |
| `client/src/components/cv/ProjectCard.vue` | **New** — collapsible project editor card |
| `client/src/components/cv/ProfileForm.vue` | Photo upload UI (v-else branch) + Projects section |
| `server/src/prompts/parseCV.ts` | `projects` field in schema + extraction rule |
| `client/src/services/ai/prompts.ts` | Mirror of parseCV change |
| `server/src/services/pdfGenerator.ts` | `renderProject()` + wired into `renderTemplate()` |
| `server/src/templates/cv-professional.html` | Projects section block + CSS |

## Commit

`50a5dc7` — feat: add profile photo upload and Projects section
