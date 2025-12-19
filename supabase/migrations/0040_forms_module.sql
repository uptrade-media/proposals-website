-- Migration: 0040_forms_module.sql
-- Add multi-tenant support to existing forms table

-- ============================================
-- Forms - Add org_id if missing
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forms' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE forms ADD COLUMN org_id UUID;
    CREATE INDEX idx_forms_org ON forms(org_id);
  END IF;
END $$;

-- ============================================
-- Form Submissions - Add org_id if missing
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_submissions' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE form_submissions ADD COLUMN org_id UUID;
    CREATE INDEX idx_form_submissions_org ON form_submissions(org_id);
  END IF;
END $$;

-- Add tenant_id to form_submissions if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_submissions' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE form_submissions ADD COLUMN tenant_id TEXT;
    CREATE INDEX idx_form_submissions_tenant ON form_submissions(tenant_id);
  END IF;
END $$;

-- ============================================
-- Helper function to increment blog views
-- ============================================
CREATE OR REPLACE FUNCTION increment_blog_views(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE blog_posts 
  SET views = COALESCE(views, 0) + 1 
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
