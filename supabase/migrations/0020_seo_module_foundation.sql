-- =====================================================
-- SEO MODULE - PHASE 1: FOUNDATION
-- Portal Multi-Tenant SEO Management System
-- Created: December 2025
-- =====================================================

-- =====================================================
-- SEO SITES - One per client domain we manage
-- =====================================================
CREATE TABLE seo_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Site identification
  domain TEXT NOT NULL,                    -- 'example.com'
  site_name TEXT,                          -- Friendly name
  sitemap_url TEXT,                        -- 'https://example.com/sitemap.xml'
  
  -- Google Search Console
  gsc_property_url TEXT,                   -- 'sc-domain:example.com' or URL prefix
  gsc_access_token TEXT,                   -- Encrypted OAuth token
  gsc_refresh_token TEXT,                  -- Encrypted refresh token
  gsc_token_expires_at TIMESTAMPTZ,
  gsc_connected_at TIMESTAMPTZ,
  gsc_last_sync_at TIMESTAMPTZ,
  
  -- Site-wide metrics (cached from GSC)
  total_clicks_28d INTEGER DEFAULT 0,
  total_impressions_28d INTEGER DEFAULT 0,
  avg_position_28d DECIMAL(4,1),
  avg_ctr_28d DECIMAL(5,2),
  
  -- Previous period metrics (for comparison)
  total_clicks_prev_28d INTEGER DEFAULT 0,
  total_impressions_prev_28d INTEGER DEFAULT 0,
  avg_position_prev_28d DECIMAL(4,1),
  avg_ctr_prev_28d DECIMAL(5,2),
  
  -- Indexing status
  pages_indexed INTEGER DEFAULT 0,
  pages_not_indexed INTEGER DEFAULT 0,
  
  -- Core Web Vitals (from PageSpeed/CrUX)
  cwv_lcp_ms INTEGER,                      -- Largest Contentful Paint
  cwv_inp_ms INTEGER,                      -- Interaction to Next Paint (replaced FID)
  cwv_cls DECIMAL(4,3),                    -- Cumulative Layout Shift
  cwv_status TEXT,                         -- 'good', 'needs-improvement', 'poor'
  cwv_last_checked_at TIMESTAMPTZ,
  
  -- Settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_hours INTEGER DEFAULT 24,
  priority_pages JSONB DEFAULT '[]',       -- URLs to check more frequently
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_sites_contact ON seo_sites(contact_id);
CREATE UNIQUE INDEX idx_seo_sites_domain ON seo_sites(domain);

-- =====================================================
-- SEO PAGES - Every page we track/manage
-- =====================================================
CREATE TABLE seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- Page identification
  url TEXT NOT NULL,                       -- Full URL
  path TEXT NOT NULL,                      -- '/about/' - for easier querying
  
  -- Current metadata (from crawl)
  title TEXT,
  title_length INTEGER,
  meta_description TEXT,
  meta_description_length INTEGER,
  h1 TEXT,
  h1_count INTEGER,
  canonical_url TEXT,
  robots_meta TEXT,                        -- 'index,follow' etc
  
  -- Managed metadata (what we want it to be)
  managed_title TEXT,
  managed_meta_description TEXT,
  managed_canonical_url TEXT,
  managed_robots_meta TEXT,
  
  -- Content analysis
  word_count INTEGER,
  internal_links_in INTEGER DEFAULT 0,     -- Links pointing TO this page
  internal_links_out INTEGER DEFAULT 0,    -- Links FROM this page
  external_links INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  images_without_alt INTEGER DEFAULT 0,
  
  -- Schema.org markup
  has_schema BOOLEAN DEFAULT false,
  schema_types JSONB,                      -- ['Article', 'FAQPage', etc]
  managed_schema JSONB,                    -- Schema we control
  
  -- Target keywords
  target_keywords JSONB DEFAULT '[]',      -- [{keyword, priority, current_position}]
  
  -- Indexing status
  index_status TEXT DEFAULT 'unknown',     -- 'indexed', 'not-indexed', 'blocked', 'unknown'
  last_crawled_by_google TIMESTAMPTZ,
  
  -- GSC performance (last 28 days)
  clicks_28d INTEGER DEFAULT 0,
  impressions_28d INTEGER DEFAULT 0,
  avg_position_28d DECIMAL(4,1),
  ctr_28d DECIMAL(5,2),
  
  -- Previous period (for comparison)
  clicks_prev_28d INTEGER DEFAULT 0,
  impressions_prev_28d INTEGER DEFAULT 0,
  avg_position_prev_28d DECIMAL(4,1),
  ctr_prev_28d DECIMAL(5,2),
  
  -- PageSpeed scores
  performance_score INTEGER,
  seo_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  pagespeed_last_checked_at TIMESTAMPTZ,
  
  -- Quality signals
  content_quality_score INTEGER,           -- AI-calculated 0-100
  seo_health_score INTEGER,                -- Calculated from all factors
  opportunities_count INTEGER DEFAULT 0,
  
  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_crawled_at TIMESTAMPTZ,
  last_gsc_sync_at TIMESTAMPTZ,
  metadata_published_at TIMESTAMPTZ,       -- When we last pushed changes
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_pages_site ON seo_pages(site_id);
CREATE INDEX idx_seo_pages_path ON seo_pages(site_id, path);
CREATE INDEX idx_seo_pages_url ON seo_pages(site_id, url);
CREATE INDEX idx_seo_pages_health ON seo_pages(seo_health_score);
CREATE INDEX idx_seo_pages_opportunities ON seo_pages(opportunities_count DESC);
CREATE INDEX idx_seo_pages_clicks ON seo_pages(clicks_28d DESC);

