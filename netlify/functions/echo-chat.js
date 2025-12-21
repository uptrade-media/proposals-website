// netlify/functions/echo-chat.js
// Echo as Teammate: AI chat endpoint for internal messaging
// Wraps Signal AI for use within the messaging system

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// =====================================================
// ECHO PERSONALITY: Internal teammate mode
// =====================================================
const ECHO_SYSTEM_PROMPT = `You are Echo, an AI teammate within a marketing agency portal. You help internal team members with their work.

## Your Personality
- You're a helpful, knowledgeable colleague - not a chatbot
- Be direct and efficient - these are busy professionals
- Use casual but professional tone (like Slack messages)
- Show personality - you can use emojis sparingly 
- Admit when you don't know something

## Your Capabilities
- **SEO Analysis**: Rankings, traffic trends, keyword opportunities
- **CRM Insights**: Lead status, follow-up recommendations, client notes
- **Content Help**: Draft blog posts, meta descriptions, social copy
- **Data Lookup**: Client info, project status, invoices
- **Task Suggestions**: Based on patterns and priorities

## Response Style
- Keep responses concise - this is messaging, not documentation
- Use bullet points and bold for scannable info
- Include relevant data when available
- Suggest next actions when appropriate
- Link to relevant parts of the portal when helpful

## Safety
- Only access data the user has permission to see
- Don't reveal other clients' data
- Refer to the project/org context provided`

// =====================================================
// ECHO TOOLS: Internal actions
// =====================================================
const ECHO_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getProjectData',
      description: 'Get data about a specific project including SEO metrics, tasks, milestones',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID to look up' },
          dataType: { 
            type: 'string', 
            enum: ['overview', 'seo', 'tasks', 'milestones', 'files'],
            description: 'Type of data to retrieve'
          }
        },
        required: ['projectId', 'dataType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getContactInfo',
      description: 'Get information about a contact/lead including activity history',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Name, email, or company to search for' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSEOMetrics',
      description: 'Get SEO performance metrics for a project or domain',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID to analyze' },
          timeframe: { 
            type: 'string', 
            enum: ['7d', '30d', '90d'],
            description: 'Time period for metrics'
          }
        },
        required: ['projectId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getFollowUpRecommendations',
      description: 'Get AI-powered recommendations for leads to follow up with',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max number of recommendations' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createReminder',
      description: 'Create a reminder or task for the user',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task/reminder title' },
          dueDate: { type: 'string', description: 'Due date (ISO format)' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          relatedContactId: { type: 'string', description: 'Related contact ID if applicable' }
        },
        required: ['title']
      }
    }
  }
]

