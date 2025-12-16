import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can update campaigns
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const orgId = contact.org_id || 'default'
    const campaignId = event.path.split('/').pop()
    const body = JSON.parse(event.body || '{}')

    if (!campaignId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Campaign ID required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Check campaign exists and belongs to org
    const { data: existing, error: fetchError } = await supabase
      .from('email_campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !existing) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Campaign not found' }) }
    }

    // Can't update sent campaigns
    if (existing.status === 'sent') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Cannot update sent campaigns' }) }
    }

    const {
      name,
      subject,
      preview_text,
      template_id,
      content_html,
      content_json,
      from_name,
      from_email,
      reply_to,
      list_ids,
      segment_filters,
      scheduled_at,
      tags,
      status
    } = body

    // Build update object with only provided fields
    const updates = {}
    if (name !== undefined) updates.name = name
    if (subject !== undefined) updates.subject = subject
    if (preview_text !== undefined) updates.preview_text = preview_text
    if (template_id !== undefined) updates.template_id = template_id
    if (content_html !== undefined) updates.content_html = content_html
    if (content_json !== undefined) updates.content_json = content_json
    if (from_name !== undefined) updates.from_name = from_name
    if (from_email !== undefined) updates.from_email = from_email
    if (reply_to !== undefined) updates.reply_to = reply_to
    if (segment_filters !== undefined) updates.segment_filters = segment_filters
    if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at
    if (tags !== undefined) updates.tags = tags
    if (status !== undefined && ['draft', 'scheduled'].includes(status)) {
      updates.status = status
    }

    updates.updated_at = new Date().toISOString()

    // Update campaign
    const { data: campaign, error: updateError } = await supabase
      .from('email_campaigns')
      .update(updates)
      .eq('id', campaignId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating campaign:', updateError)
      return { statusCode: 500, body: JSON.stringify({ error: updateError.message }) }
    }

    // Update list associations if provided
    if (list_ids !== undefined) {
      // Remove existing associations
      await supabase
        .from('email_campaign_lists')
        .delete()
        .eq('campaign_id', campaignId)

      // Add new associations
      if (list_ids.length > 0) {
        const listAssociations = list_ids.map(listId => ({
          campaign_id: campaignId,
          list_id: listId
        }))

        await supabase
          .from('email_campaign_lists')
          .insert(listAssociations)
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ campaign })
    }
  } catch (error) {
    console.error('Email campaigns update error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to update campaign' })
    }
  }
}
