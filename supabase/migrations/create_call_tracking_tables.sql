-- ========================================
-- OpenPhone Call Tracking Tables
-- Run this in Supabase SQL Editor
-- ========================================

-- Call Logs - main table for call records
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- OpenPhone identifiers
  openphone_call_id TEXT UNIQUE,
  openphone_conversation_id TEXT,
  
  -- Call details
  phone_number TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('incoming', 'outgoing')),
  status TEXT DEFAULT 'pending', -- pending, completed, missed, voicemail
  duration INTEGER, -- seconds
  recording_url TEXT,
  
  -- Contact matching
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  matched_by TEXT, -- phone_number, ai_extraction, manual
  
  -- Pre-call intent (from CRM click-to-call)
  call_intent TEXT,
  pre_call_notes TEXT,
  initiated_by UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Admin who initiated
  initiated_at TIMESTAMPTZ,
  
  -- Handled by (OpenPhone user)
  handled_by TEXT,
  
  -- OpenPhone AI data
  openphone_transcript TEXT,
  openphone_summary TEXT,
  
  -- Our AI analysis
  ai_summary TEXT,
  ai_key_points JSONB DEFAULT '[]',
  sentiment TEXT, -- positive, neutral, negative
  conversation_type TEXT, -- sales, support, follow_up, etc.
  lead_quality_score INTEGER CHECK (lead_quality_score >= 0 AND lead_quality_score <= 100),
  
  -- Processing status
  processing_status TEXT DEFAULT 'pending', -- pending, awaiting_call, processing, completed, failed
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Tasks - extracted action items from calls
CREATE TABLE IF NOT EXISTS call_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT, -- follow_up, send_proposal, schedule_meeting, etc.
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to TEXT, -- OpenPhone user ID or admin ID
  
  -- AI confidence
  ai_confidence NUMERIC(3,2), -- 0.00 to 1.00
  ai_reasoning TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Topics - topics discussed in calls
CREATE TABLE IF NOT EXISTS call_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  
  topic TEXT NOT NULL,
  relevance_score NUMERIC(3,2), -- 0.00 to 1.00
  sentiment TEXT, -- positive, neutral, negative
  key_phrases JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Follow-ups - scheduled follow-up actions
CREATE TABLE IF NOT EXISTS call_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  follow_up_type TEXT NOT NULL, -- email, call, meeting, task
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  
  suggested_subject TEXT,
  suggested_message TEXT,
  
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Contact Extractions - AI-extracted contact info
CREATE TABLE IF NOT EXISTS call_contact_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  
  extracted_name TEXT,
  extracted_company TEXT,
  extracted_title TEXT,
  extracted_email TEXT,
  extracted_phone TEXT,
  extracted_website TEXT,
  
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  match_status TEXT DEFAULT 'pending', -- pending, matched, created, ignored
  matched_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  auto_created_contact BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_contact_id ON call_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone_number ON call_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_openphone_call_id ON call_logs(openphone_call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);

CREATE INDEX IF NOT EXISTS idx_call_tasks_call_log_id ON call_tasks(call_log_id);
CREATE INDEX IF NOT EXISTS idx_call_tasks_contact_id ON call_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_tasks_status ON call_tasks(status);
CREATE INDEX IF NOT EXISTS idx_call_tasks_due_date ON call_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_call_topics_call_log_id ON call_topics(call_log_id);

CREATE INDEX IF NOT EXISTS idx_call_follow_ups_call_log_id ON call_follow_ups(call_log_id);
CREATE INDEX IF NOT EXISTS idx_call_follow_ups_contact_id ON call_follow_ups(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_follow_ups_status ON call_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_call_follow_ups_scheduled_for ON call_follow_ups(scheduled_for);

-- RPC function to update contact call stats
CREATE OR REPLACE FUNCTION update_contact_call_stats(
  p_contact_id UUID,
  p_duration INTEGER,
  p_sentiment TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE contacts
  SET 
    total_calls = COALESCE(total_calls, 0) + 1,
    total_call_duration = COALESCE(total_call_duration, 0) + COALESCE(p_duration, 0),
    average_call_duration = (COALESCE(total_call_duration, 0) + COALESCE(p_duration, 0)) / (COALESCE(total_calls, 0) + 1),
    last_call_date = NOW(),
    last_call_sentiment = COALESCE(p_sentiment, last_call_sentiment),
    first_call_date = COALESCE(first_call_date, NOW()),
    updated_at = NOW()
  WHERE id = p_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_contact_extractions ENABLE ROW LEVEL SECURITY;

-- Policies for service role (admin access via functions)
CREATE POLICY "Service role full access on call_logs" ON call_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on call_tasks" ON call_tasks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on call_topics" ON call_topics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on call_follow_ups" ON call_follow_ups
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on call_contact_extractions" ON call_contact_extractions
  FOR ALL USING (true) WITH CHECK (true);

-- Contact activities table (if not exists)
CREATE TABLE IF NOT EXISTS contact_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL, -- call_initiated, email_sent, proposal_created, note_added, etc.
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  performed_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_activities_contact_id ON contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_created_at ON contact_activities(created_at DESC);

ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on contact_activities" ON contact_activities
  FOR ALL USING (true) WITH CHECK (true);
