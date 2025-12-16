-- Run this in Supabase Dashboard SQL Editor
-- Replace the email with your actual Supabase Auth email

-- 1. Add yourself as super admin
INSERT INTO public.super_admins (user_email, name) 
VALUES ('ramsey@uptrademedia.com', 'Ramsey Deal')
ON CONFLICT (user_email) DO NOTHING;

-- 2. Link your user to the Uptrade Media organization
INSERT INTO public.user_organizations (user_email, organization_id, role, is_primary)
SELECT 'ramsey@uptrademedia.com', id, 'owner', true
FROM public.organizations 
WHERE slug = 'uptrade-media'
ON CONFLICT (user_email, organization_id) DO UPDATE SET role = 'owner', is_primary = true;

-- 3. Also ensure your contact record has admin role (in case isSuperAdmin check fails)
UPDATE org_uptrade_media.contacts 
SET role = 'admin', is_team_member = true, team_role = 'admin'
WHERE email ILIKE 'ramsey@uptrademedia.com';

-- Verify it worked:
SELECT 'super_admins' as table_name, user_email, name FROM public.super_admins WHERE user_email ILIKE '%ramsey%'
UNION ALL
SELECT 'user_organizations', user_email, role FROM public.user_organizations WHERE user_email ILIKE '%ramsey%'
UNION ALL  
SELECT 'contacts', email, role FROM org_uptrade_media.contacts WHERE email ILIKE '%ramsey%';
