-- ============================================
-- MIGRATION 0019: Email Marketing Platform
-- Multi-tenant newsletter & automation system
-- ============================================

-- ============================================
-- 1. TENANT EMAIL SETTINGS
-- Each tenant/org stores their Resend API key and branding
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, -- References the project/tenant
  
  -- Resend Configuration
  resend_api_key TEXT, -- Encrypted in production
  resend_api_key_valid BOOLEAN DEFAULT FALSE,
  resend_domain TEXT, -- e.g., "send.clientdomain.com"
  
  -- Sender Defaults
  default_from_name TEXT NOT NULL DEFAULT 'Newsletter',
  default_from_email TEXT NOT NULL,
  default_reply_to TEXT,
  
  -- Branding
  brand_color TEXT DEFAULT '#4F46E5',
  brand_secondary_color TEXT DEFAULT '#10B981',
  logo_url TEXT,
  footer_text TEXT,
  business_address TEXT, -- Required for CAN-SPAM
  
  -- Tracking
  track_opens BOOLEAN DEFAULT TRUE,
  track_clicks BOOLEAN DEFAULT TRUE,
  custom_tracking_domain TEXT, -- e.g., "track.clientdomain.com"
  
  -- Limits
  daily_send_limit INTEGER DEFAULT 1000,
  monthly_send_limit INTEGER DEFAULT 50000,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id)
);

