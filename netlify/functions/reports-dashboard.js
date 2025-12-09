// netlify/functions/reports-dashboard.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()

    // Parse date range from query params
    const params = new URLSearchParams(event.queryStringParameters || {})
    const period = params.get('period') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Fetch overview metrics
    const metrics = {}
    const isAdmin = contact.role === 'admin'

    // Total active projects
    let projectsQuery = supabase.from('projects').select('id', { count: 'exact' }).eq('status', 'active')
    if (!isAdmin) projectsQuery = projectsQuery.eq('contact_id', contact.id)
    const { count: activeProjects } = await projectsQuery
    metrics.activeProjects = activeProjects || 0

    // Total pending proposals
    let proposalsQuery = supabase.from('proposals').select('id', { count: 'exact' }).eq('status', 'sent')
    if (!isAdmin) proposalsQuery = proposalsQuery.eq('contact_id', contact.id)
    const { count: pendingProposals } = await proposalsQuery
    metrics.pendingProposals = pendingProposals || 0

    // Total pending invoices
    let invoicesQuery = supabase.from('invoices').select('total_amount').eq('status', 'pending')
    if (!isAdmin) invoicesQuery = invoicesQuery.eq('contact_id', contact.id)
    const { data: pendingInvoicesData } = await invoicesQuery
    metrics.pendingInvoices = (pendingInvoicesData || []).reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)

    // Total revenue (paid invoices in period)
    let revenueQuery = supabase.from('invoices').select('total_amount').eq('status', 'paid').gte('paid_at', startDate.toISOString())
    if (!isAdmin) revenueQuery = revenueQuery.eq('contact_id', contact.id)
    const { data: revenueData } = await revenueQuery
    metrics.revenue = (revenueData || []).reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)

    // Unread messages count
    let messagesQuery = supabase.from('messages').select('id', { count: 'exact' }).is('read_at', null)
    if (!isAdmin) messagesQuery = messagesQuery.eq('recipient_id', contact.id)
    const { count: unreadMessages } = await messagesQuery
    metrics.unreadMessages = unreadMessages || 0

    // Recent activity (last 7 days)
    const activityStartDate = new Date()
    activityStartDate.setDate(activityStartDate.getDate() - 7)

    // Recent projects activity
    let recentProjectsQuery = supabase.from('projects').select('id', { count: 'exact' }).gte('updated_at', activityStartDate.toISOString())
    if (!isAdmin) recentProjectsQuery = recentProjectsQuery.eq('contact_id', contact.id)
    const { count: recentProjectActivity } = await recentProjectsQuery
    metrics.recentProjectActivity = recentProjectActivity || 0

    // Recent messages
    let recentMessagesQuery = supabase.from('messages').select('id', { count: 'exact' }).gte('created_at', activityStartDate.toISOString())
    if (!isAdmin) recentMessagesQuery = recentMessagesQuery.or(`sender_id.eq.${contact.id},recipient_id.eq.${contact.id}`)
    const { count: recentMessages } = await recentMessagesQuery
    metrics.recentMessages = recentMessages || 0

    // Project status breakdown
    let allProjectsQuery = supabase.from('projects').select('status')
    if (!isAdmin) allProjectsQuery = allProjectsQuery.eq('contact_id', contact.id)
    const { data: allProjects } = await allProjectsQuery
    const statusCounts = (allProjects || []).reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {})
    metrics.projectStatusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

    // Invoice status breakdown
    let allInvoicesQuery = supabase.from('invoices').select('status, total_amount')
    if (!isAdmin) allInvoicesQuery = allInvoicesQuery.eq('contact_id', contact.id)
    const { data: allInvoices } = await allInvoicesQuery
    const invoiceBreakdown = (allInvoices || []).reduce((acc, inv) => {
      if (!acc[inv.status]) acc[inv.status] = { count: 0, total: 0 }
      acc[inv.status].count++
      acc[inv.status].total += parseFloat(inv.total_amount || 0)
      return acc
    }, {})
    metrics.invoiceStatusBreakdown = Object.entries(invoiceBreakdown).map(([status, data]) => ({ status, ...data }))

    // Monthly revenue trend (last 6 months) - admin only
    if (isAdmin) {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const { data: monthlyData } = await supabase
        .from('invoices')
        .select('paid_at, total_amount')
        .eq('status', 'paid')
        .gte('paid_at', sixMonthsAgo.toISOString())
      
      const monthlyRevenue = (monthlyData || []).reduce((acc, inv) => {
        const month = new Date(inv.paid_at).toISOString().slice(0, 7) // YYYY-MM
        acc[month] = (acc[month] || 0) + parseFloat(inv.total_amount || 0)
        return acc
      }, {})
      metrics.monthlyRevenue = Object.entries(monthlyRevenue)
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        metrics,
        period: parseInt(period),
        generatedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch dashboard metrics',
        message: error.message 
      })
    }
  }
}
