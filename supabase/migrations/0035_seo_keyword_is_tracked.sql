-- Migration: Add is_tracked column to seo_keyword_universe
-- This column was being used in seo-gsc-sync.js but didn't exist

-- Add is_tracked column
ALTER TABLE seo_keyword_universe 
ADD COLUMN IF NOT EXISTS is_tracked BOOLEAN DEFAULT false;

-- Add last_gsc_sync_at column if it doesn't exist
ALTER TABLE seo_keyword_universe 
ADD COLUMN IF NOT EXISTS last_gsc_sync_at TIMESTAMPTZ;

-- Create index for tracked keywords
CREATE INDEX IF NOT EXISTS idx_seo_keywords_tracked 
ON seo_keyword_universe(site_id, is_tracked) 
WHERE is_tracked = true;

-- Add unique constraint on site_id + keyword if not exists
-- The upsert uses onConflict: 'site_id,keyword' so we need this
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'seo_keyword_universe_site_keyword_unique'
  ) THEN
    -- First, remove duplicates keeping the most recently updated one
    DELETE FROM seo_keyword_universe a
    USING seo_keyword_universe b
    WHERE a.site_id = b.site_id 
      AND a.keyword = b.keyword 
      AND a.id < b.id;
    
    -- Now create the unique constraint
    ALTER TABLE seo_keyword_universe 
    ADD CONSTRAINT seo_keyword_universe_site_keyword_unique 
    UNIQUE (site_id, keyword);
  END IF;
END $$;

COMMENT ON COLUMN seo_keyword_universe.is_tracked IS 'Whether this keyword is actively tracked for rank monitoring';
COMMENT ON COLUMN seo_keyword_universe.last_gsc_sync_at IS 'When this keyword was last synced from GSC';