-- =====================================================
-- SEO QUERIES - Keyword performance tracking
-- =====================================================
CREATE TABLE seo_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  
  -- Query data
  query TEXT NOT NULL,
  query_hash TEXT NOT NULL,                -- For deduplication (MD5 of query)
  
  -- Current performance (last 28 days)
  clicks_28d INTEGER DEFAULT 0,
  impressions_28d INTEGER DEFAULT 0,
  avg_position_28d DECIMAL(4,1),
  ctr_28d DECIMAL(5,2),
  
  -- Previous period (for comparison)
  clicks_prev_28d INTEGER DEFAULT 0,
  impressions_prev_28d INTEGER DEFAULT 0,
  avg_position_prev_28d DECIMAL(4,1),
  ctr_prev_28d DECIMAL(5,2),
  
  -- Trend indicators
  position_trend TEXT,                     -- 'rising', 'falling', 'stable'
  clicks_trend TEXT,
  impressions_trend TEXT,
  
  -- Classification
  query_type TEXT,                         -- 'branded', 'non-branded', 'local', 'informational', 'transactional'
  is_target_keyword BOOLEAN DEFAULT false,
  
  -- Opportunity flags
  is_striking_distance BOOLEAN DEFAULT false,  -- Position 8-20
  is_low_ctr BOOLEAN DEFAULT false,            -- High impressions, low CTR
  is_cannibalized BOOLEAN DEFAULT false,       -- Multiple pages ranking
  
  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_queries_site ON seo_queries(site_id);
CREATE INDEX idx_seo_queries_page ON seo_queries(page_id);
CREATE INDEX idx_seo_queries_hash ON seo_queries(site_id, query_hash);
CREATE INDEX idx_seo_queries_position ON seo_queries(avg_position_28d);
CREATE INDEX idx_seo_queries_clicks ON seo_queries(clicks_28d DESC);
CREATE INDEX idx_seo_queries_striking ON seo_queries(site_id) WHERE is_striking_distance = true;
CREATE INDEX idx_seo_queries_low_ctr ON seo_queries(site_id) WHERE is_low_ctr = true;

