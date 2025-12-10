-- Add enhanced blog fields for AI-generated content
-- Migration: 0009_add_blog_enhancements.sql
-- 
-- EXISTING COLUMNS (confirmed from database):
-- id, slug, title, subtitle, category, excerpt, content, content_html,
-- featured_image, featured_image_alt, author, author_avatar, keywords,
-- reading_time, meta_title, meta_description, status, featured,
-- published_at, created_at, updated_at, og_title, og_description,
-- focus_keyphrase, internal_links, schema_markup

-- NEW COLUMNS TO ADD:

-- Table of contents for navigation
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS table_of_contents JSONB;
COMMENT ON COLUMN blog_posts.table_of_contents IS 'Array of {heading, slug, level} for TOC generation';

-- FAQ items for FAQ schema markup
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS faq_items JSONB;
COMMENT ON COLUMN blog_posts.faq_items IS 'Array of {question, answer} for FAQ schema';

-- Service callouts for CTA sections
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS service_callouts JSONB;
COMMENT ON COLUMN blog_posts.service_callouts IS 'Array of related Uptrade services with URLs and CTAs';

-- Target audience for content personalization
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS target_audience TEXT;
COMMENT ON COLUMN blog_posts.target_audience IS 'Who this article is written for';

-- Estimated content value for reporting
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS estimated_value TEXT;
COMMENT ON COLUMN blog_posts.estimated_value IS 'Estimated SEO content value (e.g., "$500-1000")';

-- Canonical URL for duplicate content management
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_url TEXT;
COMMENT ON COLUMN blog_posts.canonical_url IS 'Canonical URL if different from default';

-- Add index for faster FAQ queries (for sites showing FAQ across pages)
CREATE INDEX IF NOT EXISTS idx_blog_posts_has_faq ON blog_posts ((faq_items IS NOT NULL)) WHERE faq_items IS NOT NULL;

-- Add index for service callout filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_has_service_callouts ON blog_posts ((service_callouts IS NOT NULL)) WHERE service_callouts IS NOT NULL;
