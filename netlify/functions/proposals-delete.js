import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Unauthorized' })
      }
    }

    // Only admins can delete proposals
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden - Admin access required' })
      }
    }

    // Get proposal ID from query parameter
    const proposalId = event.queryStringParameters?.id
    if (!proposalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Proposal ID is required' })
      }
    }

    // Check if proposal exists
    const { data: existingProposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id, title, status')
      .eq('id', proposalId)
      .single()

    if (fetchError || !existingProposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Check if proposal is already signed - require explicit confirmation
    const isSignedProposal = ['signed', 'accepted', 'fully_executed'].includes(existingProposal.status)
    const confirmDelete = event.queryStringParameters?.confirm === 'true'
    
    if (isSignedProposal && !confirmDelete) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Cannot delete signed or executed proposals without confirmation',
          requiresConfirmation: true,
          suggestion: 'Add ?confirm=true to permanently delete this signed proposal'
        })
      }
    }

    // Delete the proposal
    const { error: deleteError } = await supabase
      .from('proposals')
      .delete()
      .eq('id', proposalId)

    if (deleteError) {
      throw deleteError
    }

    console.log(`Proposal deleted: ${proposalId} (${existingProposal.title})`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Proposal deleted successfully'
      })
    }
  } catch (error) {
    console.error('Error deleting proposal:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete proposal',
        details: error.message 
      })
    }
  }
}
