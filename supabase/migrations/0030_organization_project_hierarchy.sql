-- Migration: Organization-Project Hierarchy
-- Creates proper two-tier structure: Organizations contain Projects
-- 
-- Organizations: Business entities (e.g., "Garcia's Welding & Accessories LLC")
-- Projects: Web apps/sites under an organization (e.g., "GWA NextJS Site")

-- ============================================================================
-- 1. Create organizations table (if not exists via RLS-based system)
-- ============================================================================

-- First, check if we have an organizations table or need to create one
-- The current system uses contacts.org_id but there's no organizations table

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  domain TEXT,
  
  -- Branding
  logo_url TEXT,
  favicon_url TEXT,
  theme_color TEXT DEFAULT '#4bbf39',
  
  -- Plan & status
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise', 'managed')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  
  -- Feature flags for organization-level features
  features JSONB DEFAULT '{}',
  
  -- Billing contact (primary contact for this org) - added after table creation
  billing_contact_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- ============================================================================
-- 2. Create organization_members table (links contacts to orgs with roles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL,
  
  -- Role within the organization
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one membership per contact per org
  UNIQUE(organization_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_contact ON organization_members(contact_id);

-- ============================================================================
-- 2b. Add foreign key constraints (if contacts table exists)
-- ============================================================================

DO $$
BEGIN
  -- Check if contacts table exists before adding FK constraints
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    
    -- First ensure billing_contact_id column exists on organizations
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'billing_contact_id'
    ) THEN
      ALTER TABLE public.organizations ADD COLUMN billing_contact_id UUID;
    END IF;
    
    -- Add FK for billing_contact_id on organizations
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' AND constraint_name = 'organizations_billing_contact_id_fkey'
    ) THEN
      ALTER TABLE public.organizations 
        ADD CONSTRAINT organizations_billing_contact_id_fkey 
        FOREIGN KEY (billing_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
    END IF;
    
    -- Add FK for contact_id on organization_members
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' AND constraint_name = 'organization_members_contact_id_fkey'
    ) THEN
      ALTER TABLE public.organization_members 
        ADD CONSTRAINT organization_members_contact_id_fkey 
        FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
    END IF;
  ELSE
    RAISE NOTICE 'contacts table does not exist - skipping FK constraints';
  END IF;
END $$;

-- ============================================================================
-- 3. Update projects table to properly link to organizations
-- ============================================================================

-- Add organization_id if it doesn't exist (distinct from org_id which was loosely used)
DO $$
BEGIN
  -- Only proceed if projects table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
    END IF;
  ELSE
    RAISE NOTICE 'projects table does not exist - skipping organization_id column';
  END IF;
END $$;

-- Create index for organization lookup (only if projects table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_projects_organization') THEN
      CREATE INDEX idx_projects_organization ON public.projects(organization_id);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. Migrate existing project tenants to organization structure
-- ============================================================================

-- For each project that is_tenant = true, create an organization if needed
-- This is a one-time migration

DO $$
DECLARE
  proj RECORD;
  new_org_id UUID;
  contact_record RECORD;
BEGIN
  -- Only run if projects table has organization_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'organization_id') THEN
    RAISE NOTICE 'projects.organization_id column not found - skipping tenant migration';
    RETURN;
  END IF;

  -- Find all tenant projects that don't have an organization yet
  FOR proj IN 
    SELECT p.*, c.id as primary_contact_id, c.company as contact_company
    FROM public.projects p
    LEFT JOIN public.contacts c ON p.contact_id = c.id
    WHERE p.is_tenant = true 
    AND p.organization_id IS NULL
  LOOP
    -- Check if an organization with this name exists
    SELECT id INTO new_org_id 
    FROM public.organizations 
    WHERE name = proj.title OR slug = LOWER(REPLACE(proj.title, ' ', '-'))
    LIMIT 1;
    
    -- If no org exists, create one
    IF new_org_id IS NULL THEN
      INSERT INTO public.organizations (
        name,
        slug,
        domain,
        theme_color,
        logo_url,
        favicon_url,
        features,
        billing_contact_id,
        plan,
        status
      ) VALUES (
        COALESCE(proj.contact_company, proj.title, 'Unknown Org'),
        LOWER(REPLACE(COALESCE(proj.contact_company, proj.title, 'unknown'), ' ', '-')),
        proj.tenant_domain,
        COALESCE(proj.tenant_theme_color, '#4bbf39'),
        proj.tenant_logo_url,
        proj.tenant_favicon_url,
        COALESCE(proj.tenant_features, '{}'),
        proj.primary_contact_id,
        'managed',
        'active'
      )
      RETURNING id INTO new_org_id;
      
      -- Add the primary contact as organization owner
      IF proj.primary_contact_id IS NOT NULL THEN
        INSERT INTO public.organization_members (organization_id, contact_id, role)
        VALUES (new_org_id, proj.primary_contact_id, 'owner')
        ON CONFLICT (organization_id, contact_id) DO NOTHING;
      END IF;
    END IF;
    
    -- Link the project to the organization
    UPDATE public.projects SET organization_id = new_org_id WHERE id = proj.id;
    
    RAISE NOTICE 'Migrated project % to organization %', proj.title, new_org_id;
  END LOOP;
