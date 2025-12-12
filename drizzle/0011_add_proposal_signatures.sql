-- Add signature fields to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_signature_url TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_signed_by TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_signed_at TIMESTAMP;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS admin_signature_url TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS admin_signed_by TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS admin_signed_at TIMESTAMP;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Add counter-sign token for admin magic link
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS counter_sign_token TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS counter_sign_token_expires TIMESTAMP;

COMMENT ON COLUMN proposals.client_signature_url IS 'URL to client signature image in Netlify Blobs';
COMMENT ON COLUMN proposals.client_signed_by IS 'Printed name entered by client when signing';
COMMENT ON COLUMN proposals.admin_signature_url IS 'URL to admin counter-signature image in Netlify Blobs';
COMMENT ON COLUMN proposals.admin_signed_by IS 'Printed name entered by admin when counter-signing';
COMMENT ON COLUMN proposals.hero_image_url IS 'Hero image URL for proposal display';
COMMENT ON COLUMN proposals.counter_sign_token IS 'Magic link token for admin counter-signing';