-- ============================================
-- 2. EMAIL SUBSCRIBERS
-- Subscribers for each tenant's email lists
-- ============================================
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Subscriber Info
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Custom Fields (flexible schema)
  custom_fields JSONB DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained', 'cleaned')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_reason TEXT,
  
  -- Source tracking
  source TEXT, -- 'import', 'form', 'api', 'manual'
  source_details JSONB, -- { formId, importId, etc }
  
  -- Engagement metrics
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMPTZ,
  last_email_opened_at TIMESTAMPTZ,
  last_email_clicked_at TIMESTAMPTZ,
  
  -- Tags for segmentation
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_org ON email_subscribers(org_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(org_id, status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_tags ON email_subscribers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);

-- ============================================
-- 3. EMAIL LISTS
-- Subscriber lists/audiences for segmentation
-- ============================================
CREATE TABLE IF NOT EXISTS email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Type
  type TEXT DEFAULT 'manual' CHECK (type IN ('manual', 'dynamic')),
  
  -- For dynamic lists: segment rules
  segment_rules JSONB, -- { conditions: [...], match: 'all' | 'any' }
  
  -- Counts (cached, updated periodically)
  subscriber_count INTEGER DEFAULT 0,
  active_count INTEGER DEFAULT 0,
  
  -- Settings
  double_optin BOOLEAN DEFAULT FALSE,
  welcome_email_enabled BOOLEAN DEFAULT FALSE,
  welcome_automation_id UUID, -- Links to email_automations
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_lists_org ON email_lists(org_id);

-- ============================================
-- 4. LIST SUBSCRIBERS (Many-to-Many)
-- Links subscribers to lists
-- ============================================
CREATE TABLE IF NOT EXISTS email_list_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES email_subscribers(id) ON DELETE CASCADE,
  
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by TEXT, -- 'import', 'form', 'manual', 'automation'
  
  UNIQUE(list_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_list_subscribers_list ON email_list_subscribers(list_id);
CREATE INDEX IF NOT EXISTS idx_list_subscribers_subscriber ON email_list_subscribers(subscriber_id);

-- ============================================
-- 5. EMAIL TEMPLATES
-- Reusable email templates built with GrapesJS
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template content
  subject TEXT,
  preheader TEXT,
  
  -- GrapesJS data
  grapesjs_data JSONB, -- Full GrapesJS project JSON
  html_content TEXT, -- Compiled HTML output
  text_content TEXT, -- Plain text version
  
  -- Preview
  thumbnail_url TEXT,
  
  -- Categorization
  category TEXT DEFAULT 'general', -- 'welcome', 'newsletter', 'promotional', 'transactional'
  
  -- Status
  is_system BOOLEAN DEFAULT FALSE, -- System templates can't be deleted
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(org_id, category);

-- ============================================
-- 6. EMAIL CAMPAIGNS
-- One-time or scheduled email sends
-- ============================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  
  -- Content
  template_id UUID REFERENCES email_templates(id),
  subject TEXT NOT NULL,
  subject_b TEXT, -- For A/B testing
  preheader TEXT,
  
  -- GrapesJS data (if customized from template)
  grapesjs_data JSONB,
  html_content TEXT,
  text_content TEXT,
  
  -- Sender
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  
  -- Audience
  list_ids UUID[] DEFAULT '{}',
  segment_rules JSONB, -- Additional filtering
  excluded_list_ids UUID[] DEFAULT '{}',
  
  -- Scheduling
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed')),
  scheduled_for TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC',
  
  -- A/B Testing
  ab_test_enabled BOOLEAN DEFAULT FALSE,
  ab_test_type TEXT CHECK (ab_test_type IN ('subject', 'content', 'sender')),
  ab_split_percent INTEGER DEFAULT 50,
  ab_winner_criteria TEXT DEFAULT 'open_rate', -- 'open_rate', 'click_rate'
  ab_wait_hours INTEGER DEFAULT 4,
  ab_winner_selected BOOLEAN DEFAULT FALSE,
  ab_winner TEXT, -- 'a' or 'b'
  
  -- Send stats (cached)
  total_recipients INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  unique_opens INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_complained INTEGER DEFAULT 0,
  emails_unsubscribed INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- UTM tracking
  utm_source TEXT DEFAULT 'email',
  utm_medium TEXT DEFAULT 'newsletter',
  utm_campaign TEXT,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_org ON email_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(org_id, status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON email_campaigns(scheduled_for) WHERE status = 'scheduled';

-- ============================================
-- 7. CAMPAIGN SENDS
-- Individual email sends for a campaign
-- ============================================
CREATE TABLE IF NOT EXISTS email_campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES email_subscribers(id) ON DELETE CASCADE,
  
  -- Resend tracking
  resend_email_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')),
  
  -- A/B variant
  ab_variant TEXT, -- 'a' or 'b'
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  clicked_links JSONB DEFAULT '[]', -- Array of clicked URLs
  bounced_at TIMESTAMPTZ,
  bounce_type TEXT, -- 'hard' or 'soft'
  complained_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON email_campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_subscriber ON email_campaign_sends(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON email_campaign_sends(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_resend ON email_campaign_sends(resend_email_id);

-- ============================================
-- 8. EMAIL AUTOMATIONS
-- Triggered email sequences (welcome, abandoned cart, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger
  trigger_type TEXT NOT NULL 
    CHECK (trigger_type IN (
      'subscriber_added',      -- When someone subscribes
      'tag_added',             -- When a tag is added
      'tag_removed',           -- When a tag is removed
      'date_field',            -- Based on a date (birthday, anniversary)
      'form_submitted',        -- When a specific form is submitted
      'campaign_opened',       -- When a specific campaign is opened
      'campaign_clicked',      -- When a campaign link is clicked
      'manual'                 -- Manually triggered via API
    )),
  trigger_config JSONB, -- { listId, tagName, dateField, formId, campaignId, etc. }
  
  -- Settings
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  
  -- Audience restrictions
  list_ids UUID[] DEFAULT '{}', -- Only run for subscribers in these lists
  
  -- Stats (cached)
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_active INTEGER DEFAULT 0,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_automations_org ON email_automations(org_id);
CREATE INDEX IF NOT EXISTS idx_email_automations_status ON email_automations(org_id, status);
CREATE INDEX IF NOT EXISTS idx_email_automations_trigger ON email_automations(trigger_type) WHERE status = 'active';

-- ============================================
-- 9. AUTOMATION STEPS
-- Individual steps in an automation sequence
-- ============================================
CREATE TABLE IF NOT EXISTS email_automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES email_automations(id) ON DELETE CASCADE,
  
  -- Ordering
  step_order INTEGER NOT NULL,
  
  -- Step type
  step_type TEXT NOT NULL 
    CHECK (step_type IN (
      'email',           -- Send an email
      'delay',           -- Wait for a time period
      'condition',       -- If/then branching
      'add_tag',         -- Add a tag to subscriber
      'remove_tag',      -- Remove a tag
      'move_to_list',    -- Add to another list
      'remove_from_list',-- Remove from list
      'webhook',         -- Call external webhook
      'end'              -- End the automation
    )),
  
  -- Step configuration (varies by type)
  config JSONB NOT NULL,
  -- For 'email': { templateId, subject, fromName, fromEmail }
  -- For 'delay': { amount: 3, unit: 'days' | 'hours' | 'minutes' }
  -- For 'condition': { field, operator, value, yesStepId, noStepId }
  -- For 'add_tag'/'remove_tag': { tagName }
  -- For 'move_to_list'/'remove_from_list': { listId }
  -- For 'webhook': { url, method, headers }
  
  -- Stats
  times_executed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_steps_automation ON email_automation_steps(automation_id);

-- ============================================
-- 10. AUTOMATION ENROLLMENTS
-- Track subscribers going through automations
-- ============================================
CREATE TABLE IF NOT EXISTS email_automation_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES email_automations(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES email_subscribers(id) ON DELETE CASCADE,
  
  -- Current position
  current_step_id UUID REFERENCES email_automation_steps(id),
  status TEXT DEFAULT 'active' 
    CHECK (status IN ('active', 'completed', 'cancelled', 'failed', 'waiting')),
  
  -- Waiting state (for delays)
  wait_until TIMESTAMPTZ,
  
  -- Progress
  steps_completed INTEGER DEFAULT 0,
  last_step_completed_at TIMESTAMPTZ,
  
  -- Tracking
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  
  -- Context data passed through the automation
  context_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(automation_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_automation ON email_automation_enrollments(automation_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subscriber ON email_automation_enrollments(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_waiting ON email_automation_enrollments(wait_until) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_enrollments_active ON email_automation_enrollments(automation_id) WHERE status = 'active';

-- ============================================
-- 11. EMAIL FORMS
-- Embeddable signup forms
-- ============================================
CREATE TABLE IF NOT EXISTS email_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Form type
  type TEXT DEFAULT 'inline' CHECK (type IN ('inline', 'popup', 'slide_in', 'full_page')),
  
  -- Configuration
  fields JSONB DEFAULT '[{"name": "email", "label": "Email", "required": true, "type": "email"}]',
  submit_button_text TEXT DEFAULT 'Subscribe',
  success_message TEXT DEFAULT 'Thanks for subscribing!',
  redirect_url TEXT,
  
  -- Styling
  styles JSONB DEFAULT '{}',
  
  -- Behavior (for popups)
  show_delay_seconds INTEGER DEFAULT 0,
  show_on_exit_intent BOOLEAN DEFAULT FALSE,
  show_after_scroll_percent INTEGER,
  
  -- Target lists
  list_ids UUID[] DEFAULT '{}',
  
  -- Tags to add on signup
  add_tags TEXT[] DEFAULT '{}',
  
  -- Double opt-in
  double_optin BOOLEAN DEFAULT FALSE,
  confirmation_email_template_id UUID,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Stats
  views INTEGER DEFAULT 0,
  submissions INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_forms_org ON email_forms(org_id);

-- ============================================
-- 12. UNSUBSCRIBE EVENTS
-- Track unsubscribes with reasons
-- ============================================
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  subscriber_id UUID REFERENCES email_subscribers(id),
  email TEXT NOT NULL,
  
  -- Context
  campaign_id UUID REFERENCES email_campaigns(id),
  automation_id UUID REFERENCES email_automations(id),
  
  -- Reason
  reason TEXT, -- 'too_many', 'not_relevant', 'never_signed_up', 'other'
  feedback TEXT,
  
  -- One-click vs preferences
  unsubscribe_type TEXT DEFAULT 'all' CHECK (unsubscribe_type IN ('all', 'list', 'campaign_type')),
  unsubscribed_from UUID[], -- List IDs if type = 'list'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unsubscribes_org ON email_unsubscribes(org_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON email_unsubscribes(email);

-- ============================================
-- 12b. CAMPAIGN TO LIST ASSOCIATIONS
-- Many-to-many join table for campaigns and lists
-- ============================================
CREATE TABLE IF NOT EXISTS email_campaign_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(campaign_id, list_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_lists_campaign ON email_campaign_lists(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_lists_list ON email_campaign_lists(list_id);

-- Create an alias view for email_list_members (maps to email_list_subscribers)
CREATE OR REPLACE VIEW email_list_members AS
SELECT * FROM email_list_subscribers;

-- ============================================
-- 13. UPDATE TRIGGERS
-- ============================================
CREATE TRIGGER update_tenant_email_settings_updated_at
  BEFORE UPDATE ON tenant_email_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_subscribers_updated_at
  BEFORE UPDATE ON email_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_lists_updated_at
  BEFORE UPDATE ON email_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_automations_updated_at
  BEFORE UPDATE ON email_automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_automation_steps_updated_at
  BEFORE UPDATE ON email_automation_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_automation_enrollments_updated_at
  BEFORE UPDATE ON email_automation_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_forms_updated_at
  BEFORE UPDATE ON email_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 14. SEED DEFAULT TEMPLATES FOR UPTRADE MEDIA
-- ============================================
-- We'll create these via the API/UI for now since they include GrapesJS JSON

COMMENT ON TABLE tenant_email_settings IS 'Email configuration per tenant including Resend API key and branding';
COMMENT ON TABLE email_subscribers IS 'Newsletter subscribers with engagement tracking';
COMMENT ON TABLE email_lists IS 'Subscriber lists and dynamic segments';
COMMENT ON TABLE email_templates IS 'GrapesJS email templates';
COMMENT ON TABLE email_campaigns IS 'One-time or scheduled email campaigns';
COMMENT ON TABLE email_automations IS 'Triggered email sequences';
COMMENT ON TABLE email_automation_steps IS 'Individual steps in automation sequences';
COMMENT ON TABLE email_automation_enrollments IS 'Subscribers progressing through automations';
COMMENT ON TABLE email_forms IS 'Embeddable signup forms';
