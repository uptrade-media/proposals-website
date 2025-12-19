-- Fix schema issues from GSC sync

-- Add status column to seo_pages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'status'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN status TEXT DEFAULT 'active';
    CREATE INDEX idx_seo_pages_status ON seo_pages(status) WHERE status = 'active';
  END IF;
END $$;

-- Add is_tracked column to seo_keyword_universe if not exists (referenced in copilot-instructions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_keyword_universe' AND column_name = 'is_tracked'
  ) THEN
    ALTER TABLE seo_keyword_universe ADD COLUMN is_tracked BOOLEAN DEFAULT true;
    CREATE INDEX idx_seo_keywords_is_tracked ON seo_keyword_universe(site_id, is_tracked);
  END IF;
END $$;

-- Drop the old site_id+keyword unique constraint (use keyword_hash instead)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'seo_keyword_universe_site_keyword_unique'
  ) THEN
    ALTER TABLE seo_keyword_universe 
    DROP CONSTRAINT seo_keyword_universe_site_keyword_unique;
  END IF;
END $$;

-- Ensure keyword_hash unique index exists (should be from migration 0023)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_keywords_unique 
ON seo_keyword_universe(site_id, keyword_hash);

