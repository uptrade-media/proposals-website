-- Migration: 0024_seo_schedules.sql
-- Add SEO scheduling tables for automated recurring analysis

-- Table for scheduling configuration per site
CREATE TABLE IF NOT EXISTS seo_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  enabled BOOLEAN NOT NULL DEFAULT true,
  notifications BOOLEAN NOT NULL DEFAULT true,
  auto_apply BOOLEAN NOT NULL DEFAULT false,
  modules JSONB NOT NULL DEFAULT '["all"]'::jsonb,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id)
);

-- Table for logging scheduled run history
CREATE TABLE IF NOT EXISTS seo_scheduled_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'success', 'error'
  data JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for storing backlink opportunities
CREATE TABLE IF NOT EXISTS seo_backlink_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  target_page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  opportunity_type TEXT NOT NULL, -- 'broken_link', 'resource_page', 'competitor_backlink', 'mention', 'guest_post'
  anchor_text TEXT,
  domain_authority INTEGER,
  relevance_score INTEGER,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'contacted', 'won', 'lost', 'dismissed'
  outreach_notes TEXT,
  ai_analysis JSONB,
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for local SEO analysis results
CREATE TABLE IF NOT EXISTS seo_local_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  score INTEGER,
  business_name TEXT,
  address TEXT,
  phone TEXT,
  gbp_url TEXT,
  nap_consistency JSONB, -- NAP data from various sources
  citations JSONB, -- List of citation sources
  reviews JSONB, -- Review data summary
  competitors JSONB, -- Local competitors
  service_areas JSONB,
  recommendations JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for internal link analysis
CREATE TABLE IF NOT EXISTS seo_internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  orphan_pages JSONB, -- Pages with no internal links
  hub_pages JSONB, -- Pages with many outgoing links
  authority_pages JSONB, -- Pages with many incoming links
  link_suggestions JSONB, -- AI-generated linking suggestions
  link_graph JSONB, -- Graph structure for visualization
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for schema markup
CREATE TABLE IF NOT EXISTS seo_schema_markup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE CASCADE,
  schema_type TEXT NOT NULL, -- 'Organization', 'LocalBusiness', 'Article', 'Product', etc.
  schema_data JSONB NOT NULL, -- The actual JSON-LD schema
  validation_status TEXT DEFAULT 'pending', -- 'pending', 'valid', 'invalid', 'warning'
  validation_errors JSONB,
  deployed BOOLEAN NOT NULL DEFAULT false,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for technical audit results
CREATE TABLE IF NOT EXISTS seo_technical_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  overall_score INTEGER,
  core_web_vitals JSONB, -- LCP, FID/INP, CLS scores
  crawlability JSONB, -- robots.txt, sitemap, canonical issues
  indexability JSONB, -- noindex, redirects, 404s
  mobile_friendliness JSONB,
  security JSONB, -- SSL, mixed content
  performance JSONB, -- Page speed metrics
  accessibility JSONB,
  issues JSONB, -- All detected issues with severity
  recommendations JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for content decay detection
CREATE TABLE IF NOT EXISTS seo_content_decay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  decay_rate DECIMAL, -- Percentage decline
  previous_clicks INTEGER,
  current_clicks INTEGER,
  previous_impressions INTEGER,
  current_impressions INTEGER,
  previous_position DECIMAL,
  current_position DECIMAL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT, -- 'traffic_decline', 'ranking_drop', 'impression_decline'
  ai_recommendation JSONB,
  status TEXT NOT NULL DEFAULT 'detected', -- 'detected', 'refreshing', 'refreshed', 'dismissed'
  refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seo_schedules_next_run ON seo_schedules(next_run_at) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_seo_scheduled_runs_site ON seo_scheduled_runs(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_backlink_opportunities_site ON seo_backlink_opportunities(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_backlink_opportunities_status ON seo_backlink_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_seo_local_analysis_site ON seo_local_analysis(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_internal_links_site ON seo_internal_links(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_schema_markup_site ON seo_schema_markup(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_schema_markup_page ON seo_schema_markup(page_id);
CREATE INDEX IF NOT EXISTS idx_seo_technical_audits_site ON seo_technical_audits(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_content_decay_site ON seo_content_decay(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_content_decay_status ON seo_content_decay(status);

-- Comments for documentation
COMMENT ON TABLE seo_schedules IS 'Configuration for automated recurring SEO analysis per site';
COMMENT ON TABLE seo_scheduled_runs IS 'History log of all scheduled SEO analysis runs';
COMMENT ON TABLE seo_backlink_opportunities IS 'Discovered backlink building opportunities with outreach tracking';
COMMENT ON TABLE seo_local_analysis IS 'Local SEO analysis results including GBP, NAP, citations';
COMMENT ON TABLE seo_internal_links IS 'Internal linking analysis with orphan detection and suggestions';
COMMENT ON TABLE seo_schema_markup IS 'Schema.org JSON-LD markup storage and validation';
COMMENT ON TABLE seo_technical_audits IS 'Technical SEO audit results including Core Web Vitals';
COMMENT ON TABLE seo_content_decay IS 'Content decay detection for pages losing traffic/rankings';
