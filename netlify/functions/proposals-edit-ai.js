// netlify/functions/proposals-edit-ai.js
// Triggers background AI editing and returns immediately
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { v4 as uuidv4 } from 'uuid'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { proposalId, currentContent } = body
    // Accept either 'message' or 'instruction' field
    const instruction = body.message || body.instruction

    if (!instruction) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message or instruction required' }) }
    }

    if (!proposalId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Proposal ID required' }) }
    }

    // Generate a unique edit ID for polling
    const editId = uuidv4()

    // Clear any previous edit status
    const supabase = createSupabaseAdmin()
    const { data: proposal } = await supabase
      .from('proposals')
      .select('metadata')
      .eq('id', proposalId)
      .single()

    const metadata = proposal?.metadata || {}
    metadata.lastAiEdit = {
      editId,
      status: 'processing',
      startedAt: new Date().toISOString()
    }

    await supabase
      .from('proposals')
      .update({ metadata })
      .eq('id', proposalId)

    // Trigger background function
    const backgroundUrl = process.env.URL 
      ? `${process.env.URL}/.netlify/functions/proposals-edit-ai-background`
      : 'http://localhost:8888/.netlify/functions/proposals-edit-ai-background'

    // Fire and forget - don't await
    fetch(backgroundUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId,
        instruction,
        currentContent,
        editId
      })
    }).catch(err => console.error('Background trigger error:', err))

    // Return immediately with edit ID for polling
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        editId,
        message: 'Edit started, poll for status'
      })
    }

  } catch (error) {
    console.error('AI edit trigger error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to start edit', details: error.message })
    }
  }
}
