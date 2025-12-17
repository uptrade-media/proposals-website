-- =====================================================
-- SEO MODULE - Link to Organizations (not contact_id based)
-- The seo_sites table tracks SEO for organization domains
-- Each org with SEO feature enabled has ONE site (their domain)
-- Run AFTER 0020_seo_module_foundation.sql
-- =====================================================

-- Add org_id column to seo_sites (main link to tenant)
ALTER TABLE seo_sites 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for org_id lookups
CREATE INDEX IF NOT EXISTS idx_seo_sites_org ON seo_sites(org_id);

-- Each org can only have ONE site (their own domain)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_sites_org_unique ON seo_sites(org_id);

-- Drop the old domain uniqueness constraint (domains can repeat across orgs isn't the issue anymore)
DROP INDEX IF EXISTS idx_seo_sites_domain;
DROP INDEX IF EXISTS idx_seo_sites_domain_org;

-- Comment
COMMENT ON COLUMN seo_sites.org_id IS 'Organization this SEO site belongs to - 1:1 relationship with org domain';
COMMENT ON TABLE seo_sites IS 'SEO tracking for organization domains. One site per org that has SEO feature enabled.';
