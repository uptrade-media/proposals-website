/**
 * CRM Prospect Update Function
 * 
 * Update prospect pipeline stage, details, and notes
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const body = JSON.parse(event.body || '{}')
    
    const {
      id,
      pipelineStage,
      assignedTo,
      name,
      email,
      company,
      phone,
      website,
      notes,
      tags,
      source
    } = body

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prospect ID required' })
      }
    }

    // Build update object
    const updates = {
      updated_at: new Date().toISOString()
    }

    if (pipelineStage !== undefined) updates.pipeline_stage = pipelineStage
    if (assignedTo !== undefined) updates.assigned_to = assignedTo
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (company !== undefined) updates.company = company
    if (phone !== undefined) updates.phone = phone
    if (website !== undefined) updates.website = website
    if (notes !== undefined) updates.notes = notes
    if (tags !== undefined) updates.tags = tags
    if (source !== undefined) updates.source = source

    // Update prospect
    const { data: prospect, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log activity if pipeline stage changed
    if (pipelineStage) {
      await supabase.from('activity_log').insert({
        contact_id: id,
        activity_type: 'pipeline_stage_changed',
        description: `Pipeline stage changed to: ${pipelineStage}`
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ prospect })
    }

  } catch (error) {
    console.error('CRM prospect update error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
