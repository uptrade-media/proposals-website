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
    const { daysAhead = '30' } = event.queryStringParameters || {}
    const queryDays = Math.min(parseInt(daysAhead), 365) // Cap at 365 days

    // 3. Get upcoming deadlines
    const sql = neon(process.env.DATABASE_URL)

    let deadlines = []

    if (payload.type === 'google' && payload.role === 'admin') {
      // Admin sees all deadlines across all clients
      deadlines = await sql`
        SELECT 
          'project' as item_type,
          p.id as item_id,
          p.name as name,
          p.end_date as due_date,
          'normal' as priority,
          CASE 
            WHEN p.status = 'completed' THEN 'completed'
            WHEN p.end_date < NOW() THEN 'overdue'
            WHEN p.end_date < NOW() + INTERVAL '7 days' THEN 'in-progress'
            ELSE 'pending'
          END as status,
          (p.end_date::date - NOW()::date) as days_until,
          c.email as contact_email,
          c.name as contact_name
        FROM projects p
        JOIN contacts c ON p.contact_id = c.id
        WHERE p.end_date IS NOT NULL
        AND p.end_date <= NOW() + INTERVAL '${queryDays} days'
        AND p.status != 'completed'
        
        UNION ALL
        
        SELECT 
          'invoice' as item_type,
          i.id as item_id,
          'Invoice #' || i.id::text as name,
          i.due_date as due_date,
          CASE 
            WHEN i.total_amount > 5000 THEN 'high'
            ELSE 'normal'
          END as priority,
          CASE 
            WHEN i.status = 'paid' THEN 'completed'
            WHEN i.due_date < NOW() THEN 'overdue'
            WHEN i.due_date < NOW() + INTERVAL '7 days' THEN 'in-progress'
            ELSE 'pending'
          END as status,
          (i.due_date::date - NOW()::date) as days_until,
          c.email as contact_email,
          c.name as contact_name
        FROM invoices i
        JOIN contacts c ON i.contact_id = c.id
        WHERE i.due_date IS NOT NULL
        AND i.due_date <= NOW() + INTERVAL '${queryDays} days'
        AND i.status != 'paid'
        
        UNION ALL
        
        SELECT 
          'proposal' as item_type,
          pr.id as item_id,
          pr.title as name,
          pr.valid_until as due_date,
          'high' as priority,
          CASE 
            WHEN pr.status = 'accepted' THEN 'completed'
            WHEN pr.valid_until < NOW() THEN 'overdue'
            WHEN pr.valid_until < NOW() + INTERVAL '3 days' THEN 'in-progress'
            ELSE 'pending'
          END as status,
          (pr.valid_until::date - NOW()::date) as days_until,
          c.email as contact_email,
          c.name as contact_name
        FROM proposals pr
        JOIN contacts c ON pr.contact_id = c.id
        WHERE pr.valid_until IS NOT NULL
        AND pr.valid_until <= NOW() + INTERVAL '${queryDays} days'
        AND pr.status NOT IN ('accepted', 'declined')
        
        ORDER BY due_date ASC
        LIMIT 20
      `
    } else {
      // Client sees only their own deadlines
      deadlines = await sql`
        SELECT 
          'project' as item_type,
          p.id as item_id,
          p.name as name,
          p.end_date as due_date,
          'normal' as priority,
          CASE 
            WHEN p.status = 'completed' THEN 'completed'
            WHEN p.end_date < NOW() THEN 'overdue'
            WHEN p.end_date < NOW() + INTERVAL '7 days' THEN 'in-progress'
            ELSE 'pending'
          END as status,
          (p.end_date::date - NOW()::date) as days_until
        FROM projects p
        WHERE p.contact_id = ${payload.userId}
        AND p.end_date IS NOT NULL
        AND p.end_date <= NOW() + INTERVAL '${queryDays} days'
        AND p.status != 'completed'
        
        UNION ALL
        
        SELECT 
          'invoice' as item_type,
          i.id as item_id,
          'Invoice #' || i.id::text as name,
          i.due_date as due_date,
          CASE 
            WHEN i.total_amount > 5000 THEN 'high'
            ELSE 'normal'
          END as priority,
          CASE 
            WHEN i.status = 'paid' THEN 'completed'
            WHEN i.due_date < NOW() THEN 'overdue'
            WHEN i.due_date < NOW() + INTERVAL '7 days' THEN 'in-progress'
            ELSE 'pending'
          END as status,
          (i.due_date::date - NOW()::date) as days_until
        FROM invoices i
        WHERE i.contact_id = ${payload.userId}
        AND i.due_date IS NOT NULL
        AND i.due_date <= NOW() + INTERVAL '${queryDays} days'
        AND i.status != 'paid'
        
        UNION ALL
        
        SELECT 
          'proposal' as item_type,
          pr.id as item_id,
          pr.title as name,
          pr.valid_until as due_date,
          'high' as priority,
          CASE 
            WHEN pr.status = 'accepted' THEN 'completed'
            WHEN pr.valid_until < NOW() THEN 'overdue'
            WHEN pr.valid_until < NOW() + INTERVAL '3 days' THEN 'in-progress'
            ELSE 'pending'
          END as status,
          (pr.valid_until::date - NOW()::date) as days_until
        FROM proposals pr
        WHERE pr.contact_id = ${payload.userId}
        AND pr.valid_until IS NOT NULL
        AND pr.valid_until <= NOW() + INTERVAL '${queryDays} days'
        AND pr.status NOT IN ('accepted', 'declined')
        
        ORDER BY due_date ASC
        LIMIT 20
      `
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deadlines: deadlines.map(deadline => ({
          ...deadline,
          dueDate: new Date(deadline.due_date).toISOString(),
          daysSince: Math.floor((Date.now() - new Date(deadline.due_date).getTime()) / (1000 * 60 * 60 * 24))
        }))
      })
    }
  } catch (error) {
    console.error('Dashboard deadlines error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch deadlines' })
    }
  }
}
