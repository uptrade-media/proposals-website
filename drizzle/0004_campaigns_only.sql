-- Campaign Tables Migration
-- Creates tables needed for email campaign system

CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"mailbox_id" uuid,
	"status" text DEFAULT 'draft',
	"scheduled_start" timestamp,
	"window_start_local" integer DEFAULT 9,
	"window_end_local" integer DEFAULT 17,
	"daily_cap" integer DEFAULT 100,
	"warmup_percent" integer DEFAULT 0,
	"goal_url" text,
	"daypart_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "campaign_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"step_index" integer DEFAULT 0 NOT NULL,
	"delay_days" integer DEFAULT 0,
	"subject_override" text,
	"html_override" text,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"step_index" integer DEFAULT 0,
	"status" text DEFAULT 'queued',
	"unsubscribe_token" text NOT NULL,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced_at" timestamp,
	"unsubscribed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "recipients_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);

CREATE TABLE IF NOT EXISTS "client_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"description" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign keys
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaign_id_campaigns_id_fk" 
FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "client_activity" ADD CONSTRAINT "client_activity_contact_id_contacts_id_fk" 
FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "recipients" ADD CONSTRAINT "recipients_campaign_id_campaigns_id_fk" 
FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "recipients" ADD CONSTRAINT "recipients_contact_id_contacts_id_fk" 
FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
