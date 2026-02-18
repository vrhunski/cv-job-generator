export const SUGGESTIONS_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You are a CV optimization expert who tailors CVs for specific job applications.`

export function buildSuggestionsPrompt(
  profileJson: string,
  jobAnalysis: string,
  jobDescription: string
): string {
  return `Generate CV tailoring suggestions. Respond with ONLY a valid JSON array, no markdown, no code fences, no explanation.

JSON schema for each item:
{"type": string, "section": string, "experienceId": string|null, "original": string|null, "proposed": string, "reason": string, "matchedKeyword": string|null, "impact": "high"|"medium"|"low"}

Suggestion types (by priority):
P0: align_job_title, rewrite_summary_hook, front_load_keywords, highlight_brand, quantify_achievement, match_seniority, ats_keyword_inject
P1: rephrase_bullet, add_bullet, remove_bullet, reorder_experience, add_skill, highlight_skill, remove_skill, adjust_job_title, enhance_tech_stack, add_keyword, rewrite_summary

Rules:
- NEVER fabricate — only rephrase, reorder, or emphasize existing info
- Mirror the job posting's exact language
- Generate 8-15 suggestions, prioritized by impact
- Your entire response must be parseable by JSON.parse()

CANDIDATE PROFILE:
${profileJson}

JOB ANALYSIS:
${jobAnalysis}

ORIGINAL JOB DESCRIPTION:
${jobDescription}`
}
