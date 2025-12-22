-- ============================================
-- Marketing Email Templates Table
-- Stores reusable email templates for campaigns/newsletters
-- ============================================

-- Create table for storing marketing email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  thumbnail TEXT,
  
  -- Template content
  html TEXT NOT NULL,
  json_content JSONB, -- GrapesJS JSON for visual editing
  
  -- Flags
  is_global BOOLEAN DEFAULT FALSE, -- Global templates available to all orgs
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES contacts(id),
  use_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT valid_category CHECK (category IN (
    'welcome', 'newsletter', 'promotional', 'transactional', 
    'announcement', 'reengagement', 'custom'
  ))
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_org_id ON email_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_global ON email_templates(is_global) WHERE is_global = TRUE;
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read global templates or their org's templates
CREATE POLICY "Users can read accessible templates" ON email_templates
  FOR SELECT
  USING (
    is_global = TRUE
    OR org_id IN (
      SELECT organization_id FROM organization_members 
      WHERE contact_id = (SELECT id FROM contacts WHERE auth_user_id = auth.uid())
    )
  );

-- Policy: Admins can manage their org's templates
CREATE POLICY "Admins can manage org templates" ON email_templates
  FOR ALL
  USING (
    org_id IN (
      SELECT organization_id FROM organization_members 
      WHERE contact_id = (SELECT id FROM contacts WHERE auth_user_id = auth.uid())
      AND role IN ('admin', 'owner')
    )
  );

-- Policy: Super admins can manage global templates
CREATE POLICY "Super admins can manage global templates" ON email_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE auth_user_id = auth.uid() 
      AND is_super_admin = TRUE
    )
  );

-- Add comments
COMMENT ON TABLE email_templates IS 'Reusable marketing email templates for campaigns and newsletters';
COMMENT ON COLUMN email_templates.is_global IS 'If true, template is available to all organizations';
COMMENT ON COLUMN email_templates.json_content IS 'GrapesJS JSON format for visual editor';
COMMENT ON COLUMN email_templates.category IS 'Template category: welcome, newsletter, promotional, transactional, announcement, reengagement, custom';

-- ============================================
-- Seed global templates (migrated from email-templates.js)
-- ============================================

-- Welcome - Minimal
INSERT INTO email_templates (is_global, name, description, category, html) VALUES
(TRUE, 'Welcome - Minimal', 'Clean, minimal welcome email with clear CTA', 'welcome', 
'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
  <tr>
    <td style="padding: 60px 40px; text-align: center;">
      <img src="https://via.placeholder.com/120x40?text=LOGO" alt="Logo" style="max-width: 120px; height: auto; margin-bottom: 40px;" />
      <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 32px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">
        Welcome aboard, {{first_name}}! 👋
      </h1>
      <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 18px; line-height: 1.6; color: #666666; max-width: 480px; margin-left: auto; margin-right: auto;">
        We''re thrilled to have you join us. Your account is all set up and ready to go.
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
        <tr>
          <td style="background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%); border-radius: 8px;">
            <a href="#" style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
              Get Started →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f7;">
  <tr>
    <td style="padding: 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 14px; color: #666666;">
      <p style="margin: 0 0 8px 0;">Questions? Just reply to this email.</p>
      <p style="margin: 0;"><a href="{{unsubscribe_url}}" style="color: #666666; text-decoration: underline;">Unsubscribe</a></p>
    </td>
  </tr>
</table>'),

-- Newsletter - Weekly Digest
(TRUE, 'Newsletter - Weekly Digest', 'Professional weekly digest layout', 'newsletter',
'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f7;">
  <tr>
    <td style="padding: 40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%);">
            <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: #ffffff;">
              Weekly Digest 📬
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px;">
            <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
              Hi {{first_name}},
            </p>
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #666666;">
              Here''s what you might have missed this week:
            </p>
            <div style="padding: 20px; background-color: #f5f5f7; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 18px; color: #1a1a1a;">
                📰 Featured Article
              </h3>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 14px; color: #666666;">
                Your article summary goes here...
              </p>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>'),

-- Promotional - Flash Sale
(TRUE, 'Promotional - Flash Sale', 'Urgent flash sale with countdown feel', 'promotional',
'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a1a1a;">
  <tr>
    <td style="padding: 60px 40px; text-align: center;">
      <p style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #ff4444; text-transform: uppercase; letter-spacing: 2px;">
        ⚡ Limited Time Only ⚡
      </p>
      <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 48px; font-weight: 800; color: #ffffff;">
        FLASH SALE
      </h1>
      <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 24px; color: #4bbf39;">
        Save up to 50% today only!
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
        <tr>
          <td style="background-color: #4bbf39; border-radius: 8px;">
            <a href="#" style="display: inline-block; padding: 18px 48px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff; text-decoration: none;">
              Shop Now →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>'),

-- Transactional - Order Confirmation
(TRUE, 'Order Confirmation', 'Clean order confirmation with details', 'transactional',
'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f7;">
  <tr>
    <td style="padding: 40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px;">
        <tr>
          <td style="padding: 40px; text-align: center;">
            <div style="width: 60px; height: 60px; background-color: #4bbf39; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 30px;">✓</span>
            </div>
            <h1 style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: #1a1a1a;">
              Order Confirmed!
            </h1>
            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 16px; color: #666666;">
              Order #{{order_number}}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 40px 40px;">
            <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #666666;">
              Thank you for your order, {{first_name}}! We''ll send you a shipping confirmation once your order is on its way.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>'),

-- Announcement - Product Launch
(TRUE, 'Product Launch', 'Exciting product announcement', 'announcement',
'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  <tr>
    <td style="padding: 80px 40px; text-align: center;">
      <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 3px;">
        Introducing
      </p>
      <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 48px; font-weight: 800; color: #ffffff;">
        Something Amazing 🚀
      </h1>
      <p style="margin: 0 0 40px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 20px; line-height: 1.5; color: rgba(255,255,255,0.9); max-width: 480px; margin-left: auto; margin-right: auto;">
        The product you''ve been waiting for is finally here.
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
        <tr>
          <td style="background-color: #ffffff; border-radius: 8px;">
            <a href="#" style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #764ba2; text-decoration: none;">
              Learn More →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>'),

-- Re-engagement - We Miss You
(TRUE, 'We Miss You', 'Re-engagement for inactive users', 'reengagement',
'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
  <tr>
    <td style="padding: 60px 40px; text-align: center;">
      <p style="margin: 0 0 20px 0; font-size: 60px;">👋</p>
      <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 32px; font-weight: 700; color: #1a1a1a;">
        We miss you, {{first_name}}!
      </h1>
      <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 18px; line-height: 1.6; color: #666666; max-width: 480px; margin-left: auto; margin-right: auto;">
        It''s been a while since we''ve seen you. Here''s what you''ve been missing...
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
        <tr>
          <td style="background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%); border-radius: 8px;">
            <a href="#" style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
              Come Back →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>');
