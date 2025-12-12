-- Add metadata column to proposals table for AI edit tracking
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Update existing rows to have empty object
UPDATE proposals SET metadata = '{}'::jsonb WHERE metadata IS NULL;
