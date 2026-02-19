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
