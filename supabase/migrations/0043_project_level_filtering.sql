-- Migration: Project-Level Data Filtering
-- 
-- Adds project_id to tables that store project-specific data.
-- This allows organizations with multiple projects to keep data separate.
--
-- Organization-level (uses organization_id):
--   - invoices, messages, files, proposals (shared across org)
--
-- Project-level (uses project_id):
--   - contacts (CRM for specific project/website)
--   - seo_sites, seo_pages, etc. (SEO for specific project)
--   - shopify_stores (Ecommerce for specific project)
--   - blog_posts (Blog for specific project)
--   - analytics_* (Analytics for specific project)

-- ============================================================================
-- 1. Add project_id to contacts (for project-level CRM)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_project ON public.contacts(project_id);

-- ============================================================================
-- 2. Add project_id to SEO tables
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'seo_sites' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.seo_sites ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_seo_sites_project ON public.seo_sites(project_id);

-- ============================================================================
-- 3. Add project_id to Shopify/Ecommerce tables
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'shopify_stores' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.shopify_stores ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shopify_stores_project ON public.shopify_stores(project_id);

-- ============================================================================
-- 4. Add project_id to Blog tables
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_blog_posts_project ON public.blog_posts(project_id);

-- ============================================================================
-- 5. Add project_id to Analytics tables
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'analytics_events' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.analytics_events ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'analytics_page_views' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.analytics_page_views ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'analytics_sessions' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.analytics_sessions ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analytics_events_project ON public.analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_project ON public.analytics_page_views(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_project ON public.analytics_sessions(project_id);

-- ============================================================================
-- 6. Add organization_id to org-level tables (if not exists)
-- ============================================================================

-- Invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_organization ON public.invoices(organization_id);

-- Messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_organization ON public.messages(organization_id);

-- Files (can be org-level or project-level)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.files ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.files ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_files_organization ON public.files(organization_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON public.files(project_id);

-- Proposals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proposals_organization ON public.proposals(organization_id);

-- ============================================================================
-- 7. Migrate existing GWA data to use project_id
-- ============================================================================

-- For existing tenant projects, set project_id on related data
DO $$
DECLARE
  proj RECORD;
BEGIN
  FOR proj IN 
    SELECT id, organization_id FROM public.projects WHERE is_tenant = true
  LOOP
    -- Update contacts that have org_id matching this project's organization
    UPDATE public.contacts 
    SET project_id = proj.id 
    WHERE org_id = proj.organization_id 
    AND project_id IS NULL;
    
    -- Update seo_sites
    UPDATE public.seo_sites 
    SET project_id = proj.id 
    WHERE org_id = proj.organization_id 
    AND project_id IS NULL;
    
    -- Update shopify_stores
    UPDATE public.shopify_stores 
    SET project_id = proj.id 
    WHERE org_id = proj.organization_id 
    AND project_id IS NULL;
    
    -- Update blog_posts
    UPDATE public.blog_posts 
    SET project_id = proj.id 
    WHERE org_id = proj.organization_id 
    AND project_id IS NULL;
    
    RAISE NOTICE 'Migrated project % data to use project_id', proj.id;
  END LOOP;
END $$;

-- ============================================================================
-- Done! 
-- 
-- Data filtering strategy:
-- 
-- ORGANIZATION-LEVEL (filter by organization_id):
--   - Dashboard (aggregate view)
--   - Proposals (from Uptrade to org)
--   - Invoices (billing to org)
--   - Messages (with org)
--   - Files (shared, can also have project_id)
--   - Projects list (all projects under org)
--
-- PROJECT-LEVEL (filter by project_id):
--   - CRM/Clients (leads for this project)
--   - SEO (for this project's website)
--   - Ecommerce (for this project's store)
--   - Blog (for this project's blog)
--   - Analytics (for this project's website)
--   - Forms (for this project)
--
-- ============================================================================
