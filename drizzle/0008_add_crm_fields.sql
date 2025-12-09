-- ========================================
-- CRM ENHANCEMENT MIGRATION
-- Adds pipeline stages, magic links, and CRM fields to contacts
-- Run AFTER supabase-openphone-ai-schema.sql
-- ========================================

-- Add CRM fields to contacts table
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'new_lead',
  ADD COLUMN IF NOT EXISTS magic_link_token TEXT,
  ADD COLUMN IF NOT EXISTS magic_link_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_setup TEXT DEFAULT 'false',
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS google_id TEXT;

-- Create index for pipeline stage filtering
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_stage ON contacts(pipeline_stage);

-- Create index for magic link lookups
CREATE INDEX IF NOT EXISTS idx_contacts_magic_link_token ON contacts(magic_link_token);

-- Add constraint for valid pipeline stages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contacts_pipeline_stage_check'
  ) THEN
    ALTER TABLE contacts 
    ADD CONSTRAINT contacts_pipeline_stage_check 
    CHECK (pipeline_stage IN ('new_lead', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'closed_won', 'closed_lost'));
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN contacts.pipeline_stage IS 'CRM pipeline stage: new_lead, contacted, qualified, proposal_sent, negotiating, closed_won, closed_lost';
COMMENT ON COLUMN contacts.magic_link_token IS 'One-time token for passwordless login';
COMMENT ON COLUMN contacts.magic_link_expires IS 'Expiry time for magic link token';
COMMENT ON COLUMN contacts.account_setup IS 'Whether the user has completed account setup';

-- ========================================
-- ACTIVITY LOG ENHANCEMENT
-- Add more activity types
-- ========================================

-- Create activity_log table if not exists
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_contact_id ON activity_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins have full access to activity log" ON activity_log;
DROP POLICY IF EXISTS "Clients can read own activity log" ON activity_log;

-- Activity log RLS policies
CREATE POLICY "Admins have full access to activity log"
  ON activity_log FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients can read own activity log"
  ON activity_log FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM contacts WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE activity_log IS 'Activity log for tracking all contact interactions and system events';

-- ========================================
-- VERIFICATION
-- ========================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'contacts' 
-- AND column_name IN ('pipeline_stage', 'magic_link_token', 'magic_link_expires', 'account_setup');
