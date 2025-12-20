-- Migration: Project Members and User Permissions
-- 
-- Implements two-tier user access:
--   - Organization-level users: Access to billing, proposals, all projects, all org members
--   - Project-level users: Access only to their specific project(s)
--
-- Uptrade Media employees are assigned to projects via project_members with role 'uptrade_assigned'

-- ============================================================================
-- CLEANUP: Drop existing objects to make migration idempotent
-- ============================================================================

DROP VIEW IF EXISTS user_messageable_contacts;
DROP FUNCTION IF EXISTS user_has_project_access(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_org_access(UUID, UUID);
DROP TABLE IF EXISTS project_members CASCADE;

-- ============================================================================
-- 0. Add avatar column to contacts (for profile pictures)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'avatar'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN avatar TEXT;
    COMMENT ON COLUMN public.contacts.avatar IS 'URL to user profile picture or null to use org logo';
  END IF;
END $$;

-- ============================================================================
-- 0b. Add logo_url column to organizations (fallback avatar for org members)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN logo_url TEXT;
    COMMENT ON COLUMN public.organizations.logo_url IS 'Organization logo URL, used as default avatar for members';
  END IF;
END $$;

-- ============================================================================
-- 1. Create project_members table (links contacts to specific projects)
-- ============================================================================

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Role within the project
  -- 'owner' - Primary contact for this project (usually org owner)
  -- 'admin' - Can manage project settings
  -- 'member' - Regular team member
  -- 'viewer' - Read-only access
  -- 'uptrade_assigned' - Uptrade Media employee assigned to this project
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'uptrade_assigned')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one membership per contact per project
  UNIQUE(project_id, contact_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_contact ON project_members(contact_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- ============================================================================
-- 2. Add access_level to organization_members to distinguish org vs project users
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'access_level'
  ) THEN
    -- 'organization' = full org access (billing, proposals, all projects)
    -- 'project' = project-only access (only assigned projects)
    ALTER TABLE public.organization_members ADD COLUMN access_level TEXT DEFAULT 'organization' 
      CHECK (access_level IN ('organization', 'project'));
  END IF;
END $$;

-- ============================================================================
-- 3. Migrate existing project assignments to project_members
-- ============================================================================

-- Migrate project contact_id (primary contact) to project_members as owner
DO $$
BEGIN
  -- Only run if projects.contact_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'contact_id'
  ) THEN
    INSERT INTO project_members (project_id, contact_id, role)
    SELECT p.id, p.contact_id, 'owner'
    FROM projects p
    WHERE p.contact_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.contact_id = p.contact_id
      );
  END IF;
END $$;

-- Migrate assigned_to (Uptrade employee) to project_members as uptrade_assigned
DO $$
BEGIN
  -- Only run if projects.assigned_to column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'assigned_to'
  ) THEN
    INSERT INTO project_members (project_id, contact_id, role)
    SELECT p.id, p.assigned_to, 'uptrade_assigned'
    FROM projects p
    WHERE p.assigned_to IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.contact_id = p.assigned_to
      );
  END IF;
END $$;

-- ============================================================================
-- 4. Create helper function to check if user has org-level access
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_org_access(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.contact_id = user_id 
      AND om.organization_id = org_id
      AND om.access_level = 'organization'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Create helper function to check if user has project access
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_project_access(user_id UUID, proj_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check direct project membership
  IF EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.contact_id = user_id AND pm.project_id = proj_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check org-level access (org members have access to all projects in org)
  IF EXISTS (
    SELECT 1 FROM organization_members om
    JOIN projects p ON p.organization_id = om.organization_id
    WHERE om.contact_id = user_id 
      AND p.id = proj_id
      AND om.access_level = 'organization'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Create view for user's accessible contacts (for messaging)
-- ============================================================================

CREATE VIEW user_messageable_contacts AS
SELECT DISTINCT
  c.id,
  c.name,
  c.email,
  c.company,
  -- Use contact's avatar, fall back to org logo
  COALESCE(c.avatar, org.logo_url) AS avatar,
  c.role,
  -- Source of relationship
  CASE 
    WHEN om.access_level = 'organization' THEN 'organization'
    WHEN pm.role = 'uptrade_assigned' THEN 'uptrade_team'
    ELSE 'project'
  END AS contact_source,
  -- The org or project context
  COALESCE(om.organization_id, p.organization_id) AS organization_id,
  pm.project_id
FROM contacts c
LEFT JOIN organization_members om ON om.contact_id = c.id
LEFT JOIN organizations org ON org.id = om.organization_id
LEFT JOIN project_members pm ON pm.contact_id = c.id
LEFT JOIN projects p ON p.id = pm.project_id
WHERE c.role IN ('admin', 'client', 'member');

-- ============================================================================
-- 7. RLS Policies for project_members
-- ============================================================================

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Allow all operations via service role (our Netlify functions use service role)
-- Note: RLS with auth.uid() doesn't apply when using service_role key
-- Our access control is enforced in the Netlify functions themselves

CREATE POLICY "Service role has full access to project_members"
  ON public.project_members FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. Recreate projects RLS policy that was dropped with CASCADE
-- ============================================================================

-- Drop first in case it exists partially
DROP POLICY IF EXISTS "Clients can read projects they're members of" ON public.projects;

CREATE POLICY "Clients can read projects they're members of"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
        AND pm.contact_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = projects.organization_id
        AND om.contact_id = auth.uid()
        AND om.access_level = 'organization'
    )
  );

-- ============================================================================
-- Done!
-- 
-- Usage patterns:
-- 
-- 1. Add user to ORGANIZATION (full access):
--    INSERT INTO organization_members (organization_id, contact_id, role, access_level)
--    VALUES ($org_id, $contact_id, 'member', 'organization');
--
-- 2. Add user to SPECIFIC PROJECT only:
--    INSERT INTO organization_members (organization_id, contact_id, role, access_level)
--    VALUES ($org_id, $contact_id, 'member', 'project');
--    INSERT INTO project_members (project_id, contact_id, role)
--    VALUES ($project_id, $contact_id, 'member');
--
-- 3. Assign Uptrade employee to project:
--    INSERT INTO project_members (project_id, contact_id, role)
--    VALUES ($project_id, $uptrade_employee_id, 'uptrade_assigned');
--
-- 4. Check if user can access billing/proposals:
--    SELECT user_has_org_access($user_id, $org_id);
--
-- ============================================================================
