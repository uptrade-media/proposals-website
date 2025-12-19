-- Migration: Blog Generation Jobs Table
-- Track async blog post generation jobs

CREATE TABLE IF NOT EXISTS blog_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress JSONB DEFAULT '{"stage": 0, "message": "Starting..."}',
  
  -- Input data
  form_data JSONB NOT NULL,
  
  -- Output
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
  result JSONB,
  error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  duration_ms INTEGER,
  openai_tokens INTEGER
);

-- Indexes
CREATE INDEX idx_blog_generation_jobs_status ON blog_generation_jobs(status);
CREATE INDEX idx_blog_generation_jobs_org_id ON blog_generation_jobs(org_id);
CREATE INDEX idx_blog_generation_jobs_created_at ON blog_generation_jobs(created_at DESC);

-- Cleanup old jobs after 7 days
CREATE INDEX idx_blog_generation_jobs_cleanup ON blog_generation_jobs(completed_at) 
WHERE completed_at IS NOT NULL;
