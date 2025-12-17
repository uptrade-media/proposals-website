-- Migration: 0026_seo_advanced_features.sql
-- Advanced SEO AI Brain features: Cannibalization, Clustering, SERP Features, Title A/B Testing, Predictive Ranking

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
  competing_pages JSONB NOT NULL DEFAULT '[]', -- [{page_id, url, title, current_position, impressions, clicks, ctr}]
  page_count INTEGER DEFAULT 0,
  
  -- Impact analysis
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  position_variance DECIMAL(5,2),       -- How much positions vary between pages
  ctr_loss_estimate DECIMAL(5,2),       -- Estimated CTR lost due to cannibalization
  
  -- AI recommendation
  recommended_primary_page_id UUID REFERENCES seo_pages(id),
  recommended_primary_url TEXT,
  ai_strategy TEXT,                      -- 'consolidate', 'differentiate', 'canonicalize', 'deindex'
  ai_reasoning TEXT,
  ai_action_steps JSONB DEFAULT '[]',
  
  -- Priority/Status
  severity TEXT DEFAULT 'medium',        -- 'critical', 'high', 'medium', 'low'
  estimated_traffic_loss INTEGER,
  status TEXT DEFAULT 'detected',        -- 'detected', 'planned', 'in_progress', 'resolved', 'dismissed'
  
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
  
  -- Cluster identity
  cluster_name TEXT NOT NULL,
  cluster_slug TEXT,
  description TEXT,
  
  -- Pillar page
  pillar_page_id UUID REFERENCES seo_pages(id),
  pillar_url TEXT,
  pillar_status TEXT DEFAULT 'not_started', -- 'not_started', 'draft', 'published', 'needs_update'
  
  -- Keywords in cluster
  primary_keyword TEXT,                   -- Main keyword for pillar
  keywords JSONB DEFAULT '[]',            -- All keywords in cluster
  keyword_count INTEGER DEFAULT 0,
  total_search_volume INTEGER DEFAULT 0,
  avg_difficulty INTEGER,
  
  -- Cluster pages (supporting content)
  cluster_pages JSONB DEFAULT '[]',       -- [{page_id, url, title, target_keyword, status, internal_links_to_pillar}]
  page_count INTEGER DEFAULT 0,
  
  -- Coverage analysis
  topics_covered JSONB DEFAULT '[]',
  topics_missing JSONB DEFAULT '[]',
  coverage_score INTEGER DEFAULT 0,       -- 0-100
  
  -- Internal linking health
  pillar_incoming_links INTEGER DEFAULT 0,
  pillar_outgoing_links INTEGER DEFAULT 0,
  cluster_interlinks INTEGER DEFAULT 0,   -- Links between cluster pages
  link_score INTEGER DEFAULT 0,           -- 0-100
  
  -- Performance
  total_traffic INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  avg_position DECIMAL(5,2),
  
  -- AI recommendations
  ai_suggested_topics JSONB DEFAULT '[]', -- Topics to create
  ai_link_suggestions JSONB DEFAULT '[]', -- Internal link improvements
  ai_content_gaps JSONB DEFAULT '[]',     -- Content gaps in cluster
  ai_priority TEXT DEFAULT 'medium',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_clusters_site ON seo_topic_clusters(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_clusters_pillar ON seo_topic_clusters(pillar_page_id);

-- =====================================================
-- SEO SERP FEATURES - Track and target SERP features
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_serp_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  
  -- The query
  keyword TEXT NOT NULL,
  keyword_hash TEXT NOT NULL,
  search_volume INTEGER,
  
  -- SERP feature type
  feature_type TEXT NOT NULL,             -- 'featured_snippet', 'faq', 'local_pack', 'video', 'image_pack', 'knowledge_panel', 'people_also_ask'
  
  -- Our status
  we_have_feature BOOLEAN DEFAULT false,
  current_owner TEXT,                     -- Domain that currently has it
  our_position INTEGER,                   -- Our organic position
  
  -- Opportunity analysis
  opportunity_score INTEGER DEFAULT 0,    -- 0-100, based on position and feasibility
  win_probability TEXT,                   -- 'high', 'medium', 'low'
  
  -- How to win it
  ai_strategy TEXT,
  ai_required_changes JSONB DEFAULT '[]', -- [{type, description, effort}]
  content_requirements JSONB,             -- What content changes needed
  schema_requirements JSONB,              -- What schema markup needed
  
  -- Status
  status TEXT DEFAULT 'opportunity',      -- 'opportunity', 'targeting', 'won', 'lost', 'not_feasible'
  targeting_started_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,
  
  -- For PAA specifically
  questions JSONB DEFAULT '[]',           -- People Also Ask questions
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_serp_feature UNIQUE (site_id, keyword_hash, feature_type)
);

