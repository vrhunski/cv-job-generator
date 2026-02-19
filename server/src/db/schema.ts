import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const cvProfiles = sqliteTable('cv_profiles', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),       // full CVProfile as JSON string
  updatedAt: text('updated_at').notNull(),
})

export const jobApplications = sqliteTable('job_applications', {
  id: text('id').primaryKey(),
  company: text('company').notNull(),
  jobTitle: text('job_title').notNull(),
  appliedDate: text('applied_date').notNull(),
  status: text('status').notNull(),
  notes: text('notes'),
  senderEmail: text('sender_email'),
  sessionId: text('session_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
