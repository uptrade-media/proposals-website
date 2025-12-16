-- Migration: Sales Team Multi-User Support
-- Phase 1: Database & Auth
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ADD TEAM MEMBER FIELDS TO CONTACTS
-- ============================================

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS is_team_member BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS team_role TEXT, -- 'admin', 'sales_rep', 'manager'
ADD COLUMN IF NOT EXISTS team_status TEXT DEFAULT 'active', -- 'active', 'inactive', 'invited'
ADD COLUMN IF NOT EXISTS openphone_number TEXT,
ADD COLUMN IF NOT EXISTS gmail_address TEXT,
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES contacts(id);

-- Create index for team queries
CREATE INDEX IF NOT EXISTS idx_contacts_team 
ON contacts(is_team_member, team_status) 
WHERE is_team_member = TRUE;

-- Mark existing admin as team member (update email as needed)
UPDATE contacts 
SET is_team_member = TRUE, 
    team_role = 'admin', 
    gmail_address = email
WHERE email = 'ramsey@uptrademedia.com'
   OR role = 'admin';

-- ============================================
-- 2. ADD OWNERSHIP TRACKING TO ALL TABLES
-- ============================================

-- Contacts (prospects/clients) - who owns this lead
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS last_activity_by UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Audits - who created this audit
ALTER TABLE audits
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'portal'; -- 'portal', 'extension', 'api'

-- Proposals - who created and who owns
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES contacts(id);

-- Projects - who is assigned
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES contacts(id);

-- Call logs - which rep handled the call
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS handled_by UUID REFERENCES contacts(id);

-- Email tracking - which rep sent the email
ALTER TABLE email_tracking
ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'portal'; -- 'portal', 'extension', 'sequence'

-- Messages - who sent the message
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES contacts(id);

-- ============================================
-- 3. CREATE INDEXES FOR FILTERING
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contacts_assigned 
ON contacts(assigned_to) 
WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audits_created 
ON audits(created_by);

CREATE INDEX IF NOT EXISTS idx_audits_source 
ON audits(source);

CREATE INDEX IF NOT EXISTS idx_proposals_created 
ON proposals(created_by);

CREATE INDEX IF NOT EXISTS idx_proposals_assigned 
ON proposals(assigned_to);

CREATE INDEX IF NOT EXISTS idx_projects_assigned 
ON projects(assigned_to);

CREATE INDEX IF NOT EXISTS idx_calls_handled 
ON call_logs(handled_by);

CREATE INDEX IF NOT EXISTS idx_emails_sent_by 
ON email_tracking(sent_by);

CREATE INDEX IF NOT EXISTS idx_messages_sent_by 
ON messages(sent_by);

-- ============================================
-- 4. CREATE TEAM PERFORMANCE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS team_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Date range for this metric snapshot
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Activity counts
  calls_made INTEGER DEFAULT 0,
  calls_received INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  audits_created INTEGER DEFAULT 0,
  proposals_sent INTEGER DEFAULT 0,
  proposals_accepted INTEGER DEFAULT 0,
  
  -- Call quality
  avg_call_duration INTEGER, -- seconds
  avg_sentiment_score DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Pipeline metrics
  new_leads INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Response times
  avg_response_time INTEGER, -- minutes to first response
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_member_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_team_metrics_member 
ON team_metrics(team_member_id, period_start);

-- ============================================
-- 5. CREATE LEAD ASSIGNMENT TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES contacts(id), -- Admin who made the assignment
  
  -- Assignment rules
  assignment_type TEXT DEFAULT 'manual', -- 'manual', 'round_robin', 'auto'
  assignment_reason TEXT, -- 'new_lead', 'reassignment', 'returned'
  
  -- Tracking
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ, -- Rep acknowledges assignment
  completed_at TIMESTAMPTZ, -- Deal closed or lost
  outcome TEXT, -- 'won', 'lost', 'transferred'
  
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_assignments_rep 
ON lead_assignments(assigned_to, assigned_at);

CREATE INDEX IF NOT EXISTS idx_assignments_contact 
ON lead_assignments(contact_id);

-- ============================================
-- 6. MIGRATION DATA (Assign existing data to admin)
-- ============================================

-- Assign all existing contacts to admin (if needed)
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_id 
  FROM contacts 
  WHERE is_team_member = TRUE AND team_role = 'admin' 
  LIMIT 1;
  
  -- Only proceed if we found an admin
  IF admin_id IS NOT NULL THEN
    -- Assign existing audits to admin (where created_by is null)
    UPDATE audits 
    SET created_by = admin_id 
    WHERE created_by IS NULL;
    
    -- Assign existing proposals to admin
    UPDATE proposals 
    SET created_by = admin_id 
    WHERE created_by IS NULL;
    
    -- Assign existing projects to admin
    UPDATE projects 
    SET assigned_to = admin_id 
    WHERE assigned_to IS NULL;
    
    -- Assign existing call logs to admin
    UPDATE call_logs 
    SET handled_by = admin_id 
    WHERE handled_by IS NULL;
    
    -- Assign existing email tracking to admin
    UPDATE email_tracking 
    SET sent_by = admin_id 
    WHERE sent_by IS NULL;
    
    RAISE NOTICE 'Assigned existing records to admin: %', admin_id;
  ELSE
    RAISE NOTICE 'No admin found - skipping data migration';
  END IF;
END $$;

-- ============================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN contacts.is_team_member IS 'TRUE for Uptrade employees (reps, admins), FALSE for clients';
COMMENT ON COLUMN contacts.team_role IS 'Role within Uptrade: admin, sales_rep, manager';
COMMENT ON COLUMN contacts.team_status IS 'Status: active, inactive, invited';
COMMENT ON COLUMN contacts.assigned_to IS 'Which rep owns this contact (for client contacts)';
COMMENT ON COLUMN audits.created_by IS 'Which team member created this audit';
COMMENT ON COLUMN audits.source IS 'Where audit was created: portal, extension, api';
COMMENT ON COLUMN proposals.created_by IS 'Which team member created this proposal';
COMMENT ON COLUMN email_tracking.sent_by IS 'Which team member sent this email';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify the migration
SELECT 
  'Team Members' as table_name,
  COUNT(*) as count
FROM contacts 
WHERE is_team_member = TRUE

UNION ALL

SELECT 
  'Audits with creator' as table_name,
  COUNT(*) as count
FROM audits 
WHERE created_by IS NOT NULL

UNION ALL

SELECT 
  'Proposals with creator' as table_name,
  COUNT(*) as count
FROM proposals 
WHERE created_by IS NOT NULL;
