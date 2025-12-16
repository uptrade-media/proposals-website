-- Known Visitor Tracking & Lead Scoring Schema
-- Run this migration in Supabase SQL Editor

-- Table to link anonymous visitor IDs to known contacts
CREATE TABLE IF NOT EXISTS known_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL UNIQUE,  -- The anonymous session/visitor ID from main site
  identified_at TIMESTAMPTZ DEFAULT NOW(),
  identified_via TEXT,  -- 'audit_view', 'proposal_view', 'magic_link', 'form_submit'
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  total_page_views INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_known_visitors_contact ON known_visitors(contact_id);
CREATE INDEX idx_known_visitors_visitor ON known_visitors(visitor_id);

-- Table to track page views by known visitors
CREATE TABLE IF NOT EXISTS known_visitor_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  session_id TEXT,
  event_type TEXT DEFAULT 'page_view',  -- 'page_view', 'scroll', 'click', 'form_submit'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_known_activity_contact ON known_visitor_activity(contact_id);
CREATE INDEX idx_known_activity_created ON known_visitor_activity(created_at DESC);
CREATE INDEX idx_known_activity_visitor ON known_visitor_activity(visitor_id);

-- Lead scores table (cached scores with history)
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE UNIQUE,
  total_score INTEGER DEFAULT 0,  -- 0-100 likelihood to close
  
  -- Component scores (each 0-100)
  call_score INTEGER DEFAULT 0,
  email_score INTEGER DEFAULT 0,
  website_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  recency_score INTEGER DEFAULT 0,
  
  -- Contributing factors (JSONB for flexibility)
  factors JSONB DEFAULT '{}',
  
  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  score_trend TEXT DEFAULT 'stable',  -- 'rising', 'falling', 'stable'
  previous_score INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_scores_contact ON lead_scores(contact_id);
CREATE INDEX idx_lead_scores_total ON lead_scores(total_score DESC);

-- Smart notifications table
CREATE TABLE IF NOT EXISTS smart_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'hot_lead_callback', 'proposal_engagement', 'overdue_followup', 'website_visit', 'score_spike'
  priority TEXT DEFAULT 'normal',  -- 'urgent', 'high', 'normal', 'low'
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Status
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  action_taken TEXT,
  
  -- Targeting (null = all admins)
  target_user_id UUID REFERENCES contacts(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ  -- Auto-expire notifications
);

CREATE INDEX idx_smart_notif_contact ON smart_notifications(contact_id);
CREATE INDEX idx_smart_notif_unread ON smart_notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_smart_notif_priority ON smart_notifications(priority, created_at DESC);
CREATE INDEX idx_smart_notif_type ON smart_notifications(type);

-- Add lead_score column to contacts for quick access
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_score_updated_at TIMESTAMPTZ;

-- Create index for lead score sorting
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score DESC);
