-- Expose Organization Schemas to PostgREST API
-- This allows the Supabase JS client to query org_* schemas
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- STEP 1: Grant Usage on Schema
-- ============================================
-- Allow anon and authenticated roles to use the org schema
GRANT USAGE ON SCHEMA org_uptrade_media TO anon, authenticated, service_role;

-- ============================================
-- STEP 2: Grant Permissions on All Tables
-- ============================================
-- Grant full access to service_role (used by backend functions)
GRANT ALL ON ALL TABLES IN SCHEMA org_uptrade_media TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA org_uptrade_media TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA org_uptrade_media TO service_role;

-- Grant read access to authenticated users (can be restricted later with RLS)
GRANT SELECT ON ALL TABLES IN SCHEMA org_uptrade_media TO authenticated;

-- ============================================
-- STEP 3: Set Default Privileges for Future Tables
-- ============================================
-- Ensure any future tables in org_uptrade_media get proper permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA org_uptrade_media
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA org_uptrade_media
  GRANT SELECT ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA org_uptrade_media
  GRANT ALL ON SEQUENCES TO service_role;

-- ============================================
-- STEP 4: Update PostgREST Configuration
-- ============================================
-- Update the db-schema setting in PostgREST configuration
-- This is set via SQL by updating the PostgREST config

-- For Supabase, we need to update the pgrst.db_schemas setting
-- Run this to expose the org schema to the API:
ALTER DATABASE postgres SET "pgrst.db_schemas" TO 'public, org_uptrade_media';

-- If that doesn't work, Supabase may require restarting PostgREST service
-- which happens automatically, or you may need to contact support to add custom schemas

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this query to verify permissions:
-- 
-- SELECT 
--   schemaname,
--   tablename,
--   has_table_privilege('service_role', schemaname || '.' || tablename, 'SELECT') as service_can_select,
--   has_table_privilege('authenticated', schemaname || '.' || tablename, 'SELECT') as auth_can_select
-- FROM pg_tables 
-- WHERE schemaname = 'org_uptrade_media'
-- LIMIT 10;
