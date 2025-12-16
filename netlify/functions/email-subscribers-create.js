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

    // Only admins can create subscribers
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const orgId = contact.org_id || 'default'
    const body = JSON.parse(event.body || '{}')

    const {
      email,
      first_name,
      last_name,
      phone,
      custom_fields,
      tags = [],
      list_ids = [],
      source = 'manual'
    } = body

    if (!email) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Email is required' }) 
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Invalid email format' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Check if subscriber already exists
    const { data: existing, error: checkError } = await supabase
      .from('email_subscribers')
      .select('id, status')
      .eq('org_id', orgId)
      .eq('email', email.toLowerCase())
      .single()

    let subscriber

    if (existing) {
      // Update existing subscriber
      const updates = {
        first_name,
        last_name,
        phone,
        custom_fields,
        status: 'subscribed', // Resubscribe if they were unsubscribed
        updated_at: new Date().toISOString()
      }

      // Merge tags (don't replace)
      if (tags.length > 0) {
        updates.tags = [...new Set([...tags])] // Will merge with existing in query
      }

      const { data, error: updateError } = await supabase
        .from('email_subscribers')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        return { statusCode: 500, body: JSON.stringify({ error: updateError.message }) }
      }

      subscriber = data
    } else {
      // Create new subscriber
      const { data, error: createError } = await supabase
        .from('email_subscribers')
        .insert({
          org_id: orgId,
          email: email.toLowerCase(),
          first_name,
          last_name,
          phone,
          custom_fields,
          tags,
          source,
          source_details: { created_by: contact.id },
          status: 'subscribed',
          subscribed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating subscriber:', createError)
        return { statusCode: 500, body: JSON.stringify({ error: createError.message }) }
      }

      subscriber = data
    }

    // Add to lists if provided
    if (list_ids.length > 0) {
      const listAssociations = list_ids.map(listId => ({
        list_id: listId,
        subscriber_id: subscriber.id,
        added_by: 'manual'
      }))

      // Use upsert to handle duplicates
      const { error: listError } = await supabase
        .from('email_list_subscribers')
        .upsert(listAssociations, { 
          onConflict: 'list_id,subscriber_id',
          ignoreDuplicates: true
        })

      if (listError) {
        console.error('Error adding to lists:', listError)
        // Don't fail the whole operation
      }

      // Update list counts
      for (const listId of list_ids) {
        const { count } = await supabase
          .from('email_list_subscribers')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', listId)

        await supabase
          .from('email_lists')
          .update({ subscriber_count: count || 0 })
          .eq('id', listId)
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        subscriber,
        created: !existing
      })
    }
  } catch (error) {
    console.error('Email subscribers create error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create subscriber' })
    }
  }
}
