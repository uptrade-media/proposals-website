// netlify/functions/crm-prospects-bulk-update.js
// Bulk update prospects (stage change, delete, etc.)
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET

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

  const rawCookie = event.headers.cookie || ''
  const token = rawCookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))?.split('=')[1]
  
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const body = JSON.parse(event.body || '{}')
    const { action, prospectIds, data } = body

    if (!action || !prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'action and prospectIds array are required' })
      }
    }

    let result
    let message

    switch (action) {
      case 'change_stage':
        if (!data?.stage) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'stage is required for change_stage action' })
          }
        }
        
        // Update all prospects to new stage
        const { data: updated, error: updateError } = await supabase
          .from('contacts')
          .update({ pipeline_stage: data.stage })
          .in('id', prospectIds)
          .select()

        if (updateError) throw updateError

        // Log activity for each prospect
        const stageActivities = prospectIds.map(id => ({
          contact_id: id,
          activity_type: 'stage_change',
          description: `Pipeline stage changed to ${data.stage}`,
          metadata: {
            new_stage: data.stage,
            changed_by: payload.email,
            bulk_action: true
          }
        }))
        
        await supabase.from('activity_log').insert(stageActivities)

        result = updated
        message = `${prospectIds.length} prospect(s) moved to ${data.stage}`
        break

      case 'delete':
        // Soft delete or archive prospects
        const { error: deleteError } = await supabase
          .from('contacts')
          .update({ 
            pipeline_stage: 'archived',
            deleted_at: new Date().toISOString()
          })
          .in('id', prospectIds)

        if (deleteError) throw deleteError

        message = `${prospectIds.length} prospect(s) archived`
        break

      case 'assign':
        if (!data?.assignedTo) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'assignedTo is required for assign action' })
          }
        }

        const { error: assignError } = await supabase
          .from('contacts')
          .update({ assigned_to: data.assignedTo })
          .in('id', prospectIds)

        if (assignError) throw assignError

        message = `${prospectIds.length} prospect(s) assigned`
        break

      case 'add_tag':
        if (!data?.tag) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'tag is required for add_tag action' })
          }
        }

        // Get current tags and add new one
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, tags')
          .in('id', prospectIds)

        const tagUpdates = contacts.map(contact => ({
          id: contact.id,
          tags: [...(contact.tags || []), data.tag].filter((v, i, a) => a.indexOf(v) === i)
        }))

        for (const update of tagUpdates) {
          await supabase
            .from('contacts')
            .update({ tags: update.tags })
            .eq('id', update.id)
        }

        message = `Tag "${data.tag}" added to ${prospectIds.length} prospect(s)`
        break

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` })
        }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message,
        affectedCount: prospectIds.length,
        result
      })
    }

  } catch (error) {
    console.error('Error in bulk update:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to perform bulk update' })
    }
  }
}
