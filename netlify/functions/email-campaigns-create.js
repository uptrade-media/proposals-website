import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can create campaigns
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const orgId = contact.org_id || 'default'
    const body = JSON.parse(event.body || '{}')

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
      list_ids = [],
      segment_filters,
      scheduled_at,
      tags = []
    } = body

    if (!name || !subject) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Name and subject are required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // If template_id provided, fetch template content
    let finalContentHtml = content_html
    let finalContentJson = content_json

    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('content_html, content_json')
        .eq('id', template_id)
        .eq('org_id', orgId)
        .single()

      if (templateError) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Template not found' }) }
      }

      finalContentHtml = template.content_html
      finalContentJson = template.content_json
    }

    // Create the campaign
    const { data: campaign, error: createError } = await supabase
      .from('email_campaigns')
      .insert({
        org_id: orgId,
        name,
        subject,
        preview_text,
        template_id,
        content_html: finalContentHtml,
        content_json: finalContentJson,
        from_name,
        from_email,
        reply_to,
        segment_filters,
        status: scheduled_at ? 'scheduled' : 'draft',
        scheduled_at,
        tags,
        created_by: contact.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating campaign:', createError)
      return { statusCode: 500, body: JSON.stringify({ error: createError.message }) }
    }

    // Associate campaign with lists if provided
    if (list_ids.length > 0) {
      const listAssociations = list_ids.map(listId => ({
        campaign_id: campaign.id,
        list_id: listId
      }))

      const { error: listError } = await supabase
        .from('email_campaign_lists')
        .insert(listAssociations)

      if (listError) {
        console.error('Error associating lists:', listError)
        // Don't fail the whole operation, just log it
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
    console.error('Email campaigns create error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create campaign' })
    }
  }
}
