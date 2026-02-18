export const PARSE_CV_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You extract structured data from CV text.`

export function buildParseCVPrompt(rawText: string): string {
  return `Extract structured data from this CV text. Respond with ONLY a valid JSON object, no markdown, no code fences, no explanation.

JSON schema:
{"fullName": string, "nationality": string|null, "dateOfBirth": string|null, "gender": string|null, "phone": string, "email": string, "address": string|null, "linkedin": string|null, "github": string|null, "website": string|null, "aboutMe": string, "experience": [{"company": string, "city": string, "country": string, "website": string|null, "businessSector": string|null, "jobTitle": string, "startDate": string, "endDate": string|null, "bullets": string[], "techStack": string}], "education": [{"degree": string, "institution": string, "city": string, "country": string, "website": string|null, "graduationDate": string, "field": string|null}], "skills": [{"category": string, "skills": string[]}], "languages": [{"language": string, "isMotherTongue": boolean, "listening": string|null, "reading": string|null, "writing": string|null, "spokenProduction": string|null, "spokenInteraction": string|null}]}

Rules:
- Group skills into categories like "Cloud", "Backend", "Frontend", "DevOps", "Databases"
- Dates in human-readable format (e.g. "Jan 2020")
- Your entire response must be parseable by JSON.parse()

CV TEXT:
${rawText}`
}

export const ANALYZE_JOB_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You extract structured information from job postings.`

export function buildAnalyzeJobPrompt(jobDescription: string): string {
  return `Extract structured information from this job description. Respond with ONLY a valid JSON object, no markdown, no code fences, no explanation.

JSON schema:
{"jobTitle": string, "company": string, "seniorityLevel": "Junior"|"Mid"|"Senior"|"Lead", "roleFocus": string, "industry": string, "requiredSkills": string[], "niceToHaveSkills": string[], "keyResponsibilities": string[], "keywords": string[]}

Rules:
- Use exact skill names as they appear in the job posting
- Keywords should include all technical terms, tools, and frameworks
- Infer seniority from context if not explicit
- Your entire response must be parseable by JSON.parse()

JOB DESCRIPTION:
${jobDescription}`
}

export const SUGGESTIONS_SYSTEM = `You are a JSON-only API. You never output markdown, explanations, or any text outside of JSON. You are a CV optimization expert who tailors CVs for specific job applications.`

export function buildSuggestionsPrompt(profileJson: string, jobAnalysis: string, jobDescription: string): string {
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