-- =====================================================
-- SEO OPPORTUNITIES - AI-generated tasks
-- =====================================================
CREATE TABLE seo_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE CASCADE,
  query_id UUID REFERENCES seo_queries(id) ON DELETE SET NULL,
  
  -- Opportunity details
  type TEXT NOT NULL,                      -- See SEO_OPPORTUNITY_TYPES
  priority TEXT DEFAULT 'medium',          -- 'critical', 'high', 'medium', 'low'
  title TEXT NOT NULL,
  description TEXT,
  
  -- AI analysis
  ai_recommendation TEXT,                  -- Detailed AI suggestion
  ai_confidence DECIMAL(3,2),              -- 0.00-1.00
  estimated_impact TEXT,                   -- 'high', 'medium', 'low'
  estimated_effort TEXT,                   -- 'quick-win', 'moderate', 'significant'
  
  -- Supporting data
  current_value TEXT,                      -- What it is now
  recommended_value TEXT,                  -- What it should be
  supporting_data JSONB,                   -- Queries, metrics, etc
  
  -- Status tracking
  status TEXT DEFAULT 'open',              -- 'open', 'in-progress', 'completed', 'dismissed'
  assigned_to UUID REFERENCES contacts(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES contacts(id),
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  
  -- Results tracking
  result_notes TEXT,
  clicks_before INTEGER,
  clicks_after INTEGER,
  position_before DECIMAL(4,1),
  position_after DECIMAL(4,1),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_opportunities_site ON seo_opportunities(site_id);
CREATE INDEX idx_seo_opportunities_page ON seo_opportunities(page_id);
CREATE INDEX idx_seo_opportunities_status ON seo_opportunities(status);
CREATE INDEX idx_seo_opportunities_priority ON seo_opportunities(priority, status);
CREATE INDEX idx_seo_opportunities_type ON seo_opportunities(type);

-- =====================================================
-- SEO PAGE HISTORY - Track changes over time
-- =====================================================
CREATE TABLE seo_page_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES seo_pages(id) ON DELETE CASCADE,
  
  -- Snapshot data
  snapshot_date DATE NOT NULL,
  
  -- Metadata at time of snapshot
  title TEXT,
  meta_description TEXT,
  
  -- Performance at time of snapshot
  clicks INTEGER,
  impressions INTEGER,
  avg_position DECIMAL(4,1),
  ctr DECIMAL(5,2),
  
  -- Scores at time of snapshot
  seo_health_score INTEGER,
  content_quality_score INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_page_history_page ON seo_page_history(page_id, snapshot_date DESC);
CREATE UNIQUE INDEX idx_seo_page_history_unique ON seo_page_history(page_id, snapshot_date);

-- =====================================================
-- SEO COMPETITORS - Track competitor rankings
-- =====================================================
CREATE TABLE seo_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  competitor_domain TEXT NOT NULL,
  competitor_name TEXT,
  
  -- Overlap metrics
  keyword_overlap_count INTEGER DEFAULT 0,
  keyword_overlap_queries JSONB,           -- Top shared keywords
  
  -- Competitive position
  avg_position_gap DECIMAL(4,1),           -- Positive = we're winning
  
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_competitors_site ON seo_competitors(site_id);
CREATE UNIQUE INDEX idx_seo_competitors_domain ON seo_competitors(site_id, competitor_domain);

-- =====================================================
-- SEO TASKS - Kanban-style work tracking
-- =====================================================
CREATE TABLE seo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES seo_opportunities(id) ON DELETE SET NULL,
  
  -- Task details
  type TEXT NOT NULL,                      -- 'title-rewrite', 'meta-rewrite', 'content-create', etc
  category TEXT NOT NULL,                  -- 'content', 'metadata', 'technical', 'links'
  title TEXT NOT NULL,
  description TEXT,
  
  -- AI-generated specifics
  target_keyword TEXT,
  ai_brief TEXT,                           -- Detailed instructions
  ai_examples TEXT,                        -- Example implementations
  
  -- Effort/Impact
  effort TEXT DEFAULT 'medium',            -- 'quick', 'medium', 'high'
  estimated_hours DECIMAL(4,1),
  impact TEXT DEFAULT 'medium',            -- 'low', 'medium', 'high'
  
  -- Assignment
  assigned_to UUID REFERENCES contacts(id),
  due_date DATE,
  
  -- Progress
  status TEXT DEFAULT 'backlog',           -- 'backlog', 'todo', 'in-progress', 'review', 'done'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES contacts(id),
  
  -- Deliverable
  deliverable_type TEXT,                   -- 'text', 'schema', 'link', 'page'
  deliverable_content TEXT,                -- The actual work product
  
  -- Results tracking
  baseline_clicks INTEGER,
  baseline_position DECIMAL(4,1),
  result_clicks INTEGER,
  result_position DECIMAL(4,1),
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES contacts(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_tasks_site ON seo_tasks(site_id);
CREATE INDEX idx_seo_tasks_page ON seo_tasks(page_id);
CREATE INDEX idx_seo_tasks_status ON seo_tasks(site_id, status);
CREATE INDEX idx_seo_tasks_assigned ON seo_tasks(assigned_to, status);
CREATE INDEX idx_seo_tasks_due ON seo_tasks(due_date) WHERE status NOT IN ('done');

-- =====================================================
-- SEO CRAWL LOG - Track crawl history
-- =====================================================
CREATE TABLE seo_crawl_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  crawl_type TEXT NOT NULL,                -- 'sitemap', 'page', 'full'
  status TEXT NOT NULL,                    -- 'running', 'completed', 'failed'
  
  pages_found INTEGER DEFAULT 0,
  pages_crawled INTEGER DEFAULT 0,
  pages_updated INTEGER DEFAULT 0,
  errors JSONB,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_crawl_log_site ON seo_crawl_log(site_id, created_at DESC);

-- =====================================================
-- HELPER FUNCTION: Calculate SEO health score
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_seo_health_score(
  p_title_length INTEGER,
  p_meta_length INTEGER,
  p_h1_count INTEGER,
  p_word_count INTEGER,
  p_has_schema BOOLEAN,
  p_images_without_alt INTEGER,
  p_index_status TEXT,
  p_performance_score INTEGER,
  p_clicks_28d INTEGER,
  p_avg_position DECIMAL
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 100;
BEGIN
  -- Title checks (-10 each)
  IF p_title_length IS NULL OR p_title_length = 0 THEN
    score := score - 10;
  ELSIF p_title_length < 30 THEN
    score := score - 5;
  ELSIF p_title_length > 60 THEN
    score := score - 5;
  END IF;
  
  -- Meta description checks (-10 each)
  IF p_meta_length IS NULL OR p_meta_length = 0 THEN
    score := score - 10;
  ELSIF p_meta_length < 120 THEN
    score := score - 5;
  ELSIF p_meta_length > 160 THEN
    score := score - 5;
  END IF;
  
  -- H1 checks (-10 if missing, -5 if multiple)
  IF p_h1_count IS NULL OR p_h1_count = 0 THEN
    score := score - 10;
  ELSIF p_h1_count > 1 THEN
    score := score - 5;
  END IF;
  
  -- Content length (-15 if thin)
  IF p_word_count IS NOT NULL AND p_word_count < 300 THEN
    score := score - 15;
  END IF;
  
  -- Schema bonus (+5)
  IF p_has_schema = true THEN
    score := score + 5;
  END IF;
  
  -- Images without alt (-2 each, max -10)
  IF p_images_without_alt IS NOT NULL AND p_images_without_alt > 0 THEN
    score := score - LEAST(p_images_without_alt * 2, 10);
  END IF;
  
  -- Index status (-20 if not indexed)
  IF p_index_status = 'not-indexed' THEN
    score := score - 20;
  ELSIF p_index_status = 'blocked' THEN
    score := score - 15;
  END IF;
  
  -- PageSpeed performance (-10 if poor)
  IF p_performance_score IS NOT NULL AND p_performance_score < 50 THEN
    score := score - 10;
  ELSIF p_performance_score IS NOT NULL AND p_performance_score < 75 THEN
    score := score - 5;
  END IF;
  
  -- Clamp to 0-100
  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TRIGGER: Auto-update seo_health_score on page change
-- =====================================================
CREATE OR REPLACE FUNCTION update_seo_health_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.seo_health_score := calculate_seo_health_score(
    NEW.title_length,
    NEW.meta_description_length,
    NEW.h1_count,
    NEW.word_count,
    NEW.has_schema,
    NEW.images_without_alt,
    NEW.index_status,
    NEW.performance_score,
    NEW.clicks_28d,
    NEW.avg_position_28d
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_health_score
  BEFORE INSERT OR UPDATE ON seo_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_health_score();

-- =====================================================
-- TRIGGER: Update opportunity count on page
-- =====================================================
CREATE OR REPLACE FUNCTION update_page_opportunity_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE seo_pages 
    SET opportunities_count = (
      SELECT COUNT(*) FROM seo_opportunities 
      WHERE page_id = NEW.page_id AND status = 'open'
    ),
    updated_at = NOW()
    WHERE id = NEW.page_id;
  END IF;
  
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE seo_pages 
    SET opportunities_count = (
      SELECT COUNT(*) FROM seo_opportunities 
      WHERE page_id = OLD.page_id AND status = 'open'
    ),
    updated_at = NOW()
    WHERE id = OLD.page_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_page_opportunity_count
  AFTER INSERT OR UPDATE OR DELETE ON seo_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_page_opportunity_count();

-- =====================================================
-- TRIGGER: Update site metrics from pages
-- =====================================================
CREATE OR REPLACE FUNCTION update_site_from_pages()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE seo_sites 
  SET 
    total_clicks_28d = (
      SELECT COALESCE(SUM(clicks_28d), 0) FROM seo_pages WHERE site_id = NEW.site_id
    ),
    total_impressions_28d = (
      SELECT COALESCE(SUM(impressions_28d), 0) FROM seo_pages WHERE site_id = NEW.site_id
    ),
    pages_indexed = (
      SELECT COUNT(*) FROM seo_pages WHERE site_id = NEW.site_id AND index_status = 'indexed'
    ),
    pages_not_indexed = (
      SELECT COUNT(*) FROM seo_pages WHERE site_id = NEW.site_id AND index_status IN ('not-indexed', 'blocked')
    ),
    updated_at = NOW()
  WHERE id = NEW.site_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_site_from_pages
  AFTER INSERT OR UPDATE ON seo_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_site_from_pages();

-- =====================================================
-- RLS POLICIES (if using Supabase Auth in future)
-- =====================================================
-- For now, all access is through service role in Netlify functions

COMMENT ON TABLE seo_sites IS 'SEO sites being managed - one per client domain';
COMMENT ON TABLE seo_pages IS 'Individual pages tracked for SEO optimization';
COMMENT ON TABLE seo_queries IS 'Search queries and their performance from GSC';
COMMENT ON TABLE seo_opportunities IS 'AI-detected SEO improvement opportunities';
COMMENT ON TABLE seo_page_history IS 'Historical snapshots of page performance';
COMMENT ON TABLE seo_competitors IS 'Competitor domains tracked for comparison';
COMMENT ON TABLE seo_tasks IS 'Kanban-style SEO work tasks';
COMMENT ON TABLE seo_crawl_log IS 'Log of crawl operations';
