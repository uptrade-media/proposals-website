-- SEO Background Jobs Migration
-- Tracks long-running background jobs for SEO operations

-- Background jobs table
CREATE TABLE IF NOT EXISTS seo_background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID,  -- No FK constraint due to multi-tenant schema layout
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- Job details
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0,     -- 0-100
  
  -- Results
  result JSONB,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seo_jobs_contact ON seo_background_jobs(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_jobs_status ON seo_background_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_seo_jobs_type ON seo_background_jobs(job_type, created_at DESC);

-- Auto-cleanup old completed jobs (keep 30 days)
-- This would be run by a scheduled job, but define the logic here
COMMENT ON TABLE seo_background_jobs IS 'Tracks long-running SEO background operations. Old completed jobs can be purged after 30 days.';

-- Add metadata_published_at to seo_pages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'metadata_published_at'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN metadata_published_at TIMESTAMPTZ;
  END IF;
END $$;

-- Ensure managed metadata columns exist on seo_pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'managed_title'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN managed_title TEXT;
    ALTER TABLE seo_pages ADD COLUMN managed_meta_description TEXT;
    ALTER TABLE seo_pages ADD COLUMN managed_canonical_url TEXT;
    ALTER TABLE seo_pages ADD COLUMN managed_robots_meta TEXT;
    ALTER TABLE seo_pages ADD COLUMN managed_schema JSONB;
  END IF;
END $$;
