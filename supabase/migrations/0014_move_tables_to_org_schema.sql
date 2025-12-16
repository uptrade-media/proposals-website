-- Schema Migration: Move Tables to org_uptrade_media
-- Run this AFTER 0013_multi_tenant_foundation.sql
-- 
-- IMPORTANT: This migration moves existing data to the org_uptrade_media schema
-- Back up your database before running this!

-- ============================================
-- STEP 1: Create the Organization Schema
-- ============================================
CREATE SCHEMA IF NOT EXISTS org_uptrade_media;

-- ============================================
-- STEP 2: Move Tables to New Schema
-- ============================================
-- Using ALTER TABLE ... SET SCHEMA preserves all data, indexes, and constraints

-- Core CRM tables
ALTER TABLE IF EXISTS public.contacts SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.projects SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.proposals SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.proposal_line_items SET SCHEMA org_uptrade_media;

-- Audits & Analytics
ALTER TABLE IF EXISTS public.audits SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.known_visitors SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.known_visitor_activity SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.lead_scores SET SCHEMA org_uptrade_media;

-- Content tables
ALTER TABLE IF EXISTS public.blog_posts SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.portfolio_items SET SCHEMA org_uptrade_media;

-- Communication
ALTER TABLE IF EXISTS public.messages SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.email_tracking SET SCHEMA org_uptrade_media;

-- Call tracking (OpenPhone)
ALTER TABLE IF EXISTS public.call_logs SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.call_tasks SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.call_topics SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.call_follow_ups SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.call_contact_extractions SET SCHEMA org_uptrade_media;

-- Billing
ALTER TABLE IF EXISTS public.invoices SET SCHEMA org_uptrade_media;

-- Files
ALTER TABLE IF EXISTS public.files SET SCHEMA org_uptrade_media;

-- Campaigns & Notifications
ALTER TABLE IF EXISTS public.campaigns SET SCHEMA org_uptrade_media;
ALTER TABLE IF EXISTS public.smart_notifications SET SCHEMA org_uptrade_media;

-- ============================================
-- STEP 3: Keep These in Public Schema (Shared)
-- ============================================
-- app_secrets - Already in public, stays there (shared infra)
-- organizations - Created in previous migration
-- organization_secrets - Created in previous migration  
-- user_organizations - Created in previous migration
-- super_admins - Created in previous migration
-- org_access_logs - Created in previous migration

-- ============================================
-- STEP 4: Update Search Path Default
-- ============================================
-- Set a default search path that includes the org schema
-- Note: This is a session-level setting, each connection sets its own

-- ============================================
-- STEP 5: Create Views in Public for Backward Compatibility (Optional)
-- ============================================
-- If you have existing code that references public.contacts, etc.
-- Uncomment these to create compatibility views:

-- CREATE OR REPLACE VIEW public.contacts AS SELECT * FROM org_uptrade_media.contacts;
-- CREATE OR REPLACE VIEW public.projects AS SELECT * FROM org_uptrade_media.projects;
-- CREATE OR REPLACE VIEW public.proposals AS SELECT * FROM org_uptrade_media.proposals;
-- etc...

-- ============================================
-- STEP 6: Verify Migration
-- ============================================
-- Run these to confirm tables moved correctly:

-- Check org schema has the tables:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'org_uptrade_media';

-- Check public schema tables:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- ============================================
-- STEP 7: Grant Permissions (if using RLS)
-- ============================================
-- Ensure the service role can access the new schema
GRANT USAGE ON SCHEMA org_uptrade_media TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA org_uptrade_media TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA org_uptrade_media TO service_role;

-- For anon role (if needed for public access)
GRANT USAGE ON SCHEMA org_uptrade_media TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA org_uptrade_media TO anon;

-- For authenticated role
GRANT USAGE ON SCHEMA org_uptrade_media TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA org_uptrade_media TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA org_uptrade_media TO authenticated;

-- ============================================
-- DONE!
-- ============================================
-- Next steps:
-- 1. Update Supabase client code to set search_path before queries
-- 2. Test all existing functionality still works
-- 3. Run pnpm pull-schema to update docs
