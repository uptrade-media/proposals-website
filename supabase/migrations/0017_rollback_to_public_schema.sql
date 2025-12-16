-- Rollback to Public Schema with Row-Level Multi-Tenancy
-- This approach uses org_id column instead of separate schemas
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- STEP 1: Move Tables Back to Public Schema
-- ============================================
ALTER TABLE IF EXISTS org_uptrade_media.contacts SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.projects SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.proposals SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.proposal_line_items SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.audits SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.known_visitors SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.known_visitor_activity SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.lead_scores SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.blog_posts SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.portfolio_items SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.messages SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.email_tracking SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.call_logs SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.call_tasks SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.call_topics SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.call_follow_ups SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.call_contact_extractions SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.invoices SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.files SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.campaigns SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.crm_notifications SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.contact_notes SET SCHEMA public;
ALTER TABLE IF EXISTS org_uptrade_media.smart_notifications SET SCHEMA public;

-- ============================================
-- STEP 2: Add org_id to Multi-Tenant Tables
-- ============================================
-- Get the Uptrade Media org ID first
DO $$
DECLARE
  uptrade_org_id UUID;
BEGIN
  -- Get or create the Uptrade Media organization
  SELECT id INTO uptrade_org_id FROM public.organizations WHERE slug = 'uptrade-media';
  
  IF uptrade_org_id IS NULL THEN
    INSERT INTO public.organizations (slug, name, schema_name, status, plan, features)
    VALUES ('uptrade-media', 'Uptrade Media', 'org_uptrade_media', 'active', 'enterprise', 
      '{"analytics": true, "blog": true, "crm": true, "projects": true, "proposals": true, "billing": true, "ecommerce": true, "files": true, "messages": true, "email_manager": true, "seo": true}'::jsonb
    )
    RETURNING id INTO uptrade_org_id;
  END IF;

  -- Add org_id column to contacts if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'org_id') THEN
    ALTER TABLE public.contacts ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.contacts SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

  -- Add org_id to projects
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'org_id') THEN
    ALTER TABLE public.projects ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.projects SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

  -- Add org_id to proposals
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'org_id') THEN
    ALTER TABLE public.proposals ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.proposals SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

  -- Add org_id to audits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audits' AND column_name = 'org_id') THEN
    ALTER TABLE public.audits ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.audits SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

  -- Add org_id to blog_posts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'org_id') THEN
    ALTER TABLE public.blog_posts ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.blog_posts SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

  -- Add org_id to portfolio_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'portfolio_items' AND column_name = 'org_id') THEN
    ALTER TABLE public.portfolio_items ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.portfolio_items SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

  -- Add org_id to messages
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'org_id') THEN
    ALTER TABLE public.messages ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.messages SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

  -- Add org_id to invoices
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'org_id') THEN
    ALTER TABLE public.invoices ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.invoices SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

  -- Add org_id to files
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'org_id') THEN
    ALTER TABLE public.files ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.files SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

  -- Add org_id to call_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'call_logs' AND column_name = 'org_id') THEN
    ALTER TABLE public.call_logs ADD COLUMN org_id UUID REFERENCES public.organizations(id);
    UPDATE public.call_logs SET org_id = uptrade_org_id WHERE org_id IS NULL;
  END IF;

END $$;

-- ============================================
-- STEP 3: Create Indexes on org_id
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON public.contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_proposals_org_id ON public.proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_audits_org_id ON public.audits(org_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_org_id ON public.blog_posts(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_org_id ON public.messages(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_files_org_id ON public.files(org_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_org_id ON public.call_logs(org_id);

-- ============================================
-- STEP 4: Drop the org_uptrade_media schema (optional, after verification)
-- ============================================
-- Uncomment after verifying data is back in public schema
-- DROP SCHEMA IF EXISTS org_uptrade_media CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify tables are back in public:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts';
