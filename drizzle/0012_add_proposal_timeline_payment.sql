-- Add timeline and payment_terms columns to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS timeline TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Add comments
COMMENT ON COLUMN proposals.timeline IS 'Project timeline (e.g., "6 weeks")';
COMMENT ON COLUMN proposals.payment_terms IS 'Payment terms (e.g., "100% upfront", "50/50")';
