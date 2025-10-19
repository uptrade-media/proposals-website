ALTER TABLE "contacts" ADD COLUMN "totp_secret" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "totp_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "backup_codes" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "two_fa_method" text DEFAULT 'totp';--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "last_2fa_check" timestamp;