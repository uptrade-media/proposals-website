// netlify/functions/seo-opportunities-update.js
// Update opportunity status
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const { 
      id, 
      status, 
      assignedTo,
      resultNotes,
      dismissedReason
    } = JSON.parse(event.body || '{}')

    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Opportunity ID is required' }) }
    }

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.role === 'admin' || contact.role === 'super_admin'

    // Fetch opportunity with site
    const { data: opportunity, error: fetchError } = await supabase
      .from('seo_opportunities')
      .select('*, site:seo_sites!seo_opportunities_site_id_fkey(contact_id)')
      .eq('id', id)
      .single()

    if (fetchError || !opportunity) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Opportunity not found' }) }
    }

    // Verify access
    if (!isAdmin && opportunity.site.contact_id !== contact.id) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) }
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      const validStatuses = ['open', 'in-progress', 'completed', 'dismissed']
      if (!validStatuses.includes(status)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid status' }) }
      }
      updateData.status = status

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        updateData.completed_by = contact.id
      }

      if (status === 'dismissed') {
        updateData.dismissed_at = new Date().toISOString()
        updateData.dismissed_reason = dismissedReason || null
      }
    }

    if (assignedTo !== undefined) {
      updateData.assigned_to = assignedTo
    }

    if (resultNotes !== undefined) {
      updateData.result_notes = resultNotes
    }

    // Update opportunity
    const { data: updated, error: updateError } = await supabase
      .from('seo_opportunities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[seo-opportunities-update] Error:', updateError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: updateError.message }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        opportunity: {
          id: updated.id,
          status: updated.status,
          assignedTo: updated.assigned_to,
          completedAt: updated.completed_at,
          resultNotes: updated.result_notes,
          updatedAt: updated.updated_at
        },
        message: 'Opportunity updated successfully'
      })
    }
  } catch (err) {
    console.error('[seo-opportunities-update] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
