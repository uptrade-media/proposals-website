-- Migration: 0037_ensure_seo_tables.sql
-- Ensure all SEO advanced feature tables exist

-- =====================================================
-- SEO CANNIBALIZATION - Detect keyword cannibalization
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_cannibalization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- The competing keyword
  keyword TEXT NOT NULL,
  keyword_hash TEXT NOT NULL,
  search_volume INTEGER,
  
  -- Pages fighting for this keyword
  competing_pages JSONB NOT NULL DEFAULT '[]',
  page_count INTEGER DEFAULT 0,
  
  -- Impact analysis
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  position_variance DECIMAL(5,2),
  ctr_loss_estimate DECIMAL(5,2),
  
  -- AI recommendation
  recommended_primary_page_id UUID REFERENCES seo_pages(id),
  recommended_primary_url TEXT,
  ai_strategy TEXT,
  ai_reasoning TEXT,
  ai_action_steps JSONB DEFAULT '[]',
  
  -- Priority/Status
  severity TEXT DEFAULT 'medium',
  estimated_traffic_loss INTEGER,
  status TEXT DEFAULT 'detected',
  
  resolved_at TIMESTAMPTZ,
  resolved_action TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_cannibalization_keyword UNIQUE (site_id, keyword_hash)
);

CREATE INDEX IF NOT EXISTS idx_seo_cannibalization_site ON seo_cannibalization(site_id, status);
CREATE INDEX IF NOT EXISTS idx_seo_cannibalization_severity ON seo_cannibalization(site_id, severity);

-- =====================================================
-- SEO TOPIC CLUSTERS - Semantic keyword clustering
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_topic_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  cluster_name TEXT NOT NULL,
  cluster_slug TEXT,
  description TEXT,
  
  pillar_page_id UUID REFERENCES seo_pages(id),
  pillar_url TEXT,
  
  cluster_keywords JSONB DEFAULT '[]',
  related_pages JSONB DEFAULT '[]',
  
  total_search_volume INTEGER DEFAULT 0,
  avg_difficulty DECIMAL(5,2),
  content_gap_score DECIMAL(5,2),
  
  ai_content_recommendations JSONB DEFAULT '[]',
  ai_internal_link_suggestions JSONB DEFAULT '[]',
  
  status TEXT DEFAULT 'identified',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_topic_clusters_site ON seo_topic_clusters(site_id);

-- =====================================================
-- SEO CONTENT DECAY - Track content freshness/decay
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_content_decay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  
  url TEXT NOT NULL,
  title TEXT,
  
  -- Current metrics
  current_clicks INTEGER DEFAULT 0,
  current_impressions INTEGER DEFAULT 0,
  current_position DECIMAL(5,2),
  
  -- Peak metrics (for comparison)
  peak_clicks INTEGER DEFAULT 0,
  peak_impressions INTEGER DEFAULT 0,
  peak_position DECIMAL(5,2),
  peak_date DATE,
  
  -- Decay calculation
  clicks_decline_percent DECIMAL(5,2),
  impressions_decline_percent DECIMAL(5,2),
  position_change DECIMAL(5,2),
  decay_score INTEGER DEFAULT 0,
  
  -- Decay signals
  decay_signals JSONB DEFAULT '[]',
  
  -- AI recommendations
  ai_diagnosis TEXT,
  ai_recommendations JSONB DEFAULT '[]',
  estimated_recovery_traffic INTEGER,
  
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'detected',
  
  last_updated DATE,
  refreshed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_content_decay_site ON seo_content_decay(site_id, severity);
CREATE INDEX IF NOT EXISTS idx_seo_content_decay_page ON seo_content_decay(page_id);

