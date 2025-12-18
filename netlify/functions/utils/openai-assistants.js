// netlify/functions/utils/openai-assistants.js
// ═══════════════════════════════════════════════════════════════════════════════
// OpenAI Assistants API Utilities
// ═══════════════════════════════════════════════════════════════════════════════
// Provides persistent context through threads for each SEO site
// Each site gets its own conversation thread that retains all analysis history

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Model configuration - easily update when new models release
const DEFAULT_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

// ─────────────────────────────────────────────────────────────────────────────
// Assistant Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create or get the SEO Assistant for an organization
 */
export async function getOrCreateAssistant(supabase, orgId, orgName) {
  // Check if we already have an assistant for this org
  const { data: existing } = await supabase
    .from('seo_ai_assistants')
    .select('*')
    .eq('org_id', orgId)
    .single()

  if (existing?.openai_assistant_id) {
    // Verify it still exists in OpenAI
    try {
      await openai.beta.assistants.retrieve(existing.openai_assistant_id)
      return existing
    } catch (e) {
      if (e.status !== 404) throw e
      // Assistant was deleted, recreate it
    }
  }

  // Create new assistant
  const assistant = await openai.beta.assistants.create({
    name: `SEO Brain - ${orgName}`,
    instructions: getSEOAssistantInstructions(),
    model: DEFAULT_MODEL,
    tools: [
      { type: 'code_interpreter' },
      { type: 'file_search' }
    ]
  })

  // Store in database
  const { data: record, error } = await supabase
    .from('seo_ai_assistants')
    .upsert({
      org_id: orgId,
      openai_assistant_id: assistant.id,
      name: assistant.name,
      model: DEFAULT_MODEL,
      instructions: assistant.instructions,
      tools: ['code_interpreter', 'file_search'],
      status: 'active'
    }, { onConflict: 'org_id' })
    .select()
    .single()

  if (error) {
    console.error('[Assistants] Failed to store assistant:', error)
    throw error
  }

  console.log(`[Assistants] Created assistant ${assistant.id} for org ${orgId}`)
  return record
}

/**
 * Get the SEO assistant instructions (system prompt)
 */
