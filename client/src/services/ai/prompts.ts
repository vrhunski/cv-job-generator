export const PARSE_CV_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You extract structured data from CV text.`

export function buildParseCVPrompt(rawText: string): string {
  return `Extract structured data from this CV text. Respond with ONLY a valid JSON object, no markdown, no code fences, no explanation.

JSON schema:
{"fullName": string, "nationality": string|null, "dateOfBirth": string|null, "gender": string|null, "phone": string, "email": string, "address": string|null, "linkedin": string|null, "github": string|null, "website": string|null, "aboutMe": string, "experience": [{"company": string, "city": string, "country": string, "website": string|null, "businessSector": string|null, "jobTitle": string, "startDate": string, "endDate": string|null, "bullets": string[], "techStack": string}], "education": [{"degree": string, "institution": string, "city": string, "country": string, "website": string|null, "graduationDate": string, "field": string|null}], "skills": [{"category": string, "skills": string[]}], "languages": [{"language": string, "isMotherTongue": boolean, "listening": string|null, "reading": string|null, "writing": string|null, "spokenProduction": string|null, "spokenInteraction": string|null}], "projects": [{"name": string, "description": string, "techStack": string, "link": string|null}]}

Rules:
- Group skills into categories like "Cloud", "Backend", "Frontend", "DevOps", "Databases"
- Dates in human-readable format (e.g. "Jan 2020")
- projects: extract only if the CV explicitly lists personal projects, side projects, or open-source contributions; otherwise return []
- Your entire response must be parseable by JSON.parse()

CV TEXT:
${rawText}`
}

export const ANALYZE_JOB_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You extract structured information from job postings.`

export function buildAnalyzeJobPrompt(jobDescription: string): string {
  return `Extract structured information from this job description. Respond with ONLY a valid JSON object, no markdown, no code fences, no explanation.

JSON schema:
{"jobTitle": string, "company": string, "seniorityLevel": "Junior"|"Mid"|"Senior"|"Lead", "roleFocus": string, "industry": string, "requiredSkills": string[], "niceToHaveSkills": string[], "keyResponsibilities": string[], "keywords": string[], "leadershipSignals": string[], "teamSizeHint": string|null, "toneExpected": "senior-ic"|"lead"|"executive"}

Rules:
- Use exact skill names as they appear in the job posting
- Keywords should include all technical terms, tools, and frameworks
- Infer seniority from context if not explicit
- leadershipSignals: extract verbatim phrases about managing people, mentoring, or leading teams (e.g. "manage a team of engineers", "mentor junior developers")
- teamSizeHint: extract any mention of team size (e.g. "team of 5", "small squad of 3-5"); null if not mentioned
- toneExpected: "lead" if the role involves managing people or leading a team, "executive" if VP/Director/CTO level, "senior-ic" otherwise
- Your entire response must be parseable by JSON.parse()

JOB DESCRIPTION:
${jobDescription}`
}

export const GAP_ANALYSIS_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You are a senior recruiter performing a structured gap audit between a candidate CV and a job posting.`

export function buildGapAnalysisPrompt(profileJson: string, jobAnalysis: string): string {
  return `Audit the candidate profile against the job analysis. Respond with ONLY a valid JSON object, no markdown, no code fences, no explanation.

JSON schema:
{"missingKeywords": string[], "weakSections": [{"section": string, "reason": string}], "leadershipGaps": string[], "unquantifiedAchievements": [{"experienceId": string, "bullet": string, "suggestedTemplate": string}], "existingMetrics": [{"experienceId": string, "bullet": string, "metric": string}], "seniorityMismatch": string|null}

Rules:
- missingKeywords: skills, tools, or frameworks listed in requiredSkills or keywords that do not appear anywhere in the CV
- weakSections: sections that exist but poorly reflect the job's priorities — e.g. summary that omits leadership, most recent role that doesn't mention team scope or architectural ownership
- leadershipGaps: specific leadership signals from leadershipSignals that are absent or vague in the CV — e.g. job wants "lead a team of engineers" but CV only says "collaborated with team"
- unquantifiedAchievements: bullets that describe clear impact or responsibility but contain no numbers or percentages — for each, write a suggestedTemplate using [X], [Y], [%] placeholders the candidate fills in with real numbers. Use the experienceId from the profile for each.
- existingMetrics: find every number, percentage, or quantified outcome already present in the CV bullets — flag each so it can be surfaced more prominently. Use the experienceId from the profile.
- seniorityMismatch: one concise sentence if the CV reads as too junior or passive for the role's toneExpected; null if the tone matches
- Your entire response must be parseable by JSON.parse()

CANDIDATE PROFILE:
${profileJson}

JOB ANALYSIS:
${jobAnalysis}`
}

export const SUGGESTIONS_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You are a CV optimization expert who tailors CVs for specific job applications.`

export function buildSuggestionsPrompt(profileJson: string, jobAnalysis: string, jobDescription: string, gapReport: string): string {
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
