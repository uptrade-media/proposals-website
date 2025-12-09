// netlify/functions/audits-track-view.js
// Track audit view analytics (similar to proposals-track-view.js)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { auditId, event: eventType, metadata = {} } = JSON.parse(event.body || '{}')

    if (!auditId || !eventType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'auditId and event are required' })
      }
    }

    // Valid event types
    const validEvents = ['view', 'scroll', 'section_view', 'time_spent', 'click', 'cta_click']
    if (!validEvents.includes(eventType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid event type' })
      }
    }

    // Get audit to verify it exists
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('id, contact_id')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Audit not found' })
      }
    }

    // Try to insert into audit_events table if it exists
    // This table may need to be created via migration
    try {
      await supabase
        .from('audit_events')
        .insert({
          audit_id: auditId,
          type: eventType,
          payload: {
            ...metadata,
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        })
    } catch (insertError) {
      // Table may not exist yet - log but don't fail
      console.warn('Failed to insert audit event (table may not exist):', insertError)
    }

    // Update viewed_at timestamp if this is a view event
    if (eventType === 'view') {
      const { data: currentAudit } = await supabase
        .from('audits')
        .select('viewed_at')
        .eq('id', auditId)
        .single()
      
      // Only update if not already set
      if (!currentAudit?.viewed_at) {
        await supabase
          .from('audits')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', auditId)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }

  } catch (error) {
    console.error('Error tracking audit view:', error)
    // Return success anyway - analytics should not block user experience
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, warning: 'Analytics tracking failed' })
    }
  }
}