function getSEOAssistantInstructions() {
  return `You are an expert SEO strategist and analyst working for a digital marketing agency. You have deep expertise in:

## Core Competencies
- Technical SEO (crawling, indexing, site speed, Core Web Vitals, structured data)
- On-page optimization (titles, meta descriptions, headings, content, internal linking)
- Keyword research and competitive analysis
- Content strategy and topic clustering
- Local SEO for service businesses
- E-commerce SEO
- Google Search Console data analysis
- SERP feature optimization (featured snippets, PAA, local pack)

## Your Role
You maintain persistent context about each website you analyze. When analyzing a site:
1. Remember previous analyses and recommendations
2. Track what changes were implemented and their impact
3. Build upon past insights rather than starting fresh
4. Identify patterns and trends over time
5. Prioritize recommendations based on impact and effort

## Communication Style
- Be specific and actionable - never vague
- Always provide the exact text for titles, meta descriptions, etc.
- Explain your reasoning briefly
- Prioritize by impact (traffic potential, business value)
- Consider the business context and target audience

## Output Format
When generating recommendations, structure them as JSON with:
{
  "recommendations": [
    {
      "category": "title|meta|content|technical|links|schema|keyword",
      "priority": "critical|high|medium|low",
      "page_url": "...",
      "title": "Short action title",
      "description": "What to do and why",
      "current_value": "...",
      "suggested_value": "...",
      "reasoning": "Why this matters",
      "effort": "instant|quick|medium|significant",
      "impact_estimate": "high|medium|low"
    }
  ],
  "insights": ["Key insight 1", "Key insight 2"],
  "next_priorities": ["What to focus on next"]
}

Remember: You have memory of all previous conversations about this site. Reference past recommendations and track progress.`
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or create a thread for a specific site
 */
export async function getOrCreateThread(supabase, siteId, assistantId, threadType = 'analysis') {
  // Check for existing thread
  const { data: existing } = await supabase
    .from('seo_ai_threads')
    .select('*')
    .eq('site_id', siteId)
    .eq('thread_type', threadType)
    .single()

  if (existing?.openai_thread_id) {
    // Verify thread still exists
    try {
      await openai.beta.threads.retrieve(existing.openai_thread_id)
      return existing
    } catch (e) {
      if (e.status !== 404) throw e
      // Thread was deleted, recreate
    }
  }

  // Create new thread
  const thread = await openai.beta.threads.create()

  // Store in database
  const { data: record, error } = await supabase
    .from('seo_ai_threads')
    .upsert({
      site_id: siteId,
      assistant_id: assistantId,
      openai_thread_id: thread.id,
      thread_type: threadType,
      status: 'active'
    }, { onConflict: 'site_id,thread_type' })
    .select()
    .single()

  if (error) {
    console.error('[Assistants] Failed to store thread:', error)
    throw error
  }

  // Update site with thread reference
  await supabase
    .from('seo_sites')
    .update({ ai_thread_id: record.id })
    .eq('id', siteId)

  console.log(`[Assistants] Created thread ${thread.id} for site ${siteId}`)
  return record
}

// ─────────────────────────────────────────────────────────────────────────────
// Message and Run Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a message to a thread and run the assistant
 */
export async function runAnalysis(supabase, {
  siteId,
  threadRecord,
  assistantRecord,
  message,
  additionalInstructions,
  analysisRunId
}) {
  const threadId = threadRecord.openai_thread_id
  const assistantId = assistantRecord.openai_assistant_id

  // Add user message to thread
  const userMessage = await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message
  })

  // Store message in our DB
  await supabase.from('seo_ai_thread_messages').insert({
    thread_id: threadRecord.id,
    site_id: siteId,
    openai_message_id: userMessage.id,
    role: 'user',
    content: message,
    run_id: analysisRunId
  })

  // Create and execute run
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
    additional_instructions: additionalInstructions,
    response_format: { type: 'json_object' }
  })

  // Store run record
  const { data: runRecord } = await supabase
    .from('seo_ai_runs')
    .insert({
      thread_id: threadRecord.id,
      assistant_id: assistantRecord.id,
      site_id: siteId,
      openai_run_id: run.id,
      model: run.model,
      instructions: additionalInstructions,
      status: run.status,
      triggered_by: 'analysis'
    })
    .select()
    .single()

  // Poll for completion
  const completedRun = await pollRunCompletion(threadId, run.id)

  // Update run record with final status
  await supabase
    .from('seo_ai_runs')
    .update({
      status: completedRun.status,
      completed_at: completedRun.completed_at ? new Date(completedRun.completed_at * 1000).toISOString() : null,
      failed_at: completedRun.failed_at ? new Date(completedRun.failed_at * 1000).toISOString() : null,
      prompt_tokens: completedRun.usage?.prompt_tokens,
      completion_tokens: completedRun.usage?.completion_tokens,
      total_tokens: completedRun.usage?.total_tokens,
      last_error: completedRun.last_error
    })
    .eq('id', runRecord.id)

  if (completedRun.status !== 'completed') {
    throw new Error(`Run failed with status: ${completedRun.status}`)
  }

  // Get assistant's response
  const messages = await openai.beta.threads.messages.list(threadId, {
    run_id: run.id
  })

  const assistantMessage = messages.data.find(m => m.role === 'assistant')
  
  if (!assistantMessage) {
    throw new Error('No assistant response received')
  }

  // Extract text content
  const content = assistantMessage.content
    .filter(c => c.type === 'text')
    .map(c => c.text.value)
    .join('\n')

  // Store assistant message
  await supabase.from('seo_ai_thread_messages').insert({
    thread_id: threadRecord.id,
    site_id: siteId,
    openai_message_id: assistantMessage.id,
    openai_run_id: run.id,
    role: 'assistant',
    content,
    prompt_tokens: completedRun.usage?.prompt_tokens,
    completion_tokens: completedRun.usage?.completion_tokens,
    total_tokens: completedRun.usage?.total_tokens,
    run_id: analysisRunId
  })

  // Update thread stats
  await supabase
    .from('seo_ai_threads')
    .update({
      message_count: threadRecord.message_count + 2,
      last_message_at: new Date().toISOString(),
      total_runs: threadRecord.total_runs + 1
    })
    .eq('id', threadRecord.id)

  // Update assistant usage
  await supabase
    .from('seo_ai_assistants')
    .update({
      total_tokens_used: assistantRecord.total_tokens_used + (completedRun.usage?.total_tokens || 0),
      total_runs: assistantRecord.total_runs + 1,
      last_run_at: new Date().toISOString()
    })
    .eq('id', assistantRecord.id)

  // Parse JSON response
  try {
    return JSON.parse(content)
  } catch (e) {
    // If not valid JSON, return as-is wrapped
    return { raw_response: content }
  }
}

