-- Migration: Add SEO AI Brain Tables
-- Enables deep business understanding, keyword tracking, and AI-powered recommendations

-- =====================================================
-- SEO KNOWLEDGE BASE - Deep business understanding
-- Train AI on site content and business context
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- Business Profile
  business_name TEXT,
  business_type TEXT,                    -- 'local_service', 'ecommerce', 'saas', 'agency', etc.
  industry TEXT,                         -- 'plumbing', 'legal', 'dental', etc.
  industry_keywords JSONB DEFAULT '[]',  -- Core industry terms
  
  -- Value Proposition
  primary_services JSONB DEFAULT '[]',   -- [{name, description, keywords, pages}]
  secondary_services JSONB DEFAULT '[]',
  unique_selling_points JSONB DEFAULT '[]',
  differentiators JSONB DEFAULT '[]',
  
  -- Target Audience
  target_personas JSONB DEFAULT '[]',    -- [{name, description, pain_points, search_behavior}]
  customer_journey_stages JSONB DEFAULT '{}',
  
  -- Geographic
  primary_location JSONB,                -- {city, state, country, coords}
  service_areas JSONB DEFAULT '[]',      -- [{name, type, population, priority, has_page}]
  service_radius_miles INTEGER,
  is_local_business BOOLEAN DEFAULT false,
  
  -- Brand Voice
  brand_voice_description TEXT,
  tone_keywords JSONB DEFAULT '[]',      -- ['professional', 'friendly', 'authoritative']
  terminology JSONB DEFAULT '{}',        -- {preferred: [], avoid: []}
  writing_style_examples JSONB DEFAULT '[]',
  
  -- Competitive Landscape
  primary_competitors JSONB DEFAULT '[]', -- [{domain, name, strengths, weaknesses}]
  competitive_advantages JSONB DEFAULT '[]',
  market_position TEXT,                   -- 'leader', 'challenger', 'niche', 'emerging'
  
  -- Content Strategy
  content_pillars JSONB DEFAULT '[]',     -- Main topic clusters
  content_gaps_identified JSONB DEFAULT '[]',
  content_opportunities JSONB DEFAULT '[]',
  
  -- Performance Benchmarks
  target_keywords_priority JSONB DEFAULT '[]',
  keyword_rankings_snapshot JSONB DEFAULT '{}',
  traffic_goals JSONB DEFAULT '{}',
  
  -- AI Training Data
  site_content_summary TEXT,              -- AI-generated summary of all site content
  key_topics_extracted JSONB DEFAULT '[]',
  entities_extracted JSONB DEFAULT '[]',  -- People, places, products mentioned
  faq_patterns JSONB DEFAULT '[]',        -- Common questions in content
  
  -- Training Status
  last_trained_at TIMESTAMPTZ,
  training_completeness INTEGER DEFAULT 0, -- 0-100
  pages_analyzed INTEGER DEFAULT 0,
  training_status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'needs_refresh'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_knowledge_base_site UNIQUE (site_id)
);

CREATE INDEX IF NOT EXISTS idx_seo_knowledge_base_site ON seo_knowledge_base(site_id);

