-- Migration: Add CRM fields to contacts table
-- Adds subscription tracking and enhanced client management features

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS subscribed BOOLEAN DEFAULT true;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT; -- JSON array
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_subscribed ON contacts(subscribed);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role);

-- Optional: Create activity log table for tracking client interactions
CREATE TABLE IF NOT EXISTS client_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'email_sent', 'proposal_sent', 'invoice_created', 'call', 'meeting', 'note_added'
  description TEXT,
  metadata JSONB, -- Additional data like email_id, proposal_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_activity_contact ON client_activity(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_type ON client_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_client_activity_created ON client_activity(created_at DESC);
