-- Migration: Add Signal feature flag to seo_sites
-- This enables gating Signal AI features behind a paywall
-- Run in Supabase Dashboard SQL Editor

-- Add Signal enabled flag to seo_sites
ALTER TABLE seo_sites ADD COLUMN IF NOT EXISTS signal_enabled BOOLEAN DEFAULT false;
ALTER TABLE seo_sites ADD COLUMN IF NOT EXISTS signal_enabled_at TIMESTAMPTZ;
ALTER TABLE seo_sites ADD COLUMN IF NOT EXISTS signal_enabled_by UUID REFERENCES contacts(id);

-- Add Signal thread reference (OpenAI Assistants thread per site)
ALTER TABLE seo_sites ADD COLUMN IF NOT EXISTS signal_thread_id TEXT;
ALTER TABLE seo_sites ADD COLUMN IF NOT EXISTS signal_analysis_count INTEGER DEFAULT 0;
ALTER TABLE seo_sites ADD COLUMN IF NOT EXISTS signal_last_analysis_at TIMESTAMPTZ;

-- Auto-enable for uptrademedia.com (admin/demo account)
UPDATE seo_sites SET 
  signal_enabled = true,
  signal_enabled_at = NOW()
WHERE domain = 'uptrademedia.com';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_seo_sites_signal ON seo_sites(signal_enabled) WHERE signal_enabled = true;

-- Comment for documentation
COMMENT ON COLUMN seo_sites.signal_enabled IS 'Premium Signal AI features enabled for this site';
COMMENT ON COLUMN seo_sites.signal_thread_id IS 'OpenAI Assistants thread ID for persistent memory';
COMMENT ON COLUMN seo_sites.signal_analysis_count IS 'Total number of Signal analyses run';
