// netlify/functions/crm-notifications.js
// Smart notifications CRUD and management
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  try {
    // GET - List notifications
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const { 
        unreadOnly = 'true', 
        limit = '50',
        type,
        priority
      } = params

      let query = supabase
        .from('smart_notifications')
        .select(`
          *,
          contact:contacts!smart_notifications_contact_id_fkey(id, name, email, company, pipeline_stage)
        `)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit))

      // Filter unread
      if (unreadOnly === 'true') {
        query = query.is('read_at', null)
      }

      // Filter by type
      if (type) {
        query = query.eq('type', type)
      }

      // Filter by priority
      if (priority) {
        query = query.eq('priority', priority)
      }

      // Exclude expired notifications
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

      const { data: notifications, error } = await query

      if (error) throw error

      // Get counts by type
      const { data: typeCounts } = await supabase
        .from('smart_notifications')
        .select('type')
        .is('read_at', null)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

      const counts = {
        total: typeCounts?.length || 0,
        byType: {}
      }
      
      typeCounts?.forEach(n => {
        counts.byType[n.type] = (counts.byType[n.type] || 0) + 1
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          notifications,
          counts
        })
      }
    }

    // POST - Create notification or batch operations
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { action } = body

      // Mark as read
      if (action === 'markRead') {
        const { notificationId, markAll = false } = body

        if (markAll) {
          const { error } = await supabase
            .from('smart_notifications')
            .update({ read_at: new Date().toISOString() })
            .is('read_at', null)

          if (error) throw error

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, markedAll: true })
          }
        }

        if (notificationId) {
          const { error } = await supabase
            .from('smart_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', notificationId)

          if (error) throw error

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, notificationId })
          }
        }
      }

      // Dismiss notification
      if (action === 'dismiss') {
        const { notificationId } = body

        const { error } = await supabase
          .from('smart_notifications')
          .update({ dismissed_at: new Date().toISOString() })
          .eq('id', notificationId)

        if (error) throw error

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        }
      }

      // Record action taken
      if (action === 'recordAction') {
        const { notificationId, actionTaken } = body

        const { error } = await supabase
          .from('smart_notifications')
          .update({ 
            actioned_at: new Date().toISOString(),
            action_taken: actionTaken,
            read_at: new Date().toISOString()
          })
          .eq('id', notificationId)

        if (error) throw error

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
        }
      }

      // Create new notification
      const { contactId, type, priority = 'normal', title, message, metadata } = body

      const { data: notification, error } = await supabase
        .from('smart_notifications')
        .insert({
          contact_id: contactId,
          type,
          priority,
          title,
          message,
          metadata
        })
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ notification })
      }
    }

    // DELETE - Remove notification
    if (event.httpMethod === 'DELETE') {
      const { id } = event.queryStringParameters || {}

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Notification ID required' })
        }
      }

      const { error } = await supabase
        .from('smart_notifications')
        .delete()
        .eq('id', id)

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Notifications error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process notification request' })
    }
  }
}
