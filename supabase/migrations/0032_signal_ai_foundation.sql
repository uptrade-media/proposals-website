-- Migration: Signal AI System Foundation
-- The unified AI layer across all portal modules
-- Run in Supabase Dashboard SQL Editor

-- =====================================================
-- SIGNAL SKILLS - Module-specific AI capabilities
-- =====================================================
CREATE TABLE IF NOT EXISTS signal_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Skill identity
  skill_key TEXT UNIQUE NOT NULL,          -- 'seo', 'crm', 'proposals', 'content', 'billing', 'support', 'ads'
  name TEXT NOT NULL,
  description TEXT,
  
  -- Capability definition
  allowed_tools JSONB DEFAULT '[]',        -- List of tools this skill can use
  allowed_data_scopes JSONB DEFAULT '[]',  -- What data can this skill access
  output_schema JSONB,                     -- Expected output structure
  
  -- Configuration
  model TEXT DEFAULT 'gpt-4o',             -- AI model for this skill
  temperature DECIMAL(2,1) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4000,
  requires_citations BOOLEAN DEFAULT true,
  min_confidence DECIMAL(3,2) DEFAULT 0.7,
  
  -- System prompt components
  system_prompt TEXT,                      -- Base system prompt for this skill
  tool_descriptions JSONB,                 -- How to use each tool
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SIGNAL MEMORY - Shared context and conversation history
-- =====================================================
CREATE TABLE IF NOT EXISTS signal_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES seo_sites(id) ON DELETE CASCADE,  -- Optional, for SEO-specific memory
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Memory type
  memory_type TEXT NOT NULL,               -- 'conversation', 'decision', 'preference', 'learning', 'context'
  skill_key TEXT REFERENCES signal_skills(skill_key),
  
  -- Content
  key TEXT NOT NULL,                       -- Identifier within type
  value JSONB NOT NULL,
  
  -- Metadata
  importance DECIMAL(3,2) DEFAULT 0.5,     -- 0-1, for memory pruning
  expires_at TIMESTAMPTZ,                  -- Optional expiration
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signal_memory_org ON signal_memory(org_id);
CREATE INDEX idx_signal_memory_skill ON signal_memory(skill_key);
CREATE INDEX idx_signal_memory_type ON signal_memory(memory_type);
CREATE UNIQUE INDEX idx_signal_memory_unique ON signal_memory(org_id, skill_key, memory_type, key);

-- =====================================================
-- SIGNAL CONVERSATIONS - Echo conversation threads
-- =====================================================
CREATE TABLE IF NOT EXISTS signal_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Conversation context
  skill_key TEXT REFERENCES signal_skills(skill_key),
  context_type TEXT,                       -- 'module', 'global', 'widget'
  context_id TEXT,                         -- Module-specific context (e.g., page_id, proposal_id)
  
  -- Thread metadata
  title TEXT,
  summary TEXT,                            -- AI-generated summary
  message_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active',            -- 'active', 'resolved', 'archived'
  resolved_by TEXT,                        -- 'user', 'echo', 'timeout'
  
  -- Timestamps
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signal_conversations_org ON signal_conversations(org_id);
CREATE INDEX idx_signal_conversations_user ON signal_conversations(user_id);
CREATE INDEX idx_signal_conversations_skill ON signal_conversations(skill_key);

-- =====================================================
-- SIGNAL MESSAGES - Individual messages in conversations
-- =====================================================
CREATE TABLE IF NOT EXISTS signal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES signal_conversations(id) ON DELETE CASCADE,
  
  -- Message content
  role TEXT NOT NULL,                      -- 'user', 'echo', 'system'
  content TEXT NOT NULL,
  
  -- Structured data (for tool calls, actions)
  tool_calls JSONB,                        -- Tools invoked
  tool_results JSONB,                      -- Results from tools
  actions_taken JSONB,                     -- Actions executed
  
  -- AI metadata
  model TEXT,
  tokens_used INTEGER,
  confidence DECIMAL(3,2),
  citations JSONB,                         -- Sources cited
  
  -- User feedback
  rating INTEGER,                          -- 1-5 stars
  feedback TEXT,
  was_helpful BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signal_messages_conversation ON signal_messages(conversation_id);