/**
 * Poll for run completion with exponential backoff
 */
async function pollRunCompletion(threadId, runId, maxWaitMs = 300000) {
  const startTime = Date.now()
  let delay = 1000 // Start with 1 second

  while (Date.now() - startTime < maxWaitMs) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId)

    if (['completed', 'failed', 'cancelled', 'expired'].includes(run.status)) {
      return run
    }

    if (run.status === 'requires_action') {
      // Handle function calling if needed
      console.log('[Assistants] Run requires action - function calling not implemented yet')
      throw new Error('Run requires action - not implemented')
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, delay))
    
    // Exponential backoff with max of 10 seconds
    delay = Math.min(delay * 1.5, 10000)
  }

  throw new Error('Run timed out')
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build analysis context message for the assistant
 * @param {Object} params - Context parameters
 * @param {string} [params.learningContext] - Learning context from past outcomes
 */
export function buildAnalysisContext({
  site,
  knowledge,
  pages,
  gscData,
  analysisType,
  focusAreas,
  learningContext // NEW: Include learnings from past outcomes
}) {
  let context = `# Site Analysis Context\n\n`
  
  context += `## Site Information\n`
  context += `- Domain: ${site.domain || site.org?.domain}\n`
  context += `- Industry: ${knowledge?.industry || 'Not specified'}\n`
  context += `- Business Type: ${knowledge?.business_type || 'Not specified'}\n`
  context += `- Total Pages: ${pages.length}\n\n`
  
  // Include learning context if available
  if (learningContext) {
    context += learningContext
    context += `\n`
  }

  if (knowledge) {
    context += `## Business Context\n`
    if (knowledge.primary_services?.length) {
      context += `- Primary Services: ${JSON.stringify(knowledge.primary_services)}\n`
    }
    if (knowledge.target_personas?.length) {
      context += `- Target Personas: ${JSON.stringify(knowledge.target_personas)}\n`
    }
    if (knowledge.primary_competitors?.length) {
      context += `- Main Competitors: ${knowledge.primary_competitors.map(c => c.domain).join(', ')}\n`
    }
    context += `\n`
  }

  context += `## Analysis Request\n`
  context += `- Type: ${analysisType}\n`
  if (focusAreas?.length) {
    context += `- Focus Areas: ${focusAreas.join(', ')}\n`
  }
  context += `\n`

  // Add page data summary
  context += `## Page Data (${pages.length} pages)\n`
  context += `\`\`\`json\n${JSON.stringify(pages.slice(0, 50).map(p => ({
    url: p.url,
    title: p.managed_title || p.title,
    meta: p.managed_meta_description || p.meta_description,
    h1: p.h1,
    clicks: p.clicks_28d,
    impressions: p.impressions_28d
  })), null, 2)}\n\`\`\`\n\n`

  // Add top queries from GSC
  if (gscData?.queries?.length) {
    context += `## Top Search Queries (from Google Search Console)\n`
    context += `\`\`\`json\n${JSON.stringify(gscData.queries.slice(0, 30).map(q => ({
      query: q.query,
      page: q.page_url,
      position: q.avg_position_28d?.toFixed(1),
      clicks: q.clicks_28d,
      impressions: q.impressions_28d
    })), null, 2)}\n\`\`\`\n\n`
  }

  return context
}

