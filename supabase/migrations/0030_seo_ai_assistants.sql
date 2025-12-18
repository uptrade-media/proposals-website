-- Migration: Add OpenAI Assistants API Tables
-- Enables persistent AI threads per site for context retention
-- Run in Supabase Dashboard SQL Editor

-- =====================================================
-- SEO AI ASSISTANTS - Persistent OpenAI Assistants
-- One assistant per organization, configured for their needs
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_ai_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- OpenAI IDs
  openai_assistant_id TEXT NOT NULL,
  openai_vector_store_id TEXT,          -- For file search capability
  
  -- Configuration
  name TEXT NOT NULL,
  description TEXT,
  model TEXT DEFAULT 'gpt-4o',
  instructions TEXT,                     -- System prompt for the assistant
  
  -- Capabilities
  tools JSONB DEFAULT '["code_interpreter"]', -- code_interpreter, file_search, function calling
  file_ids JSONB DEFAULT '[]',           -- Files attached to the assistant
  
  -- Usage tracking
  total_tokens_used BIGINT DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'active',          -- 'active', 'paused', 'deleted'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_org_assistant UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_seo_ai_assistants_org ON seo_ai_assistants(org_id);
CREATE INDEX IF NOT EXISTS idx_seo_ai_assistants_openai ON seo_ai_assistants(openai_assistant_id);

-- =====================================================
-- SEO AI THREADS - Persistent conversation threads per site
-- Each site has its own thread for context retention
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_ai_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES seo_ai_assistants(id) ON DELETE CASCADE,
  
  -- OpenAI Thread ID
  openai_thread_id TEXT NOT NULL,
  
  -- Thread type
  thread_type TEXT DEFAULT 'analysis',   -- 'analysis', 'chat', 'content', 'strategy'
  
  -- Context tracking
  last_context_snapshot JSONB,           -- Summary of key context points
  context_token_estimate INTEGER DEFAULT 0,
  
  -- Usage tracking
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  total_runs INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active',          -- 'active', 'archived', 'deleted'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_site_thread_type UNIQUE (site_id, thread_type)
);

CREATE INDEX IF NOT EXISTS idx_seo_ai_threads_site ON seo_ai_threads(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_ai_threads_openai ON seo_ai_threads(openai_thread_id);
CREATE INDEX IF NOT EXISTS idx_seo_ai_threads_assistant ON seo_ai_threads(assistant_id);

-- =====================================================
-- SEO AI THREAD MESSAGES - Message history tracking
-- Optional - OpenAI stores these, but useful for our auditing
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_ai_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES seo_ai_threads(id) ON DELETE CASCADE,
  site_id UUID REFERENCES seo_sites(id) ON DELETE SET NULL,
  
  -- OpenAI IDs
  openai_message_id TEXT NOT NULL,
  openai_run_id TEXT,
  
  -- Message content
  role TEXT NOT NULL,                    -- 'user', 'assistant'
  content TEXT,
  content_type TEXT DEFAULT 'text',      -- 'text', 'json', 'image'
  
  -- Attachments
  file_ids JSONB DEFAULT '[]',
  annotations JSONB DEFAULT '[]',
  
  -- Token usage
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Context
  analysis_type TEXT,                    -- 'metadata', 'content', 'technical', etc.
  run_id UUID REFERENCES seo_ai_analysis_runs(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_ai_messages_thread ON seo_ai_thread_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_seo_ai_messages_site ON seo_ai_thread_messages(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_ai_messages_openai ON seo_ai_thread_messages(openai_message_id);
CREATE INDEX IF NOT EXISTS idx_seo_ai_messages_created ON seo_ai_thread_messages(created_at DESC);

-- =====================================================
-- SEO AI RUNS - Track each Assistant run
-- More detailed than analysis_runs, specific to Assistant API
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES seo_ai_threads(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES seo_ai_assistants(id) ON DELETE SET NULL,
  site_id UUID REFERENCES seo_sites(id) ON DELETE SET NULL,
  
  -- OpenAI IDs
  openai_run_id TEXT NOT NULL,
  
  -- Run configuration
  model TEXT,
  instructions TEXT,                      -- Override instructions for this run
  tools_used JSONB DEFAULT '[]',
  
  -- Status tracking
  status TEXT NOT NULL,                   -- 'queued', 'in_progress', 'requires_action', 'completed', 'failed', 'cancelled', 'expired'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Error handling
  last_error JSONB,                       -- {code, message}
  
  -- Usage
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Tool calls
  tool_calls JSONB DEFAULT '[]',          -- Function calls made during this run
  tool_outputs JSONB DEFAULT '[]',
  
  -- Results
  output_message_id TEXT,
  recommendations_generated INTEGER DEFAULT 0,
  
  -- Metadata
  triggered_by TEXT,                      -- 'scheduled', 'manual', 'webhook'
  triggered_by_user UUID REFERENCES contacts(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_ai_runs_thread ON seo_ai_runs(thread_id);
CREATE INDEX IF NOT EXISTS idx_seo_ai_runs_site ON seo_ai_runs(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_ai_runs_status ON seo_ai_runs(status);
CREATE INDEX IF NOT EXISTS idx_seo_ai_runs_openai ON seo_ai_runs(openai_run_id);
CREATE INDEX IF NOT EXISTS idx_seo_ai_runs_created ON seo_ai_runs(created_at DESC);

-- =====================================================
-- Add thread references to existing tables
-- =====================================================

-- Add thread_id to analysis runs for linking
ALTER TABLE seo_ai_analysis_runs 
  ADD COLUMN IF NOT EXISTS ai_thread_id UUID REFERENCES seo_ai_threads(id),
  ADD COLUMN IF NOT EXISTS openai_run_id TEXT;

-- Add assistant_id to sites for quick lookup
ALTER TABLE seo_sites
  ADD COLUMN IF NOT EXISTS ai_thread_id UUID REFERENCES seo_ai_threads(id);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE seo_ai_assistants IS 'OpenAI Assistants configured per organization with custom instructions';
COMMENT ON TABLE seo_ai_threads IS 'Persistent conversation threads per site - maintains context across analyses';
COMMENT ON TABLE seo_ai_thread_messages IS 'Message history for auditing and context tracking';
COMMENT ON TABLE seo_ai_runs IS 'Individual Assistant API run tracking with detailed status and usage';

COMMENT ON COLUMN seo_ai_threads.openai_thread_id IS 'OpenAI thread_xxx ID for API calls';
COMMENT ON COLUMN seo_ai_threads.last_context_snapshot IS 'Summary of important context points to avoid re-analyzing';
COMMENT ON COLUMN seo_ai_assistants.openai_vector_store_id IS 'Vector store for file search with site content';
