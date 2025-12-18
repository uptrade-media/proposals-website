-- Migration: SEO AI Learning & Outcome Tracking
-- Enables the AI to learn from wins and losses over time
-- Run in Supabase Dashboard SQL Editor

-- =====================================================
-- RECOMMENDATION OUTCOMES - Track what happened after implementation
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_ai_recommendation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES seo_ai_recommendations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  
  -- What was the recommendation about?
  category TEXT NOT NULL,                  -- 'title', 'meta', 'content', 'technical', etc.
  change_type TEXT,                        -- 'title_rewrite', 'meta_added', 'content_expanded', etc.
  
  -- Before/After snapshots
  before_value TEXT,
  after_value TEXT,
  implemented_at TIMESTAMPTZ NOT NULL,
  
  -- Keyword tracking (if applicable)
  target_keyword TEXT,
  keyword_position_before DECIMAL(5,2),
  keyword_position_after DECIMAL(5,2),
  keyword_position_change DECIMAL(5,2),    -- Positive = improved
  
  -- Traffic impact (30 days after implementation)
  clicks_before_30d INTEGER,               -- 30 days before implementation
  clicks_after_30d INTEGER,                -- 30 days after implementation  
  clicks_change_pct DECIMAL(6,2),
  
  impressions_before_30d INTEGER,
  impressions_after_30d INTEGER,
  impressions_change_pct DECIMAL(6,2),
  
  ctr_before DECIMAL(6,4),
  ctr_after DECIMAL(6,4),
  ctr_change_pct DECIMAL(6,2),
  
  -- Overall outcome
  outcome TEXT,                            -- 'win', 'loss', 'neutral', 'pending'
  outcome_score INTEGER,                   -- -100 to +100, calculated
  outcome_confidence DECIMAL(3,2),         -- How confident are we in this measurement
  
  -- Measured at
  measured_at TIMESTAMPTZ,
  days_since_implementation INTEGER,
  
  -- AI Learning
  fed_to_ai BOOLEAN DEFAULT false,         -- Has this been included in AI context?
  ai_analysis TEXT,                        -- AI's interpretation of why this worked/didn't
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outcomes_recommendation ON seo_ai_recommendation_outcomes(recommendation_id);
CREATE INDEX idx_outcomes_site ON seo_ai_recommendation_outcomes(site_id);
CREATE INDEX idx_outcomes_outcome ON seo_ai_recommendation_outcomes(outcome);
CREATE INDEX idx_outcomes_category ON seo_ai_recommendation_outcomes(category, outcome);
CREATE INDEX idx_outcomes_fed ON seo_ai_recommendation_outcomes(fed_to_ai) WHERE fed_to_ai = false;

-- =====================================================
-- AI LEARNING PATTERNS - Aggregate wins/losses by pattern
-- What types of changes work best for this site/industry?
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_ai_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  
  -- Pattern identification
  pattern_type TEXT NOT NULL,              -- 'title_length', 'cta_in_meta', 'keyword_placement', etc.
  pattern_description TEXT,
  
  -- Aggregated stats
  total_implementations INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  neutral INTEGER DEFAULT 0,
  
  win_rate DECIMAL(5,2),                   -- Calculated: wins / total * 100
  avg_position_impact DECIMAL(5,2),        -- Average position change
  avg_traffic_impact DECIMAL(6,2),         -- Average traffic change %
  
  -- Pattern details
  examples JSONB DEFAULT '[]',             -- [{before, after, outcome, impact}]
  best_performing_example JSONB,           -- The most successful implementation
  
  -- AI guidance
  ai_recommendation TEXT,                  -- AI-generated guidance based on this pattern
  confidence_level TEXT,                   -- 'high', 'medium', 'low' based on sample size
  
  -- Industry/vertical patterns (for cross-site learning)
  industry TEXT,
  is_industry_pattern BOOLEAN DEFAULT false,
  
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_site ON seo_ai_learning_patterns(site_id);
CREATE INDEX idx_patterns_type ON seo_ai_learning_patterns(pattern_type);
CREATE INDEX idx_patterns_win_rate ON seo_ai_learning_patterns(win_rate DESC);
CREATE UNIQUE INDEX idx_patterns_unique ON seo_ai_learning_patterns(site_id, pattern_type);

-- =====================================================
-- AI WINS KNOWLEDGE BASE - Best practices learned
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_ai_wins_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,  -- NULL = global pattern
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  industry TEXT,
  
  -- The insight
  insight_type TEXT NOT NULL,              -- 'title_pattern', 'meta_pattern', 'content_structure', etc.
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  
  -- Evidence
  supporting_outcomes INTEGER DEFAULT 0,   -- How many outcomes support this
  avg_impact_score DECIMAL(5,2),
  confidence DECIMAL(3,2),
  
  -- The actual pattern/template
  pattern_template TEXT,                   -- e.g., "[Primary Keyword] - [Benefit] | [Brand]"
  pattern_examples JSONB DEFAULT '[]',
  
  -- Usage
  times_recommended INTEGER DEFAULT 0,
  times_implemented INTEGER DEFAULT 0,
  success_when_followed DECIMAL(5,2),      -- Win rate when this insight is applied
  
  -- AI metadata
  generated_by_ai BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wins_knowledge_site ON seo_ai_wins_knowledge(site_id);
CREATE INDEX idx_wins_knowledge_industry ON seo_ai_wins_knowledge(industry);
CREATE INDEX idx_wins_knowledge_type ON seo_ai_wins_knowledge(insight_type);
CREATE INDEX idx_wins_knowledge_confidence ON seo_ai_wins_knowledge(confidence DESC);

-- =====================================================
-- Add tracking columns to recommendations
-- =====================================================
ALTER TABLE seo_ai_recommendations
  ADD COLUMN IF NOT EXISTS outcome_tracked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS outcome_id UUID REFERENCES seo_ai_recommendation_outcomes(id),
  ADD COLUMN IF NOT EXISTS based_on_pattern UUID REFERENCES seo_ai_learning_patterns(id);

-- =====================================================
-- Function to calculate outcome score
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_outcome_score(
  position_change DECIMAL,
  clicks_change_pct DECIMAL,
  impressions_change_pct DECIMAL,
  ctr_change_pct DECIMAL
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Position improvement (negative is better, so we flip it)
  IF position_change IS NOT NULL THEN
    score := score + LEAST(50, GREATEST(-50, -position_change * 10))::INTEGER;
  END IF;
  
  -- Traffic impact
  IF clicks_change_pct IS NOT NULL THEN
    score := score + LEAST(30, GREATEST(-30, clicks_change_pct * 0.3))::INTEGER;
  END IF;
  
  -- CTR impact
  IF ctr_change_pct IS NOT NULL THEN
    score := score + LEAST(20, GREATEST(-20, ctr_change_pct * 0.5))::INTEGER;
  END IF;
  
  RETURN LEAST(100, GREATEST(-100, score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE seo_ai_recommendation_outcomes IS 'Tracks the actual impact of implemented recommendations';
COMMENT ON TABLE seo_ai_learning_patterns IS 'Aggregated patterns of what works for each site';
COMMENT ON TABLE seo_ai_wins_knowledge IS 'Best practices learned from successful implementations';

COMMENT ON COLUMN seo_ai_recommendation_outcomes.outcome IS 'win = meaningful improvement, loss = got worse, neutral = no significant change';
COMMENT ON COLUMN seo_ai_learning_patterns.pattern_type IS 'E.g., title_with_numbers, meta_with_cta, h1_matches_title';
