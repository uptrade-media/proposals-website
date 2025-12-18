// netlify/functions/routes/dashboard.js
// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Routes - Stats, activity, trends
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'

export async function handle(ctx) {
  const { method, segments, supabase, query, contact, orgId } = ctx
  const [, resource, timeframe] = segments
  
  if (method !== 'GET') {
    return response(405, { error: 'Method not allowed' })
  }
  
  switch (resource) {
    case 'stats':
      return await getStats(ctx)
    case 'activity':
      return await getActivity(ctx)
    case 'trends':
      return await getTrends(ctx, timeframe || query.timeframe)
    case 'pipeline':
      return await getPipeline(ctx)
    case 'revenue':
      return await getRevenue(ctx, timeframe || query.timeframe)
    case 'tasks':
      return await getUpcomingTasks(ctx)
    case 'notifications':
      return await getNotifications(ctx)
    case 'overview':
    default:
      return await getOverview(ctx)
  }
}

async function getOverview(ctx) {
  const { supabase, orgId, contact } = ctx
  
  // Run all queries in parallel
  const [
    projectsRes,
    proposalsRes,
    invoicesRes,
    messagesRes,
    tasksRes
  ] = await Promise.all([
    // Active projects
    supabase
      .from('projects')
      .select('id', { count: 'exact' })
      .eq('org_id', orgId)
      .eq('status', 'active'),
    
    // Pending proposals
    supabase
      .from('proposals')
      .select('id', { count: 'exact' })
      .eq('org_id', orgId)
      .in('status', ['draft', 'sent', 'viewed']),
    
    // Unpaid invoices
    supabase
      .from('invoices')
      .select('id, amount', { count: 'exact' })
      .eq('org_id', orgId)
      .in('status', ['sent', 'overdue']),
    
    // Unread messages
    supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('org_id', orgId)
      .is('read_at', null),
    
    // Upcoming tasks
    supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .gte('due_date', new Date().toISOString())
  ])
  
  return response(200, {
    overview: {
      activeProjects: projectsRes.count || 0,
      pendingProposals: proposalsRes.count || 0,
      unpaidInvoices: invoicesRes.count || 0,
      unpaidAmount: invoicesRes.data?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0,
      unreadMessages: messagesRes.count || 0,
      upcomingTasks: tasksRes.count || 0
    }
  })
}

async function getStats(ctx) {
  const { supabase, query, orgId } = ctx
  const { period = '30d' } = query
  
  const startDate = getStartDate(period)
  
  const [
    newClientsRes,
    newProposalsRes,
    acceptedProposalsRes,
    revenueRes
  ] = await Promise.all([
    // New clients
    supabase
      .from('contacts')
      .select('id', { count: 'exact' })
      .eq('org_id', orgId)
      .eq('type', 'client')
      .gte('created_at', startDate),
    
    // New proposals
    supabase
      .from('proposals')
      .select('id', { count: 'exact' })
      .eq('org_id', orgId)
      .gte('created_at', startDate),
    
    // Accepted proposals
    supabase
      .from('proposals')
      .select('id, total', { count: 'exact' })
      .eq('org_id', orgId)
      .eq('status', 'accepted')
      .gte('accepted_at', startDate),
    
    // Revenue (paid invoices)
    supabase
      .from('invoices')
      .select('amount')
      .eq('org_id', orgId)
      .eq('status', 'paid')
      .gte('paid_at', startDate)
  ])
  
  const acceptedValue = acceptedProposalsRes.data?.reduce((sum, p) => sum + (p.total || 0), 0) || 0
  const revenue = revenueRes.data?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0
  
  return response(200, {
    stats: {
      period,
      newClients: newClientsRes.count || 0,
      newProposals: newProposalsRes.count || 0,
      acceptedProposals: acceptedProposalsRes.count || 0,
      acceptedValue,
      revenue,
      conversionRate: newProposalsRes.count 
        ? ((acceptedProposalsRes.count || 0) / newProposalsRes.count * 100).toFixed(1)
        : 0
    }
  })
}

async function getActivity(ctx) {
  const { supabase, query, orgId, contact } = ctx
  const { limit = 20, type } = query
  
  let q = supabase
    .from('activity_logs')
    .select('*, user:contacts(id, name, avatar)')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (orgId) q = q.eq('org_id', orgId)
  if (type) q = q.eq('type', type)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { activities: data })
}