CREATE INDEX IF NOT EXISTS idx_seo_serp_features_site ON seo_serp_features(site_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_seo_serp_features_opportunity ON seo_serp_features(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_seo_serp_features_page ON seo_serp_features(page_id);

-- =====================================================
-- SEO TITLE A/B TESTS - Test and optimize titles
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_title_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES seo_pages(id) ON DELETE CASCADE,
  
  -- The page
  url TEXT NOT NULL,
  original_title TEXT NOT NULL,
  
  -- Test variants
  variants JSONB NOT NULL DEFAULT '[]',   -- [{variant_id, title, hypothesis, started_at, ended_at}]
  current_variant_index INTEGER DEFAULT 0,
  
  -- Test configuration
  test_duration_days INTEGER DEFAULT 14,
  min_impressions_per_variant INTEGER DEFAULT 500,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.95,
  
  -- Current status
  status TEXT DEFAULT 'draft',            -- 'draft', 'running', 'paused', 'completed', 'cancelled'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Baseline metrics (before test)
  baseline_impressions INTEGER,
  baseline_clicks INTEGER,
  baseline_ctr DECIMAL(5,4),
  baseline_position DECIMAL(5,2),
  baseline_period_days INTEGER DEFAULT 28,
  
  -- Results
  winning_variant_index INTEGER,
  winning_title TEXT,
  best_ctr DECIMAL(5,4),
  ctr_improvement DECIMAL(5,4),
  statistical_significance DECIMAL(4,3),
  
  -- Variant performance data
  variant_results JSONB DEFAULT '[]',     -- [{variant_index, impressions, clicks, ctr, position, confidence}]
  
  -- AI-generated variants
  ai_generated BOOLEAN DEFAULT false,
  ai_generation_prompt TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_title_tests_site ON seo_title_tests(site_id, status);
CREATE INDEX IF NOT EXISTS idx_seo_title_tests_page ON seo_title_tests(page_id);

-- =====================================================
-- SEO PREDICTIVE SCORING - Predict ranking potential
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_predictive_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  
  -- What we're predicting for
  url TEXT,
  target_keyword TEXT,
  
  -- Current state
  current_position DECIMAL(5,2),
  current_content_score INTEGER,
  current_technical_score INTEGER,
  current_authority_score INTEGER,
  
  -- Predictions
  predicted_position DECIMAL(5,2),
  predicted_traffic INTEGER,
  prediction_confidence DECIMAL(3,2),
  
  -- What would move the needle
  improvement_factors JSONB DEFAULT '[]', -- [{factor, current, suggested, impact_score, predicted_position_after}]
  
  -- Top recommendations with predictions
  if_add_words JSONB,                     -- {words_to_add, predicted_position, predicted_traffic}
  if_add_internal_links JSONB,            -- {links_to_add, predicted_position}
  if_improve_speed JSONB,                 -- {lcp_target, predicted_position}
  if_add_backlinks JSONB,                 -- {links_needed, predicted_position}
  if_update_title JSONB,                  -- {suggested_title, predicted_ctr}
  
  -- Model details
  model_version TEXT DEFAULT 'v1',
  model_inputs JSONB,                     -- Features used for prediction
  model_weights JSONB,                    -- Feature weights applied
  
  -- For draft content
  is_draft BOOLEAN DEFAULT false,
  draft_content_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_predictive_site ON seo_predictive_scores(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_predictive_page ON seo_predictive_scores(page_id);

-- =====================================================
-- SEO PAGE SPEED CORRELATION - Technical SEO impact
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
  speed_ranking_correlation DECIMAL(4,3),  -- -1 to 1, where negative means slower = lower rank
  estimated_position_if_fast DECIMAL(5,2), -- Predicted position if CWV optimized
  
  -- Impact projection
  traffic_lost_to_speed INTEGER,
  potential_traffic_gain INTEGER,
  priority_score INTEGER DEFAULT 0,        -- 0-100, based on traffic impact
  
  -- Recommendations
  speed_issues JSONB DEFAULT '[]',         -- [{issue, impact, fix, effort}]
  estimated_fix_hours DECIMAL(4,1),
  
  -- Historical for correlation
  speed_history JSONB DEFAULT '[]',        -- [{date, lcp, position, traffic}]
  
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_pagespeed_site ON seo_pagespeed_impact(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_pagespeed_priority ON seo_pagespeed_impact(priority_score DESC);

-- =====================================================
-- Add managed columns to seo_pages if not exists
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'cannibalization_risk') THEN
    ALTER TABLE seo_pages ADD COLUMN cannibalization_risk BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'cluster_id') THEN
    ALTER TABLE seo_pages ADD COLUMN cluster_id UUID REFERENCES seo_topic_clusters(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'predictive_score') THEN
    ALTER TABLE seo_pages ADD COLUMN predictive_score INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'serp_features_owned') THEN
    ALTER TABLE seo_pages ADD COLUMN serp_features_owned JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_pages' AND column_name = 'active_title_test_id') THEN
    ALTER TABLE seo_pages ADD COLUMN active_title_test_id UUID REFERENCES seo_title_tests(id);
  END IF;
END $$;

-- Add column to keyword universe for cluster association
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_keyword_universe' AND column_name = 'cluster_id') THEN
    ALTER TABLE seo_keyword_universe ADD COLUMN cluster_id UUID REFERENCES seo_topic_clusters(id);
  END IF;
END $$;