// =====================================================
// TOOL EXECUTION
// =====================================================
async function executeEchoTool(toolName, args, context, supabase) {
  const { orgId, userId } = context
  
  switch (toolName) {
    case 'getProjectData': {
      const { projectId, dataType } = args
      
      // Verify project access
      const { data: project } = await supabase
        .from('projects')
        .select('*, clients:contacts(name, company)')
        .eq('id', projectId)
        .eq('org_id', orgId)
        .single()
      
      if (!project) {
        return { result: 'Project not found or access denied.' }
      }
      
      let result = `**${project.title || project.clients?.company || 'Project'}**\n`
      
      switch (dataType) {
        case 'overview':
          result += `- Status: ${project.status || 'Active'}\n`
          result += `- Client: ${project.clients?.name || 'N/A'}\n`
          result += `- Created: ${new Date(project.created_at).toLocaleDateString()}\n`
          break
          
        case 'seo':
          // Get SEO metrics
          const { data: seoMetrics } = await supabase
            .from('seo_performance_tracking')
            .select('*')
            .eq('project_id', projectId)
            .order('tracked_at', { ascending: false })
            .limit(1)
            .single()
          
          if (seoMetrics) {
            result += `- Organic Traffic: ${seoMetrics.organic_traffic?.toLocaleString() || 'N/A'}\n`
            result += `- Keywords Ranking: ${seoMetrics.keywords_ranking || 'N/A'}\n`
            result += `- Top 10 Keywords: ${seoMetrics.keywords_top_10 || 'N/A'}\n`
          } else {
            result += '- No SEO data available yet\n'
          }
          break
          
        case 'tasks':
          // Get recent tasks
          const { data: tasks } = await supabase
            .from('seo_tasks')
            .select('title, status, priority, due_date')
            .eq('project_id', projectId)
            .neq('status', 'completed')
            .order('due_date', { ascending: true })
            .limit(5)
          
          if (tasks?.length) {
            result += 'Open tasks:\n'
            tasks.forEach(t => {
              result += `- ${t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'} ${t.title}\n`
            })
          } else {
            result += '- No open tasks\n'
          }
          break
          
        default:
          result += `- Data type "${dataType}" not implemented yet\n`
      }
      
      return { result }
    }

    case 'getContactInfo': {
      const { query } = args
      
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, email, company, phone, status, pipeline_stage, last_contact_at, notes')
        .eq('org_id', orgId)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
        .limit(3)
      
      if (!contacts?.length) {
        return { result: `No contacts found matching "${query}"` }
      }
      
      let result = ''
      contacts.forEach(c => {
        result += `**${c.name}** ${c.company ? `(${c.company})` : ''}\n`
        result += `- Email: ${c.email || 'N/A'}\n`
        result += `- Phone: ${c.phone || 'N/A'}\n`
        result += `- Status: ${c.status || 'N/A'} | Stage: ${c.pipeline_stage || 'N/A'}\n`
        if (c.last_contact_at) {
          result += `- Last contact: ${new Date(c.last_contact_at).toLocaleDateString()}\n`
        }
        result += '\n'
      })
      
      return { result: result.trim() }
    }

    case 'getSEOMetrics': {
      const { projectId, timeframe = '30d' } = args
      
      // Get project SEO data
      const { data: project } = await supabase
        .from('projects')
        .select('id, title, domain, clients:contacts(company)')
        .eq('id', projectId)
        .eq('org_id', orgId)
        .single()
      
      if (!project) {
        return { result: 'Project not found or access denied.' }
      }
      
      // Get performance data
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
      const days = daysMap[timeframe] || 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const { data: metrics } = await supabase
        .from('seo_performance_tracking')
        .select('*')
        .eq('project_id', projectId)
        .gte('tracked_at', startDate.toISOString())
        .order('tracked_at', { ascending: true })
      
      let result = `**SEO Report: ${project.clients?.company || project.title}** (Last ${timeframe})\n\n`
      
      if (metrics?.length >= 2) {
        const first = metrics[0]
        const last = metrics[metrics.length - 1]
        
        const trafficChange = last.organic_traffic - first.organic_traffic
        const trafficPct = first.organic_traffic ? Math.round((trafficChange / first.organic_traffic) * 100) : 0
        
        result += `📈 **Traffic**: ${last.organic_traffic?.toLocaleString() || 'N/A'} `
        result += trafficChange >= 0 ? `(+${trafficPct}%)` : `(${trafficPct}%)`
        result += '\n'
        
        result += `🔑 **Keywords**: ${last.keywords_ranking || 'N/A'} ranking`
        result += ` | Top 10: ${last.keywords_top_10 || 'N/A'}\n`
      } else {
        result += 'Not enough data for trend analysis yet.\n'
      }
      
      return { result }
    }

    case 'getFollowUpRecommendations': {
      const limit = args.limit || 5
      
      // Get contacts that need follow-up
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, email, company, last_contact_at, pipeline_stage, lead_score')
        .eq('org_id', orgId)
        .eq('is_ai', false)
        .in('pipeline_stage', ['lead', 'prospect', 'qualified'])
        .order('last_contact_at', { ascending: true, nullsFirst: true })
        .limit(limit)
      
      if (!contacts?.length) {
        return { result: 'No leads currently need follow-up. Nice work! 🎉' }
      }
      
      let result = '**Recommended Follow-ups:**\n\n'
      contacts.forEach((c, i) => {
        const daysSince = c.last_contact_at 
          ? Math.floor((Date.now() - new Date(c.last_contact_at)) / (1000 * 60 * 60 * 24))
          : null
        
        result += `${i + 1}. **${c.name}** ${c.company ? `(${c.company})` : ''}\n`
        result += `   Stage: ${c.pipeline_stage || 'Unknown'}`
        if (daysSince !== null) {
          result += ` | Last contact: ${daysSince}d ago`
        } else {
          result += ` | Never contacted`
        }
        if (c.lead_score) {
          result += ` | Score: ${c.lead_score}`
        }
        result += '\n'
      })
      
      return { result }
    }

    case 'createReminder': {
      const { title, dueDate, priority = 'medium', relatedContactId } = args
      
      // Create task/reminder (using call_tasks table or similar)
      const { data: task, error } = await supabase
        .from('call_tasks')
        .insert({
          org_id: orgId,
          contact_id: relatedContactId || null,
          task_text: title,
          priority,
          status: 'pending',
          due_date: dueDate || null,
          assigned_to: userId,
          source: 'echo'
        })
        .select('id')
        .single()
      
      if (error) {
        return { result: `Couldn't create reminder: ${error.message}` }
      }
      
      return { 
        result: `✅ Reminder created: "${title}"${dueDate ? ` (due ${new Date(dueDate).toLocaleDateString()})` : ''}` 
      }
    }

    default:
      return { result: 'Unknown tool' }
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================
export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }
  
  try {
    // Authenticate user
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }
    
    const supabase = createSupabaseAdmin()
    
    // Parse request
    const { 
      message, 
      conversationId,
      threadType = 'echo',
      projectId,
      history = []
    } = JSON.parse(event.body || '{}')
    
    if (!message) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Message is required' })
      }
    }
    
    // Get Echo contact for this org
    const { data: echoContact } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('org_id', contact.org_id)
      .eq('is_ai', true)
      .single()
    
    if (!echoContact) {
      // Create Echo if doesn't exist
      const { data: newEcho } = await supabase.rpc('create_echo_contact_for_org', {
        p_org_id: contact.org_id
      })
    }
    
    // Get or create Signal conversation for context persistence
    let signalConversationId = conversationId
    
    if (!signalConversationId) {
      // Create new Signal conversation
      const { data: conv } = await supabase
        .from('signal_conversations')
        .insert({
          project_id: projectId,
          session_id: `echo_${contact.id}_${Date.now()}`,
          visitor_name: contact.name,
          visitor_email: contact.email,
          status: 'active',
          source: 'echo_chat',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single()
      
      signalConversationId = conv?.id
    }
    
    // Build context
    const context = {
      orgId: contact.org_id,
      userId: contact.id,
      userName: contact.name,
      userRole: contact.role,
      projectId
    }
    
    // Initialize OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    // Build messages array
    const messages = [
      { role: 'system', content: ECHO_SYSTEM_PROMPT },
      // Add context about current user/org
      { 
        role: 'system', 
        content: `Current context:
- User: ${contact.name} (${contact.role || 'team member'})
- Organization: ${contact.org_id}
${projectId ? `- Active Project: ${projectId}` : ''}

You have access to tools to look up data. Use them when the user asks about specific projects, contacts, or metrics.`
      },
      // Add history
      ...history.slice(-10).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content
      })),
      // Add current message
      { role: 'user', content: message }
    ]
    
    // Call OpenAI with tools
    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: ECHO_TOOLS,
      tool_choice: 'auto',
      max_tokens: 1000,
      temperature: 0.7
    })
    
    let assistantMessage = response.choices[0].message
    
    // Handle tool calls
    while (assistantMessage.tool_calls?.length) {
      const toolResults = []
      
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments)
        const result = await executeEchoTool(
          toolCall.function.name,
          args,
          context,
          supabase
        )
        
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.result
        })
      }
      
      // Continue conversation with tool results
      messages.push(assistantMessage)
      messages.push(...toolResults)
      
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: ECHO_TOOLS,
        tool_choice: 'auto',
        max_tokens: 1000,
        temperature: 0.7
      })
      
      assistantMessage = response.choices[0].message
    }
    
    const responseContent = assistantMessage.content
    
    // Store messages in signal_messages for context
    if (signalConversationId) {
      // Store user message
      await supabase.from('signal_messages').insert({
        conversation_id: signalConversationId,
        role: 'user',
        content: message
      })
      
      // Store Echo response
      await supabase.from('signal_messages').insert({
        conversation_id: signalConversationId,
        role: 'assistant',
        content: responseContent,
        tokens_used: response.usage?.total_tokens || 0
      })
    }
    
    // Generate suggestions
    const suggestions = generateSuggestions(message, responseContent, context)
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        content: responseContent,
        conversationId: signalConversationId,
        suggestions,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      })
    }
    
  } catch (error) {
    console.error('[Echo Chat] Error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Echo encountered an error',
        details: error.message
      })
    }
  }
}

// =====================================================
// SUGGESTION GENERATOR
// =====================================================
function generateSuggestions(userMessage, response, context) {
  const suggestions = []
  const lowerMsg = userMessage.toLowerCase()
  const lowerResp = response.toLowerCase()
  
  // Context-based suggestions
  if (lowerResp.includes('seo') || lowerResp.includes('traffic')) {
    suggestions.push('Show me keyword rankings')
    suggestions.push('What content should I create?')
  }
  
  if (lowerResp.includes('follow up') || lowerResp.includes('lead')) {
    suggestions.push('Create a reminder')
    suggestions.push('Draft an email for them')
  }
  
  if (lowerResp.includes('task') || lowerResp.includes('project')) {
    suggestions.push('What else needs attention?')
    suggestions.push('Show project overview')
  }
  
  // Default suggestions if none generated
  if (!suggestions.length) {
    suggestions.push('What else can you help with?')
    suggestions.push('Show me my priorities')
  }
  
  return suggestions.slice(0, 3)
}
