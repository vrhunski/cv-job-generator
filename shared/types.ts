export interface CVProfile {
  id: string
  fullName: string
  nationality?: string
  dateOfBirth?: string
  gender?: string
  phone: string
  email: string
  address?: string
  linkedin?: string
  github?: string
  website?: string
  photo?: string

  aboutMe: string

  experience: WorkExperience[]
  education: Education[]
  skills: SkillCategory[]
  languages: LanguageSkill[]

  rawText: string
  uploadedFileName: string
  createdAt: string
  updatedAt: string
}

export interface WorkExperience {
  id: string
  company: string
  city: string
  country: string
  website?: string
  businessSector?: string
  jobTitle: string
  startDate: string
  endDate?: string
  bullets: string[]
  techStack: string
}

export interface Education {
  id: string
  degree: string
  institution: string
  city: string
  country: string
  website?: string
  graduationDate: string
  field?: string
}

export interface SkillCategory {
  id: string
  category: string
  skills: string[]
}

export interface LanguageSkill {
  language: string
  isMotherTongue: boolean
  listening?: string
  reading?: string
  writing?: string
  spokenProduction?: string
  spokenInteraction?: string
}

export interface TailoredSession {
  id: string
  profileId: string
  jobDescription: string
  jobTitle: string
  company: string
  seniorityLevel: string
  suggestions: Suggestion[]
  tailoredProfile: CVProfile
  createdAt: string
}

export interface Suggestion {
  id: string
  type: SuggestionType
  section: string
  experienceId?: string
  original?: string
  proposed: string
  reason: string
  matchedKeyword?: string
  impact: 'high' | 'medium' | 'low'
  status: 'pending' | 'approved' | 'rejected'
}

export interface JobApplication {
  id: string
  sessionId?: string
  company: string
  jobTitle: string
  appliedDate: string
  status: ApplicationStatus
  notes?: string
  senderEmail?: string
  createdAt: string
  updatedAt: string
}

export type ApplicationStatus =
  | 'gesendet'
  | 'in_bearbeitung'
  | 'abgelehnt'
  | 'eingestellt'

export type SuggestionType =
  | 'align_job_title'
  | 'rewrite_summary_hook'
  | 'front_load_keywords'
  | 'highlight_brand'
  | 'quantify_achievement'
  | 'match_seniority'
  | 'ats_keyword_inject'
  | 'rephrase_bullet'
  | 'add_bullet'
  | 'remove_bullet'
  | 'reorder_experience'
  | 'add_skill'
  | 'highlight_skill'
  | 'remove_skill'
  | 'adjust_job_title'
  | 'enhance_tech_stack'
  | 'add_keyword'
  | 'rewrite_summary'
