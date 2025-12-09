// netlify/functions/audits-delete.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication via Supabase
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Get audit ID from query params
    const auditId = event.queryStringParameters?.auditId

    if (!auditId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Audit ID is required' })
      }
    }

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.role === 'admin'

    // First, verify the audit exists and user has permission
    const { data: audit, error: fetchError } = await supabase
      .from('audits')
      .select('id, contact_id')
      .eq('id', auditId)
      .single()

    if (fetchError || !audit) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Audit not found' })
      }
    }

    // Check permission: admins can delete any, clients only their own
    if (!isAdmin && audit.contact_id !== contact.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to delete this audit' })
      }
    }

    // Delete the audit
    const { error: deleteError } = await supabase
      .from('audits')
      .delete()
      .eq('id', auditId)

    if (deleteError) {
      console.error('Failed to delete audit:', deleteError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete audit' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Audit deleted successfully'
      })
    }

  } catch (error) {
    console.error('Delete audit error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
