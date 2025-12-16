-- Email Tracking Table
-- Tracks all emails sent from the CRM (via Gmail API or Resend)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact reference
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Email details
  email_type TEXT NOT NULL DEFAULT 'gmail', -- 'gmail', 'resend', 'automated'
  subject TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sender_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Admin who sent it
  sender_email TEXT,
  
  -- External IDs for tracking
  resend_email_id TEXT, -- Resend message ID (for Resend emails)
  
  -- Gmail-specific metadata
  metadata JSONB DEFAULT '{}', -- gmail_message_id, gmail_thread_id, message_id_header, via
  
  -- Delivery status
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  bounce_reason TEXT,
  
  -- Engagement tracking
  opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  last_opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  clicked_links JSONB DEFAULT '[]', -- Array of clicked link URLs
  engagement_score INTEGER DEFAULT 0, -- Calculated engagement score
  
  -- Related content
  audit_id UUID, -- If email included an audit magic link
  proposal_id UUID, -- If email included a proposal magic link
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_tracking_contact_id ON email_tracking(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sender_id ON email_tracking(sender_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON email_tracking(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(status);

-- Enable RLS
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to email_tracking" ON email_tracking
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE contacts.id = auth.uid() 
      AND contacts.role = 'admin'
    )
  );

-- Policy: Service role bypasses RLS (for Netlify functions)
-- This is automatic with service_role key

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_email_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_tracking_updated_at
  BEFORE UPDATE ON email_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_email_tracking_updated_at();

-- Grant permissions
GRANT ALL ON email_tracking TO authenticated;
GRANT ALL ON email_tracking TO service_role;