-- =====================================================
-- SEO KEYWORD UNIVERSE - All keywords we're tracking
-- Unified keyword database with AI analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_keyword_universe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- Keyword data
  keyword TEXT NOT NULL,
  keyword_hash TEXT NOT NULL,
  
  -- Search metrics
  search_volume_monthly INTEGER,
  keyword_difficulty INTEGER,           -- 0-100
  cpc_usd DECIMAL(6,2),
  competition_level TEXT,               -- 'low', 'medium', 'high'
  
  -- Classification
  intent TEXT,                          -- 'informational', 'commercial', 'transactional', 'navigational'
  funnel_stage TEXT,                    -- 'awareness', 'consideration', 'decision'
  topic_cluster TEXT,                   -- Which content pillar this belongs to
  is_branded BOOLEAN DEFAULT false,
  is_local BOOLEAN DEFAULT false,
  is_question BOOLEAN DEFAULT false,
  
  -- Our Status
  target_page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  target_page_url TEXT,
  current_position DECIMAL(4,1),
  best_position_ever DECIMAL(4,1),
  current_page_ranking TEXT,            -- Which of our pages ranks (if any)
  
  -- GSC Data
  clicks_28d INTEGER DEFAULT 0,
  impressions_28d INTEGER DEFAULT 0,
  ctr_28d DECIMAL(5,4),
  
  -- Opportunity scoring
  opportunity_score INTEGER,            -- 0-100 composite score
  difficulty_vs_reward TEXT,            -- 'easy_win', 'worth_effort', 'long_term', 'avoid'
  priority TEXT DEFAULT 'medium',       -- 'critical', 'high', 'medium', 'low'
  
  -- Competitive analysis
  serp_features JSONB DEFAULT '[]',     -- ['featured_snippet', 'local_pack', 'faq', 'video']
  top_competitors JSONB DEFAULT '[]',   -- [{domain, position, title, url}]
  competitor_content_type TEXT,         -- 'listicle', 'guide', 'comparison', 'tool'
  
  -- Related keywords
  parent_keyword TEXT,                  -- Head term if this is a long-tail
  related_keywords JSONB DEFAULT '[]',
  questions JSONB DEFAULT '[]',         -- People Also Ask
  
  -- AI recommendations
  ai_recommendation TEXT,
  ai_content_angle TEXT,
  ai_title_suggestion TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  
  -- Tracking
  source TEXT,                          -- 'gsc', 'manual', 'competitor', 'ai_suggested'
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  position_history JSONB DEFAULT '[]',  -- [{date, position}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_site ON seo_keyword_universe(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_hash ON seo_keyword_universe(site_id, keyword_hash);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_priority ON seo_keyword_universe(site_id, priority);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_opportunity ON seo_keyword_universe(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_position ON seo_keyword_universe(current_position) WHERE current_position IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_keywords_unique ON seo_keyword_universe(site_id, keyword_hash);

-- =====================================================
-- SEO CONTENT GAPS - Missing content opportunities
-- AI-identified topics we should cover
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_content_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- Gap identification
  topic TEXT NOT NULL,
  keywords JSONB DEFAULT '[]',           -- Related keywords for this topic
  search_volume_total INTEGER,           -- Combined volume of keywords
  
  -- Gap type
  gap_type TEXT,                         -- 'missing_page', 'thin_content', 'outdated', 'competitor_only'
  
  -- Evidence
  competitor_coverage JSONB DEFAULT '[]', -- [{domain, url, word_count, ranking_keywords}]
  our_coverage TEXT,                      -- 'none', 'partial', 'outdated'
  existing_page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  
  -- AI Analysis
  ai_importance_score INTEGER,            -- 0-100
  ai_reasoning TEXT,
  ai_suggested_title TEXT,
  ai_suggested_url TEXT,
  ai_suggested_outline JSONB DEFAULT '[]',
  ai_suggested_word_count INTEGER,
  ai_content_type TEXT,                   -- 'service_page', 'blog_post', 'guide', 'faq', 'location'
  ai_suggested_schema TEXT,               -- 'Article', 'FAQPage', 'LocalBusiness', etc.
  
  -- Effort/Impact
  estimated_traffic_potential INTEGER,
  estimated_effort TEXT,                  -- 'quick', 'medium', 'significant'
  estimated_hours DECIMAL(4,1),
  priority TEXT DEFAULT 'medium',
  
  -- Status
  status TEXT DEFAULT 'identified',       -- 'identified', 'planned', 'in_progress', 'completed', 'dismissed'
  assigned_to UUID REFERENCES contacts(id),
  completed_at TIMESTAMPTZ,
  completed_page_id UUID REFERENCES seo_pages(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_content_gaps_site ON seo_content_gaps(site_id, status);
CREATE INDEX IF NOT EXISTS idx_seo_content_gaps_priority ON seo_content_gaps(priority, status);

-- =====================================================
-- SEO AI RECOMMENDATIONS - Unified recommendation queue
-- All AI-generated suggestions with apply tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  
  -- Recommendation details
  category TEXT NOT NULL,                 -- 'title', 'meta', 'content', 'technical', 'keyword', 'link', 'schema', 'local'
  subcategory TEXT,                       -- More specific type
  priority TEXT DEFAULT 'medium',         -- 'critical', 'high', 'medium', 'low'
  
  -- The recommendation
  title TEXT NOT NULL,
  description TEXT,
  
  -- Current vs Suggested
  current_value TEXT,
  suggested_value TEXT,
  
  -- For metadata changes - store the exact values
  field_name TEXT,                        -- 'managed_title', 'managed_meta_description', etc.
  
  -- AI Context
  ai_reasoning TEXT,                      -- Why AI made this recommendation
  ai_confidence DECIMAL(3,2),             -- 0.00-1.00
  ai_model TEXT,                          -- Which model generated this
  data_sources JSONB DEFAULT '[]',        -- ['gsc', 'competitor', 'keyword_research', 'crawl']
  supporting_data JSONB,                  -- Evidence backing the recommendation
  
  -- Impact prediction
  predicted_impact JSONB,                 -- {metric: 'ctr', current: 0.02, predicted: 0.035, confidence: 0.8}
  estimated_traffic_gain INTEGER,
  estimated_revenue_impact DECIMAL(10,2),
  
  -- Implementation
  effort TEXT DEFAULT 'quick',            -- 'instant', 'quick', 'medium', 'significant'
  auto_fixable BOOLEAN DEFAULT false,     -- Can we apply this automatically?
  one_click_fixable BOOLEAN DEFAULT true, -- Can user apply with one click?
  implementation_steps JSONB DEFAULT '[]',
  
  -- Status
  status TEXT DEFAULT 'pending',          -- 'pending', 'approved', 'applied', 'dismissed', 'failed', 'expired'
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES contacts(id),
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES contacts(id),
  dismissed_reason TEXT,
  
  -- Results tracking
  baseline_metrics JSONB,                 -- Metrics before applying
  result_metrics JSONB,                   -- Metrics after applying
  result_measured_at TIMESTAMPTZ,
  actual_impact TEXT,
  was_successful BOOLEAN,
  
  -- Batch grouping
  batch_id UUID,                          -- Group related recommendations
  analysis_run_id UUID,                   -- Which analysis generated this
  dependency_ids JSONB DEFAULT '[]',      -- Other recommendations this depends on
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                  -- Some recommendations become stale
);

CREATE INDEX IF NOT EXISTS idx_seo_recommendations_site ON seo_ai_recommendations(site_id, status);
CREATE INDEX IF NOT EXISTS idx_seo_recommendations_priority ON seo_ai_recommendations(priority, status);
CREATE INDEX IF NOT EXISTS idx_seo_recommendations_page ON seo_ai_recommendations(page_id) WHERE page_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seo_recommendations_auto ON seo_ai_recommendations(auto_fixable, status) WHERE auto_fixable = true AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_seo_recommendations_batch ON seo_ai_recommendations(batch_id) WHERE batch_id IS NOT NULL;

-- =====================================================
-- SEO COMPETITOR ANALYSIS - Track competitor intelligence
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- Competitor info
  competitor_domain TEXT NOT NULL,
  competitor_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Domain metrics (estimated)
  estimated_traffic INTEGER,
  estimated_keywords INTEGER,
  domain_authority INTEGER,
  
  -- Keyword overlap
  shared_keywords_count INTEGER DEFAULT 0,
  keywords_they_rank_we_dont INTEGER DEFAULT 0,
  keywords_we_rank_they_dont INTEGER DEFAULT 0,
  keyword_gap_data JSONB DEFAULT '[]',    -- [{keyword, their_position, our_position, volume}]
  
  -- Content analysis
  total_pages INTEGER,
  blog_post_count INTEGER,
  service_page_count INTEGER,
  location_page_count INTEGER,
  avg_content_length INTEGER,
  content_update_frequency TEXT,
  content_topics JSONB DEFAULT '[]',
  
  -- Technical
  site_speed_score INTEGER,
  mobile_score INTEGER,
  has_schema BOOLEAN,
  schema_types JSONB DEFAULT '[]',
  
  -- Strengths/Weaknesses (AI-analyzed)
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  opportunities_against JSONB DEFAULT '[]',
  
  -- SERP competition
  head_to_head_wins INTEGER DEFAULT 0,
  head_to_head_losses INTEGER DEFAULT 0,
  battleground_keywords JSONB DEFAULT '[]',
  
  -- AI Analysis
  ai_competitive_summary TEXT,
  ai_recommended_strategy TEXT,
  ai_priority_actions JSONB DEFAULT '[]',
  
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_competitor_per_site UNIQUE (site_id, competitor_domain)
);

CREATE INDEX IF NOT EXISTS idx_seo_competitors_site ON seo_competitor_analysis(site_id, is_active);

-- =====================================================
-- SEO AI ANALYSIS RUNS - Track each AI analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_ai_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- Analysis type
  analysis_type TEXT NOT NULL,            -- 'full_audit', 'quick_wins', 'page_optimize', 'keyword_strategy', etc.
  triggered_by TEXT,                      -- 'scheduled', 'manual', 'alert'
  triggered_by_user UUID REFERENCES contacts(id),
  
  -- Scope
  page_id UUID REFERENCES seo_pages(id),  -- If page-specific
  scope_description TEXT,
  
  -- Execution
  status TEXT DEFAULT 'running',          -- 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- AI Details
  ai_model TEXT,
  tokens_used INTEGER,
  cost_usd DECIMAL(6,4),
  
  -- Results summary
  recommendations_generated INTEGER DEFAULT 0,
  critical_issues_found INTEGER DEFAULT 0,
  quick_wins_found INTEGER DEFAULT 0,
  health_score INTEGER,
  
  -- Full results
  analysis_results JSONB,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_analysis_runs_site ON seo_ai_analysis_runs(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_analysis_runs_type ON seo_ai_analysis_runs(analysis_type, status);

-- =====================================================
-- SEO ALERTS - Automated monitoring alerts
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  
  -- Alert details
  alert_type TEXT NOT NULL,               -- 'ranking_drop', 'traffic_drop', 'technical_issue', 'competitor_gain', etc.
  severity TEXT DEFAULT 'warning',        -- 'critical', 'warning', 'info', 'opportunity'
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Context
  affected_keywords JSONB DEFAULT '[]',
  affected_pages JSONB DEFAULT '[]',
  metric_before DECIMAL(10,2),
  metric_after DECIMAL(10,2),
  change_percent DECIMAL(5,2),
  
  -- AI Analysis
  ai_analysis TEXT,
  ai_suggested_actions JSONB DEFAULT '[]',
  
  -- Status
  status TEXT DEFAULT 'active',           -- 'active', 'acknowledged', 'resolved', 'dismissed'
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES contacts(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Notification tracking
  notifications_sent JSONB DEFAULT '[]',  -- [{channel, sent_at}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_alerts_site ON seo_alerts(site_id, status);
CREATE INDEX IF NOT EXISTS idx_seo_alerts_severity ON seo_alerts(severity, status);

-- =====================================================
-- SEO CONTENT BRIEFS - AI-generated content briefs
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_content_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- Target
  target_keyword TEXT NOT NULL,
  content_type TEXT DEFAULT 'blog',       -- 'blog', 'service_page', 'landing_page', 'guide', 'case_study'
  status TEXT DEFAULT 'draft',            -- 'draft', 'approved', 'in_progress', 'published', 'archived'
  
  -- SEO Elements
  title_tag TEXT,
  meta_description TEXT,
  h1 TEXT,
  target_word_count INTEGER,
  search_intent TEXT,                     -- 'informational', 'commercial', 'transactional', 'navigational'
  
  -- Full Brief Content (JSON)
  brief_content JSONB DEFAULT '{}',       -- Full AI-generated brief
  
  -- Related Data
  related_keywords JSONB DEFAULT '[]',
  existing_page_url TEXT,
  existing_position DECIMAL(4,1),
  
  -- Assignment
  created_by UUID REFERENCES contacts(id),
  assigned_to UUID REFERENCES contacts(id),
  
  -- Completion
  published_url TEXT,
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_content_briefs_site ON seo_content_briefs(site_id, status);

-- Add comments for documentation
COMMENT ON TABLE seo_knowledge_base IS 'Stores deep business understanding for AI-powered SEO recommendations';
COMMENT ON TABLE seo_keyword_universe IS 'All tracked keywords with AI analysis and opportunity scoring';
COMMENT ON TABLE seo_content_gaps IS 'AI-identified missing content opportunities';
COMMENT ON TABLE seo_ai_recommendations IS 'Unified queue of AI-generated SEO recommendations';
COMMENT ON TABLE seo_competitor_analysis IS 'Competitor intelligence and gap analysis';
COMMENT ON TABLE seo_ai_analysis_runs IS 'Tracking for each AI analysis run';
COMMENT ON TABLE seo_alerts IS 'Automated SEO monitoring alerts';
COMMENT ON TABLE seo_content_briefs IS 'AI-generated content briefs for new content creation';
