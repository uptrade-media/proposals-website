-- Add hero_image_url column to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Add brand_name column for client brand display
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS brand_name TEXT;
