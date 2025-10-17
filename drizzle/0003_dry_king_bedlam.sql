CREATE TABLE "audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"target_url" text NOT NULL,
	"status" text DEFAULT 'pending',
	"error_message" text,
	"performance_score" integer,
	"accessibility_score" integer,
	"best_practices_score" integer,
	"seo_score" integer,
	"pwa_score" integer,
	"lcp_ms" numeric(8, 2),
	"fid_ms" numeric(8, 2),
	"cls_score" numeric(5, 3),
	"fcp_ms" numeric(8, 2),
	"tti_ms" numeric(8, 2),
	"tbt_ms" numeric(8, 2),
	"speed_index_ms" numeric(8, 2),
	"full_audit_json" text,
	"report_url" text,
	"device_type" text DEFAULT 'mobile',
	"throttling_profile" text DEFAULT '4g',
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"category" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"featured_image" text NOT NULL,
	"featured_image_alt" text,
	"author" text DEFAULT 'Uptrade Media',
	"author_avatar" text,
	"keywords" text,
	"reading_time" integer DEFAULT 5,
	"meta_title" text,
	"meta_description" text,
	"status" text DEFAULT 'draft',
	"featured" boolean DEFAULT false,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "campaign_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"step_index" integer DEFAULT 0 NOT NULL,
	"delay_days" integer DEFAULT 0,
	"subject_override" text,
	"html_override" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
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
--> statement-breakpoint
CREATE TABLE "client_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"description" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lighthouse_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"metric_name" text NOT NULL,
	"score" integer,
	"value" numeric(10, 2),
	"unit" text,
	"threshold" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipients" (
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
--> statement-breakpoint
CREATE TABLE "web_vitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"target_url" text NOT NULL,
	"lcp" numeric(8, 2),
	"fid" numeric(8, 2),
	"cls" numeric(5, 3),
	"ttfb" numeric(8, 2),
	"fcp" numeric(8, 2),
	"tti" numeric(8, 2),
	"device_type" text,
	"connection_type" text,
	"recorded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "subscribed" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_activity" ADD CONSTRAINT "client_activity_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lighthouse_metrics" ADD CONSTRAINT "lighthouse_metrics_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lighthouse_metrics" ADD CONSTRAINT "lighthouse_metrics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_vitals" ADD CONSTRAINT "web_vitals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;