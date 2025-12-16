-- Multi-Tenant Foundation Migration
-- Run this in Supabase Dashboard SQL Editor
-- Creates the core tables for multi-tenant architecture

-- ============================================
-- STEP 1: Create Organizations Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- 'uptrade-media', 'client-xyz', etc.
  name TEXT NOT NULL,
  domain TEXT, -- Their website domain (e.g., 'clientsite.com')
  logo_url TEXT,
  schema_name TEXT UNIQUE NOT NULL, -- 'org_uptrade_media', 'org_client_xyz'
  
  -- Feature flags (modular portal components)
  features JSONB DEFAULT '{
    "analytics": true,
    "blog": false,
    "crm": false,
    "projects": false,
    "proposals": false,
    "billing": false,
    "ecommerce": false,
    "files": true,
    "messages": true,
    "email_manager": false,
    "seo": false
  }',
  
  -- Custom CRM fields for client-specific needs
  -- Example: [{"name": "Budget", "type": "number"}, {"name": "Status", "type": "select", "options": ["pending", "approved"]}]
  crm_fields JSONB DEFAULT '[]',
  
  -- Branding/theming
  theme JSONB DEFAULT '{
    "primaryColor": "#4bbf39",
    "logoUrl": null,
    "faviconUrl": null
  }',
  
  -- Subscription info (for future billing)
  plan TEXT DEFAULT 'free', -- 'free', 'basic', 'pro', 'enterprise'
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orgs_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_orgs_schema ON public.organizations(schema_name);
CREATE INDEX IF NOT EXISTS idx_orgs_status ON public.organizations(status);

-- ============================================
-- STEP 2: Create Organization Secrets Table
-- ============================================
-- Stores API keys and credentials per tenant
CREATE TABLE IF NOT EXISTS public.organization_secrets (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Email (Resend)
  resend_api_key TEXT,
  resend_from_email TEXT,
  
  -- Gmail OAuth
  gmail_client_id TEXT,
  gmail_client_secret TEXT,
  gmail_refresh_token TEXT,
  
  -- Square Payments
  square_access_token TEXT,
  square_location_id TEXT,
  square_environment TEXT DEFAULT 'sandbox', -- 'sandbox' or 'production'
  
  -- Google Search Console (for SEO module)
  gsc_client_id TEXT,
  gsc_client_secret TEXT,
  gsc_refresh_token TEXT,
  
  -- Google Analytics
  ga_property_id TEXT,
  ga_credentials JSONB, -- Service account JSON
  
  -- OpenPhone (Uptrade only)
  openphone_api_key TEXT,
  
  -- Custom integrations (flexible key-value)
  custom_secrets JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create User-Organization Mapping
-- ============================================
-- Track which users have access to which organizations
CREATE TABLE IF NOT EXISTS public.user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL, -- Email is universal identifier
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
  is_primary BOOLEAN DEFAULT false, -- Their default org when logging in
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_email, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_orgs_email ON public.user_organizations(user_email);
CREATE INDEX IF NOT EXISTS idx_user_orgs_org ON public.user_organizations(organization_id);

-- ============================================
-- STEP 4: Create Super Admins Table
-- ============================================
-- Super admins can access ALL organizations (Uptrade team)
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_email TEXT PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 5: Create Organization Access Logs
-- ============================================
-- Audit trail for organization access
CREATE TABLE IF NOT EXISTS public.org_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'login', 'switch', 'view', 'create', 'update', 'delete'
  resource_type TEXT, -- 'tenant', 'user', 'settings', etc.
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_email ON public.org_access_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_access_logs_org ON public.org_access_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON public.org_access_logs(created_at DESC);

-- ============================================
-- STEP 6: Create Helper Functions
-- ============================================

-- Function to set search_path for schema-based queries
CREATE OR REPLACE FUNCTION public.set_org_schema(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('SET search_path TO %I, public', schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current schema
CREATE OR REPLACE FUNCTION public.get_current_schema()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('search_path');
END;
$$ LANGUAGE plpgsql;

-- Function to execute arbitrary SQL (SUPER ADMIN ONLY - use with caution)
-- This is needed for dynamic schema and table creation
CREATE OR REPLACE FUNCTION public.execute_sql(sql TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict execute_sql to service_role only
REVOKE ALL ON FUNCTION public.execute_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_sql(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.execute_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql(TEXT) TO service_role;

-- ============================================
-- STEP 7: Seed Uptrade Media as First Tenant
-- ============================================
INSERT INTO public.organizations (
  slug,
  name,
  domain,
  schema_name,
  features,
  plan,
  status
) VALUES (
  'uptrade-media',
  'Uptrade Media',
  'uptrademedia.com',
  'org_uptrade_media',
  '{
    "analytics": true,
    "blog": true,
    "crm": true,
    "projects": true,
    "proposals": true,
    "billing": true,
    "ecommerce": false,
    "files": true,
    "messages": true,
    "email_manager": true,
    "seo": true
  }',
  'enterprise',
  'active'
) ON CONFLICT (slug) DO NOTHING;

-- Create secrets record for Uptrade (empty - will populate from env vars or UI)
INSERT INTO public.organization_secrets (organization_id)
SELECT id FROM public.organizations WHERE slug = 'uptrade-media'
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 8: Add Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_secrets_updated_at
  BEFORE UPDATE ON public.organization_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DONE! Next steps:
-- 1. Run this migration in Supabase Dashboard
-- 2. Add your email to super_admins table
-- 3. Add your email to user_organizations for uptrade-media
-- 4. Create the org_uptrade_media schema (next migration)
-- ============================================

-- Example: Add super admin (run separately after migration)
-- INSERT INTO public.super_admins (user_email, name) VALUES ('your-email@example.com', 'Your Name');

-- Example: Link user to Uptrade org (run separately after migration)
-- INSERT INTO public.user_organizations (user_email, organization_id, role, is_primary)
-- SELECT 'your-email@example.com', id, 'owner', true
-- FROM public.organizations WHERE slug = 'uptrade-media';
