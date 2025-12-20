-- Migration: Add org_type to distinguish agency vs client organizations
-- This allows Uptrade Media (agency) to have full admin access while
-- client organizations show the tenant/client view

-- Add org_type column to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS org_type text DEFAULT 'client';

-- Add comment for documentation
COMMENT ON COLUMN organizations.org_type IS 'Organization type: agency (Uptrade Media) or client (tenant orgs)';

-- Update Uptrade Media to be the agency org
UPDATE organizations 
SET org_type = 'agency' 
WHERE slug = 'uptrade-media' 
   OR name ILIKE '%uptrade%media%'
   OR domain = 'uptrademedia.com';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_org_type ON organizations(org_type);

-- Add check constraint for valid values
ALTER TABLE organizations 
ADD CONSTRAINT chk_org_type CHECK (org_type IN ('agency', 'client'));