CREATE INDEX idx_signal_messages_role ON signal_messages(role);

-- =====================================================
-- SIGNAL ACTIONS - Trackable AI-initiated actions
-- =====================================================
CREATE TABLE IF NOT EXISTS signal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  skill_key TEXT REFERENCES signal_skills(skill_key),
  conversation_id UUID REFERENCES signal_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES signal_messages(id) ON DELETE SET NULL,
  
  -- Action details
  action_type TEXT NOT NULL,               -- 'recommendation', 'edit', 'create', 'send', 'analyze'
  action_target TEXT,                      -- What was acted on (table.id)
  action_data JSONB,                       -- Action parameters
  
  -- Execution
  status TEXT DEFAULT 'pending',           -- 'pending', 'accepted', 'rejected', 'executed', 'rolled_back'
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES contacts(id),
  
  -- Outcome tracking
  outcome_measured BOOLEAN DEFAULT false,
  outcome_data JSONB,                      -- Measured results
  outcome_score INTEGER,                   -- -100 to +100
  outcome_measured_at TIMESTAMPTZ,
  
  -- AI metadata
  confidence DECIMAL(3,2),
  reasoning TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signal_actions_org ON signal_actions(org_id);
CREATE INDEX idx_signal_actions_skill ON signal_actions(skill_key);
CREATE INDEX idx_signal_actions_status ON signal_actions(status);
CREATE INDEX idx_signal_actions_outcome ON signal_actions(outcome_measured) WHERE outcome_measured = false;

-- =====================================================
-- SIGNAL PATTERNS - Learned patterns by vertical/context
-- =====================================================
CREATE TABLE IF NOT EXISTS signal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern scope
  skill_key TEXT REFERENCES signal_skills(skill_key),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = global pattern
  industry TEXT,                           -- Industry vertical
  
  -- Pattern definition
  pattern_type TEXT NOT NULL,              -- 'successful_action', 'failed_action', 'preference', 'workflow'
  pattern_key TEXT NOT NULL,
  pattern_description TEXT,
  
  -- Evidence
  supporting_actions INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  avg_outcome_score DECIMAL(5,2),
  
  -- Pattern data
  pattern_data JSONB,                      -- The actual pattern
  examples JSONB DEFAULT '[]',
  counter_examples JSONB DEFAULT '[]',
  
  -- Usage
  times_applied INTEGER DEFAULT 0,
  last_applied_at TIMESTAMPTZ,
  
  -- Confidence
  confidence DECIMAL(3,2) DEFAULT 0.5,
  confidence_level TEXT,                   -- 'high', 'medium', 'low'
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  validated_by UUID REFERENCES contacts(id),
  validated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signal_patterns_skill ON signal_patterns(skill_key);
CREATE INDEX idx_signal_patterns_org ON signal_patterns(org_id);
CREATE INDEX idx_signal_patterns_industry ON signal_patterns(industry);
CREATE INDEX idx_signal_patterns_confidence ON signal_patterns(confidence DESC);
CREATE UNIQUE INDEX idx_signal_patterns_unique ON signal_patterns(skill_key, COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), pattern_type, pattern_key);

-- =====================================================
-- SIGNAL AUDIT LOG - Complete audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS signal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  skill_key TEXT,
  conversation_id UUID,
  action_id UUID,
  
  -- Event
  event_type TEXT NOT NULL,                -- 'request', 'response', 'action', 'error', 'feedback'
  event_data JSONB,
  
  -- Performance
  duration_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signal_audit_org ON signal_audit_log(org_id);
CREATE INDEX idx_signal_audit_skill ON signal_audit_log(skill_key);
CREATE INDEX idx_signal_audit_type ON signal_audit_log(event_type);
CREATE INDEX idx_signal_audit_time ON signal_audit_log(created_at DESC);

