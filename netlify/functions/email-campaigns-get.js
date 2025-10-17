import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  try {
    // Verify auth
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const user = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    if (user.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin only' }) }
    }

    const campaignId = event.queryStringParameters?.id
    if (!campaignId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Campaign ID required' })
      }
    }

    // Get campaign
    const [campaign] = await sql`
      SELECT * FROM campaigns WHERE id = ${campaignId}
    `

    if (!campaign) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Campaign not found' })
      }
    }

    // Get recipients and metrics
    const recipients = await sql`
      SELECT 
        id, contact_id, step_index, status, sent_at, created_at
      FROM recipients
      WHERE campaign_id = ${campaignId}
      ORDER BY created_at DESC
    `

    // Get events (opens, clicks, etc.)
    const events = await sql`
      SELECT 
        type, COUNT(*) as count
      FROM events
      WHERE recipient_id IN (
        SELECT id FROM recipients WHERE campaign_id = ${campaignId}
      )
      GROUP BY type
    `

    // Calculate metrics
    const eventMap = {}
    events.forEach(e => {
      eventMap[e.type] = e.count || 0
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        campaign,
        recipients: recipients.length,
        metrics: {
          sent: recipients.filter(r => r.status === 'sent').length,
          delivered: eventMap.delivered || 0,
          opened: eventMap.open || 0,
          clicked: eventMap.click || 0,
          bounced: eventMap.bounce || 0,
          unsubscribed: eventMap.unsubscribe || 0,
        }
      }),
      headers: { 'Content-Type': 'application/json' }
    }
  } catch (err) {
    console.error('Get campaign error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get campaign' })
    }
  }
}
