import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  try {
    // 1. Verify authentication using Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
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

    const supabase = createSupabaseAdmin()

    // 4. Get trends based on user type
    let trends = {
      revenue: { current: 0, previous: 0 },
      projects: { current: 0, previous: 0 },
      invoices: { current: 0, previous: 0 },
      messages: { current: 0, previous: 0 }
    }

    if (contact.role === 'admin') {
      // Admin sees all company metrics
      
      // Current period revenue
      const { data: currentRevenue } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('paid_at', currentPeriodStart.toISOString())
        .lte('paid_at', currentPeriodEnd.toISOString())
      
      // Previous period revenue
      const { data: previousRevenue } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('paid_at', previousPeriodStart.toISOString())
        .lte('paid_at', previousPeriodEnd.toISOString())
      
      // Current period projects
      const { count: currentProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentPeriodStart.toISOString())
        .lte('created_at', currentPeriodEnd.toISOString())
      
      // Previous period projects
      const { count: previousProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousPeriodStart.toISOString())
        .lte('created_at', previousPeriodEnd.toISOString())
      
      // Current period invoices
      const { count: currentInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentPeriodStart.toISOString())
        .lte('created_at', currentPeriodEnd.toISOString())
      
      // Previous period invoices
      const { count: previousInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousPeriodStart.toISOString())
        .lte('created_at', previousPeriodEnd.toISOString())
      
      // Current period messages
      const { count: currentMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentPeriodStart.toISOString())
        .lte('created_at', currentPeriodEnd.toISOString())
      
      // Previous period messages
      const { count: previousMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousPeriodStart.toISOString())
        .lte('created_at', previousPeriodEnd.toISOString())

      // Aggregate results
      trends.revenue.current = currentRevenue?.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0) || 0
      trends.revenue.previous = previousRevenue?.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0) || 0
      trends.projects.current = currentProjects || 0
      trends.projects.previous = previousProjects || 0
      trends.invoices.current = currentInvoices || 0
      trends.invoices.previous = previousInvoices || 0
      trends.messages.current = currentMessages || 0
      trends.messages.previous = previousMessages || 0

    } else {
      // Client sees only their own metrics
      const contactId = contact.id
      
      // Current period revenue
      const { data: currentRevenue } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('contact_id', contactId)
        .eq('status', 'paid')
        .gte('paid_at', currentPeriodStart.toISOString())
        .lte('paid_at', currentPeriodEnd.toISOString())
      
      // Previous period revenue
      const { data: previousRevenue } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('contact_id', contactId)
        .eq('status', 'paid')
        .gte('paid_at', previousPeriodStart.toISOString())
        .lte('paid_at', previousPeriodEnd.toISOString())
      
      // Current period projects
      const { count: currentProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId)
        .gte('created_at', currentPeriodStart.toISOString())
        .lte('created_at', currentPeriodEnd.toISOString())
      
      // Previous period projects
      const { count: previousProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId)
        .gte('created_at', previousPeriodStart.toISOString())
        .lte('created_at', previousPeriodEnd.toISOString())
      
      // Current period invoices
      const { count: currentInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId)
        .gte('created_at', currentPeriodStart.toISOString())
        .lte('created_at', currentPeriodEnd.toISOString())
      
      // Previous period invoices
      const { count: previousInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId)
        .gte('created_at', previousPeriodStart.toISOString())
        .lte('created_at', previousPeriodEnd.toISOString())
      
      // Current period messages
      const { count: currentMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId)
        .gte('created_at', currentPeriodStart.toISOString())
        .lte('created_at', currentPeriodEnd.toISOString())
      
      // Previous period messages
      const { count: previousMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId)
        .gte('created_at', previousPeriodStart.toISOString())
        .lte('created_at', previousPeriodEnd.toISOString())

      // Aggregate results
      trends.revenue.current = currentRevenue?.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0) || 0
      trends.revenue.previous = previousRevenue?.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0) || 0
      trends.projects.current = currentProjects || 0
      trends.projects.previous = previousProjects || 0
      trends.invoices.current = currentInvoices || 0
      trends.invoices.previous = previousInvoices || 0
      trends.messages.current = currentMessages || 0
      trends.messages.previous = previousMessages || 0
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
