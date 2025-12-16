-- Migration: Add project milestones, checklist items, and tenant fields
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- 1. PROJECT MILESTONES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast project lookups
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);

-- ============================================
-- 2. PROJECT CHECKLIST ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES contacts(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_checklist_project_id ON project_checklist_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_checklist_milestone_id ON project_checklist_items(milestone_id);

-- ============================================
-- 3. PROJECT ACTIVITY/TIMELINE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES contacts(id),
  action TEXT NOT NULL, -- 'created', 'status_changed', 'milestone_completed', 'checklist_item_completed', etc.
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activities_created_at ON project_activities(created_at DESC);

-- ============================================
-- 4. ADD TENANT FIELDS TO PROJECTS TABLE
-- ============================================
-- is_tenant: marks this project as a converted tenant
-- tenant_features: array of enabled feature modules
-- tenant_domain: the domain for this tenant's website
-- tenant_tracking_id: unique ID for analytics tracking script

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_tenant BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_features TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_domain TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_tracking_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS converted_to_tenant_at TIMESTAMPTZ;

-- Index for tenant queries
CREATE INDEX IF NOT EXISTS idx_projects_is_tenant ON projects(is_tenant) WHERE is_tenant = TRUE;

-- ============================================
-- 4b. ADD MISSING CRM FIELDS TO CONTACTS TABLE
-- ============================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

-- ============================================
-- 4c. SCHEDULED EMAIL FOLLOW-UPS TABLE
-- ============================================
-- Stores automated follow-up emails that get cancelled when prospect replies
CREATE TABLE IF NOT EXISTS scheduled_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  original_email_id UUID REFERENCES email_tracking(id) ON DELETE CASCADE,
  thread_id TEXT, -- Gmail thread ID to track replies
  sequence_number INTEGER NOT NULL DEFAULT 1, -- Order in follow-up sequence (1, 2, 3)
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  stop_on_reply BOOLEAN DEFAULT TRUE, -- Cancel if recipient replies
  gmail_message_id TEXT, -- Gmail message ID once sent
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT, -- 'recipient_replied', 'manual', 'unsubscribed'
  error_message TEXT, -- Error details if failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_contact ON scheduled_followups(contact_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_thread ON scheduled_followups(thread_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_status ON scheduled_followups(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_pending ON scheduled_followups(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_original ON scheduled_followups(original_email_id);

-- ============================================
-- 5. TRIGGER TO AUTO-UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to new tables
DROP TRIGGER IF EXISTS update_project_milestones_updated_at ON project_milestones;
CREATE TRIGGER update_project_milestones_updated_at 
  BEFORE UPDATE ON project_milestones 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_checklist_items_updated_at ON project_checklist_items;
CREATE TRIGGER update_project_checklist_items_updated_at 
  BEFORE UPDATE ON project_checklist_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. RLS POLICIES (optional - enable if using RLS)
-- ============================================
-- ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE project_checklist_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. SEED: UPTRADE MEDIA AS FIRST WEB APP
-- ============================================
-- Create Uptrade Media project if it doesn't exist, then mark as tenant
DO $$
DECLARE
  v_project_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get an admin contact to own the project (or use first contact)
  SELECT id INTO v_admin_id FROM contacts WHERE role = 'admin' LIMIT 1;
  
  -- If no admin, get any contact
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM contacts LIMIT 1;
  END IF;
  
  -- Check if Uptrade Media project already exists
  SELECT id INTO v_project_id FROM projects WHERE title = 'Uptrade Media Website' LIMIT 1;
  
  -- Create if doesn't exist
  IF v_project_id IS NULL AND v_admin_id IS NOT NULL THEN
    INSERT INTO projects (
      id,
      contact_id,
      title,
      description,
      status,
      is_tenant,
      tenant_features,
      tenant_domain,
      tenant_tracking_id,
      converted_to_tenant_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_admin_id,
      'Uptrade Media Website',
      'Main Uptrade Media marketing website and portal',
      'completed',
      TRUE,
      ARRAY['analytics', 'blog', 'crm', 'email_campaigns', 'seo'],
      'uptrademedia.com',
      'UM-UPTRADE01',
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_project_id;
    
    -- Log the creation activity
    INSERT INTO project_activities (project_id, user_id, action, details)
    VALUES (
      v_project_id,
      v_admin_id,
      'converted_to_tenant',
      '{"features": ["analytics", "blog", "crm", "email_campaigns", "seo"], "domain": "uptrademedia.com", "note": "Initial seed - Uptrade Media as first web app"}'::jsonb
    );
    
    RAISE NOTICE 'Created Uptrade Media as first web app with id: %', v_project_id;
  ELSIF v_project_id IS NOT NULL THEN
    -- Update existing project to be a tenant if not already
    UPDATE projects SET
      is_tenant = TRUE,
      tenant_features = ARRAY['analytics', 'blog', 'crm', 'email_campaigns', 'seo'],
      tenant_domain = COALESCE(tenant_domain, 'uptrademedia.com'),
      tenant_tracking_id = COALESCE(tenant_tracking_id, 'UM-UPTRADE01'),
      converted_to_tenant_at = COALESCE(converted_to_tenant_at, NOW()),
      status = 'completed'
    WHERE id = v_project_id AND is_tenant = FALSE;
    
    RAISE NOTICE 'Updated existing Uptrade Media project to web app';
  ELSE
    RAISE NOTICE 'No contacts found - skipping Uptrade Media seed';
  END IF;
END $$;

-- Done!
