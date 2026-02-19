CREATE TABLE `cv_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`job_title` text NOT NULL,
	`applied_date` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`sender_email` text,
	`session_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