END $$;

-- ============================================================================
-- 5. Update contacts with org_id to link to organizations
-- ============================================================================

-- Migrate contacts with org_id to organization_members
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN 
    SELECT id, org_id 
    FROM public.contacts 
    WHERE org_id IS NOT NULL
  LOOP
    -- Check if this org_id is a valid organization
    IF EXISTS (SELECT 1 FROM public.organizations WHERE id = c.org_id) THEN
      INSERT INTO public.organization_members (organization_id, contact_id, role)
      VALUES (c.org_id, c.id, 'member')
      ON CONFLICT (organization_id, contact_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 6. Create helper views for easier querying
-- ============================================================================

-- View: Organization with project count
CREATE OR REPLACE VIEW public.organization_summary AS
SELECT 
  o.*,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_tenant = true) as project_count,
  COUNT(DISTINCT om.contact_id) as member_count,
  (
    SELECT json_agg(json_build_object(
      'id', p2.id,
      'title', p2.title,
      'domain', p2.tenant_domain,
      'features', p2.tenant_features
    ))
    FROM public.projects p2 
    WHERE p2.organization_id = o.id AND p2.is_tenant = true
  ) as projects
FROM public.organizations o
LEFT JOIN public.projects p ON p.organization_id = o.id
LEFT JOIN public.organization_members om ON om.organization_id = o.id
GROUP BY o.id;

-- ============================================================================
-- 7. RLS Policies for new tables
-- ============================================================================

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations: viewable by members, admins can see all
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.organization_id = organizations.id 
      AND om.contact_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.contacts c 
      WHERE c.id = auth.uid() AND c.role = 'admin'
    )
  );

-- Organization members: viewable by org members
CREATE POLICY "Users can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om2 
      WHERE om2.organization_id = organization_members.organization_id 
      AND om2.contact_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.contacts c 
      WHERE c.id = auth.uid() AND c.role = 'admin'
    )
  );

-- Admins can manage organizations
CREATE POLICY "Admins can manage organizations"
  ON public.organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c 
      WHERE c.id = auth.uid() AND c.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage organization members"
  ON public.organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c 
      WHERE c.id = auth.uid() AND c.role = 'admin'
    )
  );

-- ============================================================================
-- 8. Update trigger for organizations.updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON public.organizations;
CREATE TRIGGER trigger_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organizations_updated_at();

-- ============================================================================
-- Done! The hierarchy is now:
-- 
-- Organization (GWA LLC)
--   └── Project (GWA NextJS Site) - is_tenant=true
--   └── Project (Another Project) - is_tenant=true
--   └── Project (One-time project) - is_tenant=false (not shown in tenant UI)
-- ============================================================================
