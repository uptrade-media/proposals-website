// netlify/functions/engage-elements.js
// CRUD operations for engage elements (popups, nudges, banners, toasts)

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  const supabase = createSupabaseAdmin()

  try {
    // Route based on method
    switch (event.httpMethod) {
      case 'GET':
        return await handleGet(event, supabase, contact)
      case 'POST':
        return await handleCreate(event, supabase, contact)
      case 'PUT':
        return await handleUpdate(event, supabase, contact)
      case 'DELETE':
        return await handleDelete(event, supabase, contact)
      default:
        return {
          statusCode: 405,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }
  } catch (error) {
    console.error('Engage elements error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * GET - List elements or get single element
 */
async function handleGet(event, supabase, contact) {
  const { projectId, elementId, type, status } = event.queryStringParameters || {}

  // Get single element with variants
  if (elementId) {
    const { data: element, error } = await supabase
      .from('engage_elements')
      .select(`
        *,
        variants:engage_variants(*),
        project:projects(id, title),
        created_by_user:contacts!engage_elements_created_by_fkey(id, name, email)
      `)
      .eq('id', elementId)
      .single()

    if (error) throw error

    // Get recent stats
    const { data: stats } = await supabase
      .from('engage_stats_daily')
      .select('*')
      .eq('element_id', elementId)
      .order('date', { ascending: false })
      .limit(30)

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ element, stats })
    }
  }

  // List elements with filtering
  let query = supabase
    .from('engage_elements')
    .select(`
      *,
      variants:engage_variants(id, variant_name, is_winner),
      project:projects(id, title, tenant_domain)
    `)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  if (type) {
    query = query.eq('element_type', type)
  }

  if (status === 'active') {
    query = query.eq('is_active', true).eq('is_draft', false)
  } else if (status === 'draft') {
    query = query.eq('is_draft', true)
  } else if (status === 'paused') {
    query = query.eq('is_active', false).eq('is_draft', false)
  }

  const { data: elements, error } = await query

  if (error) throw error

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ elements })
  }
}

/**
 * POST - Create new element
 */
async function handleCreate(event, supabase, contact) {
  const body = JSON.parse(event.body || '{}')
  const { projectId, ...elementData } = body

  if (!projectId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Project ID is required' })
    }
  }

  // Get project to get org_id
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Project not found' })
    }
  }

  // Create element
  const { data: element, error } = await supabase
    .from('engage_elements')
    .insert({
      ...elementData,
      project_id: projectId,
      org_id: project.org_id,
      created_by: contact.id,
      updated_by: contact.id
    })
    .select()
    .single()

  if (error) throw error

  // Create default control variant (A)
  await supabase
    .from('engage_variants')
    .insert({
      element_id: element.id,
      variant_name: 'A',
      is_control: true,
      traffic_percent: 100
    })

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({ element })
  }
}

/**
 * PUT - Update element
 */
async function handleUpdate(event, supabase, contact) {
  const body = JSON.parse(event.body || '{}')
  const { elementId, action, ...updateData } = body

  if (!elementId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Element ID is required' })
    }
  }

  // Handle special actions
  if (action === 'publish') {
    const { error } = await supabase
      .from('engage_elements')
      .update({
        is_draft: false,
        is_active: true,
        updated_by: contact.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', elementId)

    if (error) throw error

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'Element published' })
    }
  }

  if (action === 'pause') {
    const { error } = await supabase
      .from('engage_elements')
      .update({
        is_active: false,
        updated_by: contact.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', elementId)

    if (error) throw error

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'Element paused' })
    }
  }

  if (action === 'resume') {
    const { error } = await supabase
      .from('engage_elements')
      .update({
        is_active: true,
        updated_by: contact.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', elementId)

    if (error) throw error

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'Element resumed' })
    }
  }

  if (action === 'duplicate') {
    // Get original element
    const { data: original, error: fetchError } = await supabase
      .from('engage_elements')
      .select('*')
      .eq('id', elementId)
      .single()

    if (fetchError) throw fetchError

    // Create copy
    const { id, created_at, updated_at, total_impressions, total_clicks, total_conversions, ...elementToCopy } = original
    
    const { data: newElement, error: createError } = await supabase
      .from('engage_elements')
      .insert({
        ...elementToCopy,
        name: `${original.name} (Copy)`,
        is_active: false,
        is_draft: true,
        created_by: contact.id,
        updated_by: contact.id
      })
      .select()
      .single()

    if (createError) throw createError

    // Copy variants
    const { data: variants } = await supabase
      .from('engage_variants')
      .select('*')
      .eq('element_id', elementId)

    if (variants?.length > 0) {
      const variantsCopy = variants.map(v => ({
        element_id: newElement.id,
        variant_name: v.variant_name,
        headline: v.headline,
        body: v.body,
        cta_text: v.cta_text,
        image_url: v.image_url,
        traffic_percent: v.traffic_percent,
        is_control: v.is_control,
        is_winner: false,
        impressions: 0,
        clicks: 0,
        conversions: 0
      }))

      await supabase.from('engage_variants').insert(variantsCopy)
    }

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({ element: newElement })
    }
  }

  // Regular update
  const { data: element, error } = await supabase
    .from('engage_elements')
    .update({
      ...updateData,
      updated_by: contact.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', elementId)
    .select()
    .single()

  if (error) throw error

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ element })
  }
}

/**
 * DELETE - Delete element
 */
async function handleDelete(event, supabase, contact) {
  const { elementId } = event.queryStringParameters || {}

  if (!elementId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Element ID is required' })
    }
  }

  // Cascade delete will handle variants
  const { error } = await supabase
    .from('engage_elements')
    .delete()
    .eq('id', elementId)

  if (error) throw error

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true })
  }
}
