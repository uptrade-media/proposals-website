import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { parse } from 'csv-parse/sync'

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

    // Only admins can import subscribers
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const orgId = contact.org_id || 'default'
    const body = JSON.parse(event.body || '{}')

    const {
      csv_data,
      list_id,
      tags = [],
      update_existing = true,
      column_mapping = {}
    } = body

    if (!csv_data) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'CSV data is required' }) 
      }
    }

    // Parse CSV
    let records
    try {
      records = parse(csv_data, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
    } catch (parseError) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Invalid CSV format: ' + parseError.message }) 
      }
    }

    if (records.length === 0) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'No records found in CSV' }) 
      }
    }

    // Default column mapping
    const mapping = {
      email: column_mapping.email || 'email',
      first_name: column_mapping.first_name || 'first_name',
      last_name: column_mapping.last_name || 'last_name',
      phone: column_mapping.phone || 'phone',
      company: column_mapping.company || 'company'
    }

    const supabase = createSupabaseAdmin()

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // Process each record
    for (const record of records) {
      const email = (record[mapping.email] || '').toLowerCase().trim()

      if (!email || !emailRegex.test(email)) {
        results.skipped++
        results.errors.push({ email: email || 'empty', reason: 'Invalid email' })
        continue
      }

      // Build subscriber data
      const subscriberData = {
        org_id: orgId,
        email,
        first_name: record[mapping.first_name] || null,
        last_name: record[mapping.last_name] || null,
        phone: record[mapping.phone] || null,
        tags,
        source: 'import',
        source_details: { 
          import_date: new Date().toISOString(),
          imported_by: contact.id
        },
        status: 'subscribed',
        subscribed_at: new Date().toISOString()
      }

      // Build custom fields from remaining columns
      const customFields = {}
      for (const [key, value] of Object.entries(record)) {
        if (!Object.values(mapping).includes(key) && value) {
          customFields[key] = value
        }
      }
      if (Object.keys(customFields).length > 0) {
        subscriberData.custom_fields = customFields
      }

      try {
        // Check if subscriber exists
        const { data: existing } = await supabase
          .from('email_subscribers')
          .select('id')
          .eq('org_id', orgId)
          .eq('email', email)
          .single()

        if (existing && update_existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('email_subscribers')
            .update({
              first_name: subscriberData.first_name,
              last_name: subscriberData.last_name,
              phone: subscriberData.phone,
              custom_fields: subscriberData.custom_fields,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          if (updateError) {
            results.errors.push({ email, reason: updateError.message })
            results.skipped++
          } else {
            results.updated++
            
            // Add to list if specified
            if (list_id) {
              await supabase
                .from('email_list_subscribers')
                .upsert({
                  list_id,
                  subscriber_id: existing.id,
                  added_by: 'import'
                }, { 
                  onConflict: 'list_id,subscriber_id',
                  ignoreDuplicates: true
                })
            }
          }
        } else if (existing && !update_existing) {
          results.skipped++
        } else {
          // Create new
          const { data: newSub, error: createError } = await supabase
            .from('email_subscribers')
            .insert(subscriberData)
            .select('id')
            .single()

          if (createError) {
            results.errors.push({ email, reason: createError.message })
            results.skipped++
          } else {
            results.created++
            
            // Add to list if specified
            if (list_id && newSub) {
              await supabase
                .from('email_list_subscribers')
                .insert({
                  list_id,
                  subscriber_id: newSub.id,
                  added_by: 'import'
                })
            }
          }
        }
      } catch (err) {
        results.errors.push({ email, reason: err.message })
        results.skipped++
      }
    }

    // Update list count if a list was specified
    if (list_id) {
      const { count } = await supabase
        .from('email_list_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list_id)

      await supabase
        .from('email_lists')
        .update({ 
          subscriber_count: count || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', list_id)
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        total_processed: records.length,
        ...results,
        errors: results.errors.slice(0, 20) // Only return first 20 errors
      })
    }
  } catch (error) {
    console.error('Email subscribers import error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to import subscribers' })
    }
  }
}
