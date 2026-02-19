export const GAP_ANALYSIS_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You are a senior recruiter performing a structured gap audit between a candidate CV and a job posting.`

export function buildGapAnalysisPrompt(profileJson: string, jobAnalysis: string): string {
  return `Audit the candidate profile against the job analysis. Respond with ONLY a valid JSON object, no markdown, no code fences, no explanation.

JSON schema:
{"missingKeywords": string[], "weakSections": [{"section": string, "reason": string}], "leadershipGaps": string[], "unquantifiedAchievements": [{"experienceId": string, "bullet": string, "suggestedTemplate": string}], "existingMetrics": [{"experienceId": string, "bullet": string, "metric": string}], "seniorityMismatch": string|null}

Rules:
- missingKeywords: skills, tools, or frameworks listed in requiredSkills or keywords that do not appear anywhere in the CV
- weakSections: sections that exist but poorly reflect the job's priorities — e.g. summary that omits leadership, most recent role that doesn't mention team scope or architectural ownership
- leadershipGaps: specific leadership signals from leadershipSignals that are absent or vague in the CV — e.g. job wants "lead a team of engineers" but CV only says "collaborated with team"
- unquantifiedAchievements: bullets that describe clear impact or responsibility but contain no numbers or percentages — for each, write a suggestedTemplate using [X], [Y], [%] placeholders the candidate should fill in with real numbers. Use the experienceId from the profile for each.
- existingMetrics: find every number, percentage, or quantified outcome already present in the CV bullets — flag each so it can be surfaced more prominently. Use the experienceId from the profile.
- seniorityMismatch: one concise sentence if the CV reads as too junior or passive for the role's toneExpected; null if the tone matches
- Your entire response must be parseable by JSON.parse()

CANDIDATE PROFILE:
${profileJson}

JOB ANALYSIS:
${jobAnalysis}`
}
