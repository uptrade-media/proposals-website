-- Add website field to contacts table
ALTER TABLE contacts ADD COLUMN website text;

-- Create index on website for search performance
CREATE INDEX idx_contacts_website ON contacts(website);