-- =====================================================
-- SEO PAGE SPEED CORRELATION (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_pagespeed_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  
  url TEXT NOT NULL,
  
  -- Core Web Vitals
  lcp_ms INTEGER,
  fid_ms INTEGER,
  cls DECIMAL(5,3),
  inp_ms INTEGER,
  fcp_ms INTEGER,
  ttfb_ms INTEGER,
  
  -- Scores
  performance_score INTEGER,
  mobile_score INTEGER,
  
  -- Rankings for this page
  keywords_tracked INTEGER DEFAULT 0,
  avg_position DECIMAL(5,2),
  
  -- Correlation analysis
  speed_ranking_correlation DECIMAL(4,3),
  estimated_position_if_fast DECIMAL(5,2),
  
  -- Impact projection
  traffic_lost_to_speed INTEGER,
  potential_traffic_gain INTEGER,
  priority_score INTEGER DEFAULT 0,
  
  -- Recommendations
  speed_issues JSONB DEFAULT '[]',
  estimated_fix_hours DECIMAL(4,1),
  
  -- Historical for correlation
  speed_history JSONB DEFAULT '[]',
  
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_pagespeed_site ON seo_pagespeed_impact(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_pagespeed_priority ON seo_pagespeed_impact(priority_score DESC);

-- =====================================================
-- SEO NOT INDEXED URLS - Track URLs that aren't indexed
-- These can be old URLs, orphan pages, or pages with issues
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_not_indexed_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- URL info
  url TEXT NOT NULL,
  discovered_from TEXT, -- 'gsc_analytics', 'sitemap', 'crawl', 'manual'
  
  -- GSC inspection result
  indexing_state TEXT, -- NOINDEX, DISCOVERED_CURRENTLY_NOT_INDEXED, CRAWLED_CURRENTLY_NOT_INDEXED, etc.
  verdict TEXT, -- PASS, NEUTRAL, FAIL, etc.
  last_crawl_time TIMESTAMPTZ,
  crawled_as TEXT, -- DESKTOP, MOBILE
  robots_txt_state TEXT,
  page_fetch_state TEXT, -- SUCCESSFUL, SOFT_404, REDIRECT, etc.
  
  -- Analysis
  reason TEXT, -- Human-readable reason why not indexed
  recommendation TEXT, -- What to do about it
  
  -- Action tracking
  action TEXT DEFAULT 'pending', -- 'pending', 'keep', 'remove', 'redirect', 'fix', 'ignored'
  action_taken_at TIMESTAMPTZ,
  action_notes TEXT,
  
  -- For removal workflow
  removal_requested BOOLEAN DEFAULT false,
  removal_requested_at TIMESTAMPTZ,
  removal_confirmed BOOLEAN DEFAULT false,
  
  -- Metadata
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  check_count INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_not_indexed_url UNIQUE (site_id, url)
);

CREATE INDEX IF NOT EXISTS idx_seo_not_indexed_site ON seo_not_indexed_urls(site_id, action);
CREATE INDEX IF NOT EXISTS idx_seo_not_indexed_state ON seo_not_indexed_urls(site_id, indexing_state);
CREATE INDEX IF NOT EXISTS idx_seo_not_indexed_removal ON seo_not_indexed_urls(site_id, removal_requested);

-- =====================================================
-- SEO PAGES - Add schema validation columns
-- =====================================================
DO $$
BEGIN
  -- Add schema_json column for storing detected schema
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'schema_json'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN schema_json JSONB;
  END IF;
  
  -- Add schema_validated_at for tracking last validation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'schema_validated_at'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN schema_validated_at TIMESTAMPTZ;
  END IF;
  
  -- Add schema_validation_errors for storing validation issues
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'schema_validation_errors'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN schema_validation_errors JSONB;
  END IF;
  
  -- Add indexing_fix_applied tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'indexing_fix_applied'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN indexing_fix_applied TEXT;
    ALTER TABLE seo_pages ADD COLUMN indexing_fix_at TIMESTAMPTZ;
  END IF;
  
  -- Add index_removal_requested tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'index_removal_requested_at'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN index_removal_requested_at TIMESTAMPTZ;
    ALTER TABLE seo_pages ADD COLUMN index_status TEXT;
  END IF;
  
  -- Add indexing_requested_at for reindex requests
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'indexing_requested_at'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN indexing_requested_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_seo_pages_schema_errors ON seo_pages(site_id) 
  WHERE schema_validation_errors IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seo_pages_index_status ON seo_pages(site_id, index_status) 
  WHERE index_status IS NOT NULL;

-- =====================================================
-- SEO SITES - Add sitemap status tracking
-- =====================================================
DO $$
BEGIN
  -- Add sitemaps JSONB column for storing GSC sitemap data
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_sites' AND column_name = 'gsc_sitemaps'
  ) THEN
    ALTER TABLE seo_sites ADD COLUMN gsc_sitemaps JSONB DEFAULT '[]';
    COMMENT ON COLUMN seo_sites.gsc_sitemaps IS 'Array of sitemap objects from GSC: [{path, lastSubmitted, isPending, isSitemapsIndex, type, lastDownloaded, warnings, errors}]';
  END IF;
  
  -- Add sitemap sync timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_sites' AND column_name = 'gsc_sitemaps_synced_at'
  ) THEN
    ALTER TABLE seo_sites ADD COLUMN gsc_sitemaps_synced_at TIMESTAMPTZ;
  END IF;
END $$;