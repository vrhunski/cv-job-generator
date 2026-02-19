export const SUGGESTIONS_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You are a CV optimization expert who tailors CVs for specific job applications.`

export function buildSuggestionsPrompt(
  profileJson: string,
  jobAnalysis: string,
  jobDescription: string,
  gapReport: string
): string {
  return `Generate CV tailoring suggestions. Respond with ONLY a valid JSON array, no markdown, no code fences, no explanation.

JSON schema for each item:
{"type": string, "section": string, "experienceId": string|null, "original": string|null, "proposed": string, "reason": string, "matchedKeyword": string|null, "impact": "high"|"medium"|"low"}

Suggestion types (by priority):
P0: align_job_title, rewrite_summary_hook, front_load_keywords, highlight_brand, quantify_achievement, match_seniority, ats_keyword_inject
P1: rephrase_bullet, add_bullet, remove_bullet, reorder_experience, add_skill, highlight_skill, remove_skill, adjust_job_title, enhance_tech_stack, add_keyword, rewrite_summary

Core rules:
- NEVER fabricate — only rephrase, reorder, or emphasize existing info
- Mirror the job posting's exact language
- Generate 10-18 suggestions, prioritized by impact
- Your entire response must be parseable by JSON.parse()

Coverage rules (mandatory — address every gap from the GapReport):
- For each item in missingKeywords: create at least one suggestion that naturally incorporates that keyword into an existing bullet, skill, or the summary
- For each item in unquantifiedAchievements: create a rephrase_bullet or quantify_achievement suggestion using the suggestedTemplate as the proposed text (keep [X], [Y], [%] placeholders intact for the user to fill)
- For each item in existingMetrics: create a suggestion that amplifies or front-loads that metric more prominently in the bullet
- For each item in leadershipGaps: create a targeted suggestion that surfaces the candidate's leadership more explicitly
- If seniorityMismatch is non-null: always include a match_seniority suggestion for the summary

Senior/lead language rules (apply when toneExpected is "lead" or "executive"):
- Use active ownership verbs: "Architected", "Drove", "Owned", "Led", "Defined", "Established", "Spearheaded"
- Avoid passive or junior phrasing: never use "Worked on", "Helped with", "Participated in", "Assisted with", "Was responsible for"
- Frame with scope before action: "Across a team of [X]...", "Owning end-to-end delivery of...", "As technical lead for..."
- Emphasize outcomes and team impact, not just individual tasks

Keyword bolding rule:
- In all proposed text, wrap matched job keywords in **double asterisks** to signal they should be bold in the output document
- Bold only the keyword token, not the entire phrase
- Example: "Migrated CI/CD pipeline to **GitHub Actions**, reducing build time by **40%**"
- Apply bolding to: matched skills, tool names, frameworks, and role-specific terms from the job posting

GAP REPORT (use as mandatory checklist):
${gapReport}

CANDIDATE PROFILE:
${profileJson}

JOB ANALYSIS:
${jobAnalysis}

ORIGINAL JOB DESCRIPTION:
${jobDescription}`
}