-- =====================================================
-- Insert default skills
-- =====================================================
INSERT INTO signal_skills (skill_key, name, description, allowed_tools, allowed_data_scopes, system_prompt) VALUES
('seo', 'SEO Skill', 'Search engine optimization analysis, recommendations, and content optimization', 
  '["analyze_page", "generate_metadata", "find_keywords", "check_rankings", "detect_issues", "suggest_internal_links", "generate_schema"]',
  '["seo_sites", "seo_pages", "seo_gsc_queries", "seo_keywords", "seo_recommendations"]',
  'You are Signal''s SEO expert. Analyze search performance, generate recommendations, and help optimize content for search engines. Always cite data sources and provide confidence levels.'),

('crm', 'CRM Skill', 'Lead management, follow-up suggestions, and customer relationship insights',
  '["score_lead", "suggest_followup", "analyze_pipeline", "draft_email", "find_opportunities"]',
  '["contacts", "crm_prospects", "crm_activities", "crm_emails", "crm_calls"]',
  'You are Signal''s CRM expert. Help manage leads, suggest follow-ups, and provide insights on the sales pipeline. Be action-oriented and prioritize by urgency.'),

('proposals', 'Proposal Skill', 'Generate, edit, and optimize client proposals',
  '["draft_proposal", "estimate_pricing", "suggest_services", "analyze_client_needs", "format_proposal"]',
  '["proposals", "proposal_line_items", "contacts", "projects"]',
  'You are Signal''s proposal expert. Create compelling proposals that match client needs with appropriate services and pricing. Be professional and persuasive.'),

('content', 'Content Skill', 'Blog posts, articles, and content strategy',
  '["generate_outline", "write_content", "optimize_seo", "suggest_topics", "check_readability"]',
  '["blog_posts", "seo_content_briefs", "seo_keywords", "seo_pages"]',
  'You are Signal''s content expert. Write engaging, SEO-optimized content that educates and converts. Always maintain brand voice and cite sources.'),

('billing', 'Billing Skill', 'Invoice management, payment reminders, and revenue insights',
  '["draft_invoice", "send_reminder", "analyze_revenue", "forecast_payments", "suggest_pricing"]',
  '["invoices", "projects", "contacts"]',
  'You are Signal''s billing expert. Help manage invoices, send appropriate reminders, and provide revenue insights. Be professional and tactful about payments.'),

('support', 'Support Skill', 'Client support, issue triage, and knowledge base',
  '["triage_issue", "suggest_solution", "draft_response", "escalate", "find_documentation"]',
  '["messages", "contacts", "projects", "files"]',
  'You are Signal''s support expert. Help resolve client issues quickly and professionally. Prioritize by urgency and escalate when needed.'),

('router', 'Router Skill', 'Global routing and status reporting',
  '["check_status", "route_request", "summarize_activity", "find_context"]',
  '["*"]',
  'You are Signal''s router. Determine which skill should handle a request, provide cross-module status updates, and route users to the right place.')

ON CONFLICT (skill_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  allowed_tools = EXCLUDED.allowed_tools,
  allowed_data_scopes = EXCLUDED.allowed_data_scopes,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = NOW();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE signal_skills IS 'Signal AI skill definitions - each module has its own skill';
COMMENT ON TABLE signal_memory IS 'Shared memory across Signal skills - preferences, context, learnings';
COMMENT ON TABLE signal_conversations IS 'Echo conversation threads';
COMMENT ON TABLE signal_messages IS 'Individual messages in Echo conversations';
COMMENT ON TABLE signal_actions IS 'Trackable actions recommended or taken by Signal';
COMMENT ON TABLE signal_patterns IS 'Learned patterns from outcomes - what works by vertical';
COMMENT ON TABLE signal_audit_log IS 'Complete audit trail of all Signal operations';

COMMENT ON COLUMN signal_skills.allowed_tools IS 'JSON array of tool names this skill can invoke';
COMMENT ON COLUMN signal_skills.allowed_data_scopes IS 'JSON array of tables/data this skill can access';
COMMENT ON COLUMN signal_memory.importance IS '0-1 importance for memory pruning - higher is more important';
COMMENT ON COLUMN signal_actions.outcome_score IS '-100 (bad) to +100 (great) based on measured results';