async function getTrends(ctx, timeframe = '7d') {
  const { supabase, orgId } = ctx
  
  const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 7
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  // Get daily counts for key metrics
  const { data: proposals } = await supabase
    .from('proposals')
    .select('created_at, status')
    .eq('org_id', orgId)
    .gte('created_at', startDate.toISOString())
  
  const { data: invoices } = await supabase
    .from('invoices')
    .select('created_at, paid_at, amount')
    .eq('org_id', orgId)
    .gte('created_at', startDate.toISOString())
  
  // Group by day
  const trends = {}
  
  for (let d = 0; d < days; d++) {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - d))
    const dateStr = date.toISOString().split('T')[0]
    
    trends[dateStr] = {
      date: dateStr,
      proposals: 0,
      accepted: 0,
      invoiced: 0,
      revenue: 0
    }
  }
  
  // Fill in proposal data
  proposals?.forEach(p => {
    const dateStr = p.created_at.split('T')[0]
    if (trends[dateStr]) {
      trends[dateStr].proposals++
      if (p.status === 'accepted') trends[dateStr].accepted++
    }
  })
  
  // Fill in invoice data
  invoices?.forEach(i => {
    const dateStr = i.created_at.split('T')[0]
    if (trends[dateStr]) {
      trends[dateStr].invoiced++
    }
    if (i.paid_at) {
      const paidDateStr = i.paid_at.split('T')[0]
      if (trends[paidDateStr]) {
        trends[paidDateStr].revenue += i.amount || 0
      }
    }
  })
  
  return response(200, { trends: Object.values(trends) })
}

async function getPipeline(ctx) {
  const { supabase, orgId } = ctx
  
  // Get proposals by stage
  const { data, error } = await supabase
    .from('proposals')
    .select('id, title, total, status, contact:contacts(id, name, company)')
    .eq('org_id', orgId)
    .in('status', ['draft', 'sent', 'viewed', 'negotiating'])
    .order('created_at', { ascending: false })
  
  if (error) return response(500, { error: error.message })
  
  // Group by stage
  const pipeline = {
    draft: { count: 0, value: 0, items: [] },
    sent: { count: 0, value: 0, items: [] },
    viewed: { count: 0, value: 0, items: [] },
    negotiating: { count: 0, value: 0, items: [] }
  }
  
  data?.forEach(p => {
    const stage = pipeline[p.status]
    if (stage) {
      stage.count++
      stage.value += p.total || 0
      stage.items.push(p)
    }
  })
  
  const totalValue = Object.values(pipeline).reduce((sum, stage) => sum + stage.value, 0)
  
  return response(200, { pipeline, totalValue })
}

async function getRevenue(ctx, timeframe = '12m') {
  const { supabase, orgId } = ctx
  
  const months = timeframe === '6m' ? 6 : timeframe === '24m' ? 24 : 12
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)
  
  const { data: invoices } = await supabase
    .from('invoices')
    .select('paid_at, amount')
    .eq('org_id', orgId)
    .eq('status', 'paid')
    .gte('paid_at', startDate.toISOString())
  
  // Group by month
  const revenue = {}
  
  for (let m = 0; m < months; m++) {
    const date = new Date()
    date.setMonth(date.getMonth() - (months - 1 - m))
    const monthStr = date.toISOString().slice(0, 7) // YYYY-MM
    revenue[monthStr] = { month: monthStr, amount: 0, count: 0 }
  }
  
  invoices?.forEach(i => {
    const monthStr = i.paid_at.slice(0, 7)
    if (revenue[monthStr]) {
      revenue[monthStr].amount += i.amount || 0
      revenue[monthStr].count++
    }
  })
  
  return response(200, { revenue: Object.values(revenue) })
}

async function getUpcomingTasks(ctx) {
  const { supabase, query, orgId, contact } = ctx
  const { limit = 10, assignedTo } = query
  
  let q = supabase
    .from('tasks')
    .select('*, assigned_to:contacts!assigned_to(id, name)')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(limit)
  
  if (assignedTo) {
    q = q.eq('assigned_to', assignedTo)
  }
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { tasks: data })
}

async function getNotifications(ctx) {
  const { supabase, query, contact } = ctx
  const { limit = 20, unreadOnly = true } = query
  
  let q = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', contact.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (unreadOnly) {
    q = q.is('read_at', null)
  }
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { notifications: data })
}

function getStartDate(period) {
  const now = new Date()
  switch (period) {
    case '7d': now.setDate(now.getDate() - 7); break
    case '30d': now.setDate(now.getDate() - 30); break
    case '90d': now.setDate(now.getDate() - 90); break
    case '1y': now.setFullYear(now.getFullYear() - 1); break
    default: now.setDate(now.getDate() - 30)
  }
  return now.toISOString()
}
