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
