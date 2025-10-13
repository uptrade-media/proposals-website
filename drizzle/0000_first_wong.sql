CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"company" text,
	"role" text DEFAULT 'client',
	"account_setup" text DEFAULT 'false',
	"google_id" text,
	"avatar" text,
	"password" text,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contacts_email_unique" UNIQUE("email")
);
