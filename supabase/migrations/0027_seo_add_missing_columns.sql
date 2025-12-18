-- Migration: 0027_seo_add_missing_columns.sql
-- Add missing columns referenced by SEO functions

-- Add ctr column to seo_pages (click-through rate from GSC)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'ctr') THEN
    ALTER TABLE seo_pages ADD COLUMN ctr DECIMAL(5,2);
    COMMENT ON COLUMN seo_pages.ctr IS 'Click-through rate percentage from GSC (0-100)';
  END IF;
END $$;

-- Add top_queries column to seo_pages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'top_queries') THEN
    ALTER TABLE seo_pages ADD COLUMN top_queries JSONB DEFAULT '[]';
    COMMENT ON COLUMN seo_pages.top_queries IS 'Top performing queries for this page from GSC';
  END IF;
END $$;

-- Add page_type column if missing (used by seo-schema-generate.js)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'page_type') THEN
    ALTER TABLE seo_pages ADD COLUMN page_type TEXT;
    COMMENT ON COLUMN seo_pages.page_type IS 'Type of page: homepage, service, blog, contact, location, etc.';
  END IF;
END $$;

-- Add content_decay_risk column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'content_decay_risk') THEN
    ALTER TABLE seo_pages ADD COLUMN content_decay_risk BOOLEAN DEFAULT false;
    COMMENT ON COLUMN seo_pages.content_decay_risk IS 'Flag for pages at risk of traffic decline';
  END IF;
END $$;

-- Add decay_detected_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'decay_detected_at') THEN
    ALTER TABLE seo_pages ADD COLUMN decay_detected_at TIMESTAMPTZ;
    COMMENT ON COLUMN seo_pages.decay_detected_at IS 'When content decay was first detected';
  END IF;
END $$;

-- Add last_ai_analysis_at column to seo_sites if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_sites' AND column_name = 'last_ai_analysis_at') THEN
    ALTER TABLE seo_sites ADD COLUMN last_ai_analysis_at TIMESTAMPTZ;
    COMMENT ON COLUMN seo_sites.last_ai_analysis_at IS 'When AI Brain last ran comprehensive analysis';
  END IF;
END $$;

-- Add seo_health_score column to seo_sites if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_sites' AND column_name = 'seo_health_score') THEN
    ALTER TABLE seo_sites ADD COLUMN seo_health_score INTEGER;
    COMMENT ON COLUMN seo_sites.seo_health_score IS 'Overall site SEO health score 0-100';
  END IF;
END $$;

-- Add org_id column to seo_sites if it doesn't exist (for multi-tenant)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_sites' AND column_name = 'org_id') THEN
    ALTER TABLE seo_sites ADD COLUMN org_id UUID;
    COMMENT ON COLUMN seo_sites.org_id IS 'Organization ID for multi-tenant support';
  END IF;
END $$;

-- Add setup_completed column to seo_sites if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_sites' AND column_name = 'setup_completed') THEN
    ALTER TABLE seo_sites ADD COLUMN setup_completed BOOLEAN DEFAULT false;
    COMMENT ON COLUMN seo_sites.setup_completed IS 'Whether the AI Brain setup wizard has been completed';
  END IF;
END $$;

-- Add setup_completed_at column to seo_sites if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_sites' AND column_name = 'setup_completed_at') THEN
    ALTER TABLE seo_sites ADD COLUMN setup_completed_at TIMESTAMPTZ;
    COMMENT ON COLUMN seo_sites.setup_completed_at IS 'When the AI Brain setup was completed';
  END IF;
END $$;

-- Add indexing_status column to seo_pages (for GSC URL Inspection data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'indexing_status') THEN
    ALTER TABLE seo_pages ADD COLUMN indexing_status TEXT;
    COMMENT ON COLUMN seo_pages.indexing_status IS 'Indexing status: indexed, not_indexed, unknown';
  END IF;
END $$;

-- Add indexing_verdict column to seo_pages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'indexing_verdict') THEN
    ALTER TABLE seo_pages ADD COLUMN indexing_verdict TEXT;
    COMMENT ON COLUMN seo_pages.indexing_verdict IS 'GSC URL Inspection verdict: PASS, NEUTRAL, FAIL';
  END IF;
END $$;

-- Add http_status column to seo_pages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'http_status') THEN
    ALTER TABLE seo_pages ADD COLUMN http_status INTEGER;
    COMMENT ON COLUMN seo_pages.http_status IS 'HTTP status code from last crawl';
  END IF;
END $$;

-- Add has_noindex column to seo_pages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'has_noindex') THEN
    ALTER TABLE seo_pages ADD COLUMN has_noindex BOOLEAN DEFAULT false;
    COMMENT ON COLUMN seo_pages.has_noindex IS 'Whether page has noindex directive';
  END IF;
END $$;
