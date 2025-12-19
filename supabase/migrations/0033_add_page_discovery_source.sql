-- Add discovery_source column to track how pages were found
-- 'sitemap' = from NextJS sitemap (source of truth)
-- 'gsc' = discovered in GSC but not in sitemap (should be removed)
-- 'manual' = manually added by user

ALTER TABLE seo_pages 
ADD COLUMN discovery_source TEXT DEFAULT 'manual'
CHECK (discovery_source IN ('sitemap', 'gsc', 'manual'));

-- Add index for filtering
CREATE INDEX idx_seo_pages_discovery_source ON seo_pages(discovery_source);

-- Add index_removal_requested_at timestamp for tracking removal requests
ALTER TABLE seo_pages 
ADD COLUMN index_removal_requested_at TIMESTAMPTZ;

COMMENT ON COLUMN seo_pages.discovery_source IS 'How the page was discovered: sitemap (NextJS), gsc (Google Search Console), or manual (user added)';
COMMENT ON COLUMN seo_pages.index_removal_requested_at IS 'When index removal was requested via Google Indexing API';
