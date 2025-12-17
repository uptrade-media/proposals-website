-- Migration: Standardize feature keys in organizations.features
-- This ensures all sidebar feature keys match what's stored in the database

-- Update Uptrade Media features with standardized keys
UPDATE public.organizations 
SET features = '{
  "analytics": true,
  "blog": true,
  "portfolio": true,
  "projects": true,
  "proposals": true,
  "billing": true,
  "files": true,
  "messages": true,
  "email": true,
  "seo": true,
  "team": true,
  "team_metrics": true,
  "forms": true,
  "my_sales": false
}'::jsonb
WHERE slug = 'uptrade-media';

-- Add helpful comment
COMMENT ON COLUMN public.organizations.features IS 'Module toggles. Keys: analytics, blog, portfolio, projects, proposals, billing, files, messages, email, seo, team, team_metrics, forms, my_sales';
