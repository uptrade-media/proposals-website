-- Migration: Add SEO metadata fields to blog_posts table
-- Generated: 2025-12-02
-- Purpose: Add Open Graph tags, focus keyphrase, internal links, and schema markup for AI-generated blogs

ALTER TABLE "blog_posts" 
ADD COLUMN IF NOT EXISTS "og_title" text,
ADD COLUMN IF NOT EXISTS "og_description" text,
ADD COLUMN IF NOT EXISTS "focus_keyphrase" text,
ADD COLUMN IF NOT EXISTS "internal_links" text,
ADD COLUMN IF NOT EXISTS "schema_markup" text;

-- Add comments for documentation
COMMENT ON COLUMN "blog_posts"."og_title" IS 'Open Graph title for social media sharing';
COMMENT ON COLUMN "blog_posts"."og_description" IS 'Open Graph description for social media previews';
COMMENT ON COLUMN "blog_posts"."focus_keyphrase" IS 'Primary SEO keyphrase (2-4 words)';
COMMENT ON COLUMN "blog_posts"."internal_links" IS 'JSON array of suggested internal link topics';
COMMENT ON COLUMN "blog_posts"."schema_markup" IS 'JSON-LD schema.org Article markup';
