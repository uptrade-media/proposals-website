-- Migration: 0039_unified_analytics.sql
-- Create unified analytics tables for all tenants
-- This allows tracking from any tenant site with centralized querying

-- ============================================
-- Analytics Page Views
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  org_id UUID,
  session_id TEXT,
  visitor_id TEXT,
  path TEXT NOT NULL,
  title TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_pv_tenant ON analytics_page_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_org ON analytics_page_views(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_created ON analytics_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_path ON analytics_page_views(path);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_visitor ON analytics_page_views(visitor_id);

-- ============================================
-- Analytics Events (generic events like clicks, conversions, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  org_id UUID,
  session_id TEXT,
  visitor_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  path TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_org ON analytics_events(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);

-- ============================================
-- Analytics Scroll Depth
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_scroll_depth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  org_id UUID,
  session_id TEXT,
  path TEXT NOT NULL,
  depth INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_scroll_tenant ON analytics_scroll_depth(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_scroll_org ON analytics_scroll_depth(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_scroll_created ON analytics_scroll_depth(created_at);

-- ============================================
-- Analytics Sessions
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  org_id UUID,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  page_count INTEGER DEFAULT 0,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_tenant ON analytics_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_org ON analytics_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_created ON analytics_sessions(created_at);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_scroll_depth ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for tracking)
CREATE POLICY analytics_pv_service ON analytics_page_views FOR ALL USING (true);
CREATE POLICY analytics_events_service ON analytics_events FOR ALL USING (true);
CREATE POLICY analytics_scroll_service ON analytics_scroll_depth FOR ALL USING (true);
CREATE POLICY analytics_sessions_service ON analytics_sessions FOR ALL USING (true);

-- ============================================
-- Helper function to get analytics summary
-- ============================================
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_tenant_id TEXT DEFAULT NULL,
  p_org_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
  result JSON;
BEGIN
  WITH pv_stats AS (
    SELECT 
      COUNT(*) as page_views,
      COUNT(DISTINCT visitor_id) as unique_visitors,
      COUNT(DISTINCT session_id) as sessions
    FROM analytics_page_views
    WHERE created_at >= start_date
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
      AND (p_org_id IS NULL OR org_id = p_org_id)
  ),
  event_stats AS (
    SELECT COUNT(*) as total_events
    FROM analytics_events
    WHERE created_at >= start_date
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
      AND (p_org_id IS NULL OR org_id = p_org_id)
  )
  SELECT json_build_object(
    'pageViews', pv.page_views,
    'uniqueVisitors', pv.unique_visitors,
    'sessions', pv.sessions,
    'events', e.total_events,
    'period', json_build_object(
      'days', p_days,
      'startDate', start_date
    )
  ) INTO result
  FROM pv_stats pv, event_stats e;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
