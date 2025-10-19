import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

export async function handler(event) {
  try {
    // 1. Verify authentication
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    let payload
    try {
      payload = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    } catch (err) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid session' })
      }
    }

    // 2. Parse query parameters
    const { limit = '10', offset = '0' } = event.queryStringParameters || {}
    const queryLimit = Math.min(parseInt(limit), 50) // Cap at 50
    const queryOffset = parseInt(offset)

    // 3. Get activity based on user type
    const sql = neon(process.env.DATABASE_URL)

    let activities = []

    if (payload.type === 'google' && payload.role === 'admin') {
      // Admin sees all activity across all clients
      activities = await sql`
        SELECT 
          'project' as type,
          'updated' as action,
          p.name as title,
          'Project status changed' as description,
          p.id as related_id,
          p.updated_at as timestamp,
          c.email as user_email
        FROM projects p
        JOIN contacts c ON p.contact_id = c.id
        WHERE p.updated_at > NOW() - INTERVAL '30 days'
        
        UNION ALL
        
        SELECT 
          'invoice' as type,
          'created' as action,
          'Invoice #' || i.id::text as title,
          'New invoice created' as description,
          i.id as related_id,
          i.created_at as timestamp,
          c.email as user_email
        FROM invoices i
        JOIN contacts c ON i.contact_id = c.id
        WHERE i.created_at > NOW() - INTERVAL '30 days'
        
        UNION ALL
        
        SELECT 
          'message' as type,
          'received' as action,
          c.name as title,
          'New message: ' || m.content::text as description,
          m.id as related_id,
          m.created_at as timestamp,
          c.email as user_email
        FROM messages m
        JOIN contacts c ON m.contact_id = c.id
        WHERE m.created_at > NOW() - INTERVAL '30 days'
        
        UNION ALL
        
        SELECT 
          'proposal' as type,
          'accepted' as action,
          pr.title as title,
          'Proposal accepted by ' || c.name as description,
          pr.id as related_id,
          pr.accepted_at as timestamp,
          c.email as user_email
        FROM proposals pr
        JOIN contacts c ON pr.contact_id = c.id
        WHERE pr.status = 'accepted' AND pr.accepted_at > NOW() - INTERVAL '30 days'
        
        ORDER BY timestamp DESC
        LIMIT ${queryLimit}
        OFFSET ${queryOffset}
      `
    } else {
      // Client sees only their own activity
      activities = await sql`
        SELECT 
          'project' as type,
          'updated' as action,
          p.name as title,
          'Project status: ' || p.status as description,
          p.id as related_id,
          p.updated_at as timestamp,
          'You' as user_email
        FROM projects p
        WHERE p.contact_id = ${payload.userId}
        AND p.updated_at > NOW() - INTERVAL '30 days'
        
        UNION ALL
        
        SELECT 
          'invoice' as type,
          'created' as action,
          'Invoice #' || i.id::text as title,
          'Invoice amount: $' || i.total_amount::text as description,
          i.id as related_id,
          i.created_at as timestamp,
          'You' as user_email
        FROM invoices i
        WHERE i.contact_id = ${payload.userId}
        AND i.created_at > NOW() - INTERVAL '30 days'
        
        UNION ALL
        
        SELECT 
          'message' as type,
          'received' as action,
          'Team Message' as title,
          m.content as description,
          m.id as related_id,
          m.created_at as timestamp,
          'Team' as user_email
        FROM messages m
        WHERE m.contact_id = ${payload.userId}
        AND m.created_at > NOW() - INTERVAL '30 days'
        
        UNION ALL
        
        SELECT 
          'proposal' as type,
          'accepted' as action,
          pr.title as title,
          'You accepted this proposal' as description,
          pr.id as related_id,
          pr.accepted_at as timestamp,
          'You' as user_email
        FROM proposals pr
        WHERE pr.contact_id = ${payload.userId}
        AND pr.status = 'accepted' 
        AND pr.accepted_at > NOW() - INTERVAL '30 days'
        
        ORDER BY timestamp DESC
        LIMIT ${queryLimit}
        OFFSET ${queryOffset}
      `
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activities: activities.map(activity => ({
          ...activity,
          timestamp: new Date(activity.timestamp).toISOString()
        })),
        count: activities.length
      })
    }
  } catch (error) {
    console.error('Dashboard activity error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch activity' })
    }
  }
}
