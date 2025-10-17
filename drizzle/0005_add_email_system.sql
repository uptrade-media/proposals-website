-- Migration: Add Email System Tables
-- Unified email system for one-offs, follow-ups, and newsletters

-- Lists for email audiences
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact-to-list mapping
CREATE TABLE IF NOT EXISTS contact_list (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (contact_id, list_id)
);

-- Mailboxes for sending
CREATE TABLE IF NOT EXISTS mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL UNIQUE,
  reply_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT,
  headers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns (one-off or newsletter)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('one_off', 'newsletter')),
  name TEXT NOT NULL,
  mailbox_id UUID NOT NULL REFERENCES mailboxes(id),
  template_id UUID REFERENCES templates(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'paused', 'done')),
  scheduled_start TIMESTAMP WITH TIME ZONE,
  window_start_local INTEGER DEFAULT 9,
  window_end_local INTEGER DEFAULT 17,
  daily_cap INTEGER DEFAULT 1000,
  warmup_percent INTEGER DEFAULT 100,
  preheader TEXT,
  ab_test_enabled BOOLEAN DEFAULT false,
  ab_split_percent INTEGER DEFAULT 50,
  ab_metric TEXT CHECK (ab_metric IN ('open', 'click')),
  ab_evaluation_window_hours INTEGER,
  resend_to_non_openers BOOLEAN DEFAULT false,
  resend_delay_days INTEGER,
  resend_subject TEXT,
  goal_url TEXT,
  view_in_browser_enabled BOOLEAN DEFAULT false,
  utm_preset TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign steps (for one-off follow-ups: F1, F2, F3)
CREATE TABLE IF NOT EXISTS campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,
  subject_override TEXT,
  html_override TEXT,
  text_override TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, step_index)
);

-- Campaign audiences (for newsletters)
CREATE TABLE IF NOT EXISTS campaign_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  lists JSONB,
  tags JSONB,
  saved_segment_ref TEXT,
  computed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipients
CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  step_index INTEGER,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'scheduled', 'sent', 'failed', 'suppressed', 'canceled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  message_id TEXT,
  unsubscribe_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events (sent, delivered, open, click, bounce, etc.)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sent', 'delivered', 'open', 'click', 'bounce', 'complaint', 'unsubscribe', 'reply', 'goal')),
  provider_id TEXT,
  url TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppressions (unsubscribe, bounce, complaint)
CREATE TABLE IF NOT EXISTS suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint', 'manual')),
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archives (newsletter view-in-browser)
CREATE TABLE IF NOT EXISTS archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  public_url TEXT NOT NULL UNIQUE,
  published_at TIMESTAMP WITH TIME ZONE,
  title TEXT,
  teaser_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_list_contact ON contact_list(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_list_list ON contact_list(list_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_mailbox ON campaigns(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_template ON campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_steps_campaign ON campaign_steps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_audiences_campaign ON campaign_audiences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_contact ON recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON recipients(status);
CREATE INDEX IF NOT EXISTS idx_recipients_scheduled_at ON recipients(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_events_recipient ON events(recipient_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_suppressions_email ON suppressions(email);
