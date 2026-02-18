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
