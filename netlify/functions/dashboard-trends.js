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

    // 2. Parse query parameters (monthly trend by default)
    const { period = 'month' } = event.queryStringParameters || {}

    // 3. Calculate date ranges based on period
    const now = new Date()
    let currentPeriodStart, previousPeriodStart, currentPeriodEnd, previousPeriodEnd

    if (period === 'week') {
      // Last 7 days vs previous 7 days
      currentPeriodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      previousPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      currentPeriodEnd = now
      previousPeriodEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'year') {
      // Last 12 months vs previous 12 months
      currentPeriodStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      previousPeriodStart = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
      currentPeriodEnd = now
      previousPeriodEnd = currentPeriodStart
    } else {
      // Default: month (last 30 days vs previous 30 days)
      currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      currentPeriodEnd = now
      previousPeriodEnd = currentPeriodStart
    }

    const sql = neon(process.env.DATABASE_URL)

    // 4. Get trends based on user type
    let trends = {
      revenue: { current: 0, previous: 0 },
      projects: { current: 0, previous: 0 },
      invoices: { current: 0, previous: 0 },
      messages: { current: 0, previous: 0 }
    }

    if (payload.type === 'google' && payload.role === 'admin') {
      // Admin sees all company metrics
      const results = await sql`
        SELECT 
          'revenue' as metric,
          COALESCE(SUM(i.total_amount), 0) as current_value,
          0 as previous_value
        FROM invoices i
        WHERE i.status = 'paid'
        AND i.paid_at >= ${currentPeriodStart.toISOString()}
        AND i.paid_at <= ${currentPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'revenue' as metric,
          0 as current_value,
          COALESCE(SUM(i.total_amount), 0) as previous_value
        FROM invoices i
        WHERE i.status = 'paid'
        AND i.paid_at >= ${previousPeriodStart.toISOString()}
        AND i.paid_at <= ${previousPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'projects' as metric,
          COUNT(*)::float as current_value,
          0 as previous_value
        FROM projects p
        WHERE p.created_at >= ${currentPeriodStart.toISOString()}
        AND p.created_at <= ${currentPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'projects' as metric,
          0 as current_value,
          COUNT(*)::float as previous_value
        FROM projects p
        WHERE p.created_at >= ${previousPeriodStart.toISOString()}
        AND p.created_at <= ${previousPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'invoices' as metric,
          COUNT(*)::float as current_value,
          0 as previous_value
        FROM invoices i
        WHERE i.created_at >= ${currentPeriodStart.toISOString()}
        AND i.created_at <= ${currentPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'invoices' as metric,
          0 as current_value,
          COUNT(*)::float as previous_value
        FROM invoices i
        WHERE i.created_at >= ${previousPeriodStart.toISOString()}
        AND i.created_at <= ${previousPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'messages' as metric,
          COUNT(*)::float as current_value,
          0 as previous_value
        FROM messages m
        WHERE m.created_at >= ${currentPeriodStart.toISOString()}
        AND m.created_at <= ${currentPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'messages' as metric,
          0 as current_value,
          COUNT(*)::float as previous_value
        FROM messages m
        WHERE m.created_at >= ${previousPeriodStart.toISOString()}
        AND m.created_at <= ${previousPeriodEnd.toISOString()}
      `

      // Aggregate results
      results.forEach(row => {
        const metric = row.metric
        trends[metric].current += parseFloat(row.current_value)
        trends[metric].previous += parseFloat(row.previous_value)
      })
    } else {
      // Client sees only their own metrics
      const results = await sql`
        SELECT 
          'revenue' as metric,
          COALESCE(SUM(i.total_amount), 0) as current_value,
          0 as previous_value
        FROM invoices i
        WHERE i.contact_id = ${payload.userId}
        AND i.status = 'paid'
        AND i.paid_at >= ${currentPeriodStart.toISOString()}
        AND i.paid_at <= ${currentPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'revenue' as metric,
          0 as current_value,
          COALESCE(SUM(i.total_amount), 0) as previous_value
        FROM invoices i
        WHERE i.contact_id = ${payload.userId}
        AND i.status = 'paid'
        AND i.paid_at >= ${previousPeriodStart.toISOString()}
        AND i.paid_at <= ${previousPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'projects' as metric,
          COUNT(*)::float as current_value,
          0 as previous_value
        FROM projects p
        WHERE p.contact_id = ${payload.userId}
        AND p.created_at >= ${currentPeriodStart.toISOString()}
        AND p.created_at <= ${currentPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'projects' as metric,
          0 as current_value,
          COUNT(*)::float as previous_value
        FROM projects p
        WHERE p.contact_id = ${payload.userId}
        AND p.created_at >= ${previousPeriodStart.toISOString()}
        AND p.created_at <= ${previousPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'invoices' as metric,
          COUNT(*)::float as current_value,
          0 as previous_value
        FROM invoices i
        WHERE i.contact_id = ${payload.userId}
        AND i.created_at >= ${currentPeriodStart.toISOString()}
        AND i.created_at <= ${currentPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'invoices' as metric,
          0 as current_value,
          COUNT(*)::float as previous_value
        FROM invoices i
        WHERE i.contact_id = ${payload.userId}
        AND i.created_at >= ${previousPeriodStart.toISOString()}
        AND i.created_at <= ${previousPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'messages' as metric,
          COUNT(*)::float as current_value,
          0 as previous_value
        FROM messages m
        WHERE m.contact_id = ${payload.userId}
        AND m.created_at >= ${currentPeriodStart.toISOString()}
        AND m.created_at <= ${currentPeriodEnd.toISOString()}
        
        UNION ALL
        
        SELECT 
          'messages' as metric,
          0 as current_value,
          COUNT(*)::float as previous_value
        FROM messages m
        WHERE m.contact_id = ${payload.userId}
        AND m.created_at >= ${previousPeriodStart.toISOString()}
        AND m.created_at <= ${previousPeriodEnd.toISOString()}
      `

      // Aggregate results
      results.forEach(row => {
        const metric = row.metric
        trends[metric].current += parseFloat(row.current_value)
        trends[metric].previous += parseFloat(row.previous_value)
      })
    }

    // 5. Calculate percentage changes
    const calculateTrend = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0
      }
      return Math.round(((current - previous) / previous) * 100)
    }

    const trendData = {
      revenue: {
        current: Math.round(trends.revenue.current),
        previous: Math.round(trends.revenue.previous),
        percentageChange: calculateTrend(trends.revenue.current, trends.revenue.previous),
        trend: trends.revenue.current >= trends.revenue.previous ? 'up' : 'down'
      },
      projects: {
        current: Math.round(trends.projects.current),
        previous: Math.round(trends.projects.previous),
        percentageChange: calculateTrend(trends.projects.current, trends.projects.previous),
        trend: trends.projects.current >= trends.projects.previous ? 'up' : 'down'
      },
      invoices: {
        current: Math.round(trends.invoices.current),
        previous: Math.round(trends.invoices.previous),
        percentageChange: calculateTrend(trends.invoices.current, trends.invoices.previous),
        trend: trends.invoices.current >= trends.invoices.previous ? 'up' : 'down'
      },
      messages: {
        current: Math.round(trends.messages.current),
        previous: Math.round(trends.messages.previous),
        percentageChange: calculateTrend(trends.messages.current, trends.messages.previous),
        trend: trends.messages.current >= trends.messages.previous ? 'up' : 'down'
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period,
        trends: trendData
      })
    }
  } catch (error) {
    console.error('Dashboard trends error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch trends' })
    }
  }
}
