// netlify/functions/proposals-edit-ai-status.js
// Poll for AI edit completion status
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    const proposalId = event.queryStringParameters?.proposalId
    const editId = event.queryStringParameters?.editId

    if (!proposalId || !editId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing proposalId or editId' }) }
    }

    const supabase = createSupabaseAdmin()
    
    // Get the proposal with its metadata and current content
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('id, mdx_content, total_amount, metadata')
      .eq('id', proposalId)
      .single()

    if (error || !proposal) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Proposal not found' }) }
    }

    const lastEdit = proposal.metadata?.lastAiEdit

    // Check if this is the edit we're looking for
    if (!lastEdit || lastEdit.editId !== editId) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'processing',
          message: 'Edit in progress...'
        })
      }
    }

    // Check if there was an error
    if (lastEdit.error) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: lastEdit.error
        })
      }
    }

    // Check if completed
    if (lastEdit.completedAt) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'complete',
          message: lastEdit.message || 'Changes applied successfully',
          hasChanges: lastEdit.hasChanges,
          proposal: {
            id: proposal.id,
            mdxContent: proposal.mdx_content,
            totalAmount: proposal.total_amount
          }
        })
      }
    }

    // Still processing
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'processing',
        message: 'Edit in progress...'
      })
    }

  } catch (error) {
    console.error('Edit status check error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check status', details: error.message })
    }
  }
}
