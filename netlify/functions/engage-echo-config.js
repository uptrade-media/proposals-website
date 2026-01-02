// netlify/functions/engage-echo-config.js
// API for managing page-specific Echo nudge configurations
// GET: List configs for a project
// POST: Create/update config
// DELETE: Remove config

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { findProject } from './utils/projectLookup.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

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

  try {
    // Route based on method
    if (event.httpMethod === 'GET') {
      return await handleGet(event, supabase, contact)
    }

    if (event.httpMethod === 'POST') {
      return await handlePost(event, supabase, contact)
    }

    if (event.httpMethod === 'PUT') {
      return await handlePut(event, supabase, contact)
    }

    if (event.httpMethod === 'DELETE') {
      return await handleDelete(event, supabase, contact)
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Echo config error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * GET: List Echo configs for a project
 * ?projectId=xxx or ?orgId=xxx
 */
async function handleGet(event, supabase, contact) {
  const params = event.queryStringParameters || {}
  const { projectId, orgId } = params

  if (!projectId && !orgId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'projectId or orgId required' })
    }
  }

  // Verify access to project/org
  const accessCheck = await verifyAccess(supabase, contact.id, projectId, orgId)
  if (!accessCheck.allowed) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Access denied' })
    }
  }

  // Fetch configs
  let query = supabase
    .from('engage_echo_config')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  } else {
    query = query.eq('org_id', orgId)
  }

  const { data: configs, error } = await query

  if (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ configs })
  }
}

/**
 * POST: Create new Echo config
 */
async function handlePost(event, supabase, contact) {
  const body = JSON.parse(event.body || '{}')
  const {
    projectId,
    orgId,
    pagePattern,
    initialMessage,
    suggestedPrompts,
    nudgeMessage,
    nudgeDelaySeconds,
    nudgeType,
    pageContext,
    skillHints,
    isActive,
    priority
  } = body

  if (!pagePattern) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'pagePattern is required' })
    }
  }

  // Verify access
  const accessCheck = await verifyAccess(supabase, contact.id, projectId, orgId)
  if (!accessCheck.allowed) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Access denied' })
    }
  }

  // Create config
  const { data: config, error } = await supabase
    .from('engage_echo_config')
    .insert({
      org_id: accessCheck.orgId,
      project_id: projectId || null,
      page_pattern: pagePattern,
      initial_message: initialMessage,
      suggested_prompts: suggestedPrompts || [],
      nudge_message: nudgeMessage,
      nudge_delay_seconds: nudgeDelaySeconds || 30,
      nudge_type: nudgeType || 'question',
      page_context: pageContext,
      skill_hints: skillHints || [],
      is_active: isActive !== false,
      priority: priority || 0,
      created_by: contact.id
    })
    .select()
    .single()

  if (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({ config })
  }
}

/**
 * PUT: Update existing Echo config
 */
async function handlePut(event, supabase, contact) {
  const body = JSON.parse(event.body || '{}')
  const { id, ...updates } = body

  if (!id) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'id is required' })
    }
  }

  // Get existing config
  const { data: existing, error: fetchError } = await supabase
    .from('engage_echo_config')
    .select('org_id, project_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Config not found' })
    }
  }

  // Verify access
  const accessCheck = await verifyAccess(supabase, contact.id, existing.project_id, existing.org_id)
  if (!accessCheck.allowed) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Access denied' })
    }
  }

  // Build update object with snake_case keys
  const updateData = {}
  if (updates.pagePattern !== undefined) updateData.page_pattern = updates.pagePattern
  if (updates.initialMessage !== undefined) updateData.initial_message = updates.initialMessage
  if (updates.suggestedPrompts !== undefined) updateData.suggested_prompts = updates.suggestedPrompts
  if (updates.nudgeMessage !== undefined) updateData.nudge_message = updates.nudgeMessage
  if (updates.nudgeDelaySeconds !== undefined) updateData.nudge_delay_seconds = updates.nudgeDelaySeconds
  if (updates.nudgeType !== undefined) updateData.nudge_type = updates.nudgeType
  if (updates.pageContext !== undefined) updateData.page_context = updates.pageContext
  if (updates.skillHints !== undefined) updateData.skill_hints = updates.skillHints
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive
  if (updates.priority !== undefined) updateData.priority = updates.priority

  // Update config
  const { data: config, error } = await supabase
    .from('engage_echo_config')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ config })
  }
}

/**
 * DELETE: Remove Echo config
 */
async function handleDelete(event, supabase, contact) {
  const params = event.queryStringParameters || {}
  const { id } = params

  if (!id) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'id is required' })
    }
  }

  // Get existing config
  const { data: existing, error: fetchError } = await supabase
    .from('engage_echo_config')
    .select('org_id, project_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Config not found' })
    }
  }

  // Verify access
  const accessCheck = await verifyAccess(supabase, contact.id, existing.project_id, existing.org_id)
  if (!accessCheck.allowed) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Access denied' })
    }
  }

  // Delete config
  const { error } = await supabase
    .from('engage_echo_config')
    .delete()
    .eq('id', id)

  if (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true })
  }
}

/**
 * Verify user has access to project/org
 */
async function verifyAccess(supabase, contactId, projectId, orgId) {
  // If projectId provided, get the org from project
  if (projectId) {
    const { project } = await findProject({ supabase, projectId, select: 'id, org_id' })

    if (!project) {
      return { allowed: false }
    }
    orgId = project.org_id
  }

  if (!orgId) {
    return { allowed: false }
  }

  // Check org membership
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('contact_id', contactId)
    .eq('is_active', true)
    .single()

  if (!member) {
    return { allowed: false }
  }

  return { allowed: true, orgId }
}
