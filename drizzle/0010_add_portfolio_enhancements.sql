-- Add enhanced portfolio fields for AI-generated content
-- Migration: 0010_add_portfolio_enhancements.sql
-- 
-- EXISTING COLUMNS (confirmed from database):
-- id, project_id, slug, title, subtitle, category, services, description,
-- hero_image, hero_image_alt, hero_image_width, hero_image_height, live_url,
-- kpis, strategic_approach, services_showcase, comprehensive_results, technical_innovations,
-- details, seo, content, content_html, meta_title, meta_description,
-- status, featured, order, published_at, created_at, updated_at

-- NEW COLUMNS TO ADD:

-- Challenges/problems solved section
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS challenges JSONB;
COMMENT ON COLUMN portfolio_items.challenges IS 'Array of {title, description, solution} for problems solved';

-- Client testimonial
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS testimonial JSONB;
COMMENT ON COLUMN portfolio_items.testimonial IS 'Object with {quote, author, title, company, image}';

-- Photo gallery
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS gallery JSONB;
COMMENT ON COLUMN portfolio_items.gallery IS 'Array of {url, alt, caption, width, height}';

-- Video content
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS video JSONB;
COMMENT ON COLUMN portfolio_items.video IS 'Object with {url, embed_url, thumbnail, title, duration}';

-- Team members involved
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS team JSONB;
COMMENT ON COLUMN portfolio_items.team IS 'Array of {name, role, avatar}';

-- Technologies/tech stack
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS technologies JSONB;
COMMENT ON COLUMN portfolio_items.technologies IS 'Array of {name, icon, category, description}';

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_portfolio_has_testimonial ON portfolio_items ((testimonial IS NOT NULL)) WHERE testimonial IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_has_video ON portfolio_items ((video IS NOT NULL)) WHERE video IS NOT NULL;