/**
 * Build the analysis prompt for a specific analysis type
 */
export function buildAnalysisPrompt(analysisType, additionalContext = '') {
  const prompts = {
    comprehensive: `Perform a comprehensive SEO analysis of this site. Generate actionable recommendations for:
1. Title tags and meta descriptions that need optimization
2. Content gaps and opportunities
3. Technical issues
4. Internal linking improvements
5. Schema markup opportunities
6. Keyword opportunities (especially striking distance keywords)

Prioritize by impact. Include specific suggested text for any title/meta changes.`,

    metadata: `Analyze the title tags and meta descriptions for this site. For each page that needs improvement:
1. Evaluate current title/meta effectiveness
2. Suggest optimized versions with specific text
3. Explain why the change would improve CTR/rankings
4. Consider target keywords and search intent`,

    content: `Analyze content opportunities for this site:
1. Identify content gaps vs competitors
2. Find thin content that needs expansion
3. Suggest new content topics based on keyword opportunities
4. Identify content decay (older content losing rankings)`,

    technical: `Analyze technical SEO for this site:
1. Indexation issues
2. Crawlability problems
3. Site speed opportunities
4. Mobile usability
5. Core Web Vitals
6. Structured data opportunities`,

    keywords: `Analyze keyword opportunities:
1. Striking distance keywords (positions 8-20) that could reach page 1
2. High-impression, low-CTR opportunities
3. Keyword cannibalization issues
4. New keyword opportunities from competitors`,

    links: `Analyze internal linking:
1. Orphan pages
2. Pages that need more internal links
3. Anchor text optimization opportunities
4. Hub/spoke structure improvements`
  }

  let prompt = prompts[analysisType] || prompts.comprehensive
  
  if (additionalContext) {
    prompt += `\n\nAdditional Context:\n${additionalContext}`
  }

  prompt += `\n\nRemember: You have memory of previous analyses. Reference any past recommendations and their status.`
  prompt += `\nIMPORTANT: If learning data was provided, weight your recommendations toward patterns that have historically worked for this site. Avoid approaches that have previously failed unless you have a compelling reason to try again.`
  prompt += `\n\nRespond with a JSON object containing your recommendations and insights.`

  return prompt
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete a thread when a site is deleted
 */
export async function deleteThread(supabase, threadId) {
  const { data: thread } = await supabase
    .from('seo_ai_threads')
    .select('openai_thread_id')
    .eq('id', threadId)
    .single()

  if (thread?.openai_thread_id) {
    try {
      await openai.beta.threads.del(thread.openai_thread_id)
    } catch (e) {
      console.warn('[Assistants] Could not delete OpenAI thread:', e.message)
    }
  }

  await supabase.from('seo_ai_threads').delete().eq('id', threadId)
}

/**
 * Archive old threads to save context window
 */
export async function archiveOldThreads(supabase, olderThanDays = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const { data: oldThreads } = await supabase
    .from('seo_ai_threads')
    .select('id, openai_thread_id, site_id')
    .eq('status', 'active')
    .lt('last_message_at', cutoffDate.toISOString())

  for (const thread of (oldThreads || [])) {
    // Archive the thread (we keep the DB record, just mark as archived)
    await supabase
      .from('seo_ai_threads')
      .update({ status: 'archived' })
      .eq('id', thread.id)
    
    // The OpenAI thread still exists - we'll recreate when needed
  }

  return oldThreads?.length || 0
}

export default {
  getOrCreateAssistant,
  getOrCreateThread,
  runAnalysis,
  buildAnalysisContext,
  buildAnalysisPrompt,
  deleteThread,
  archiveOldThreads
}
