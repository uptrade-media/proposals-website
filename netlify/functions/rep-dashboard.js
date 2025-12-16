// netlify/functions/rep-dashboard.js
// Returns dashboard data for the current team member (filtered by ownership)
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { requireTeamMember } from './utils/permissions.js'

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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    // Require team member access
    requireTeamMember(contact)

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.team_role === 'admin' || contact.team_role === 'manager'
    const repId = contact.id

    // Get date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    // Build base queries with ownership filter
    const ownershipFilter = isAdmin ? {} : { created_by: repId }
    const assignmentFilter = isAdmin ? {} : { assigned_to: repId }

    // Parallel fetch all data
    const [
      auditsResult,
      proposalsResult,
      clientsResult,
      pipelineResult,
      recentActivityResult,
      thisMonthAuditsResult,
      lastMonthAuditsResult,
      thisMonthProposalsResult,
      lastMonthProposalsResult
    ] = await Promise.all([
      // Total audits created
      supabase
        .from('audits')
        .select('id', { count: 'exact', head: true })
        .match(ownershipFilter),
      
      // Total proposals
      supabase
        .from('proposals')
        .select('id, status, total_value', { count: 'exact' })
        .match(ownershipFilter),
      
      // Assigned clients
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('is_team_member', false)
        .match(assignmentFilter),
      
      // Pipeline by stage (for rep's clients)
      isAdmin 
        ? supabase
            .from('contacts')
            .select('id, pipeline_stage')
            .eq('is_team_member', false)
        : supabase
            .from('contacts')
            .select('id, pipeline_stage')
            .eq('is_team_member', false)
            .eq('assigned_to', repId),
      
      // Recent activity (last 20 items)
      supabase
        .from('activity_log')
        .select('id, activity_type, description, created_at, contact_id')
        .eq('performed_by', repId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // This month's audits
      supabase
        .from('audits')
        .select('id', { count: 'exact', head: true })
        .match(ownershipFilter)
        .gte('created_at', startOfMonth.toISOString()),
      
      // Last month's audits
      supabase
        .from('audits')
        .select('id', { count: 'exact', head: true })
        .match(ownershipFilter)
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString()),
      
      // This month's proposals
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .match(ownershipFilter)
        .gte('created_at', startOfMonth.toISOString()),
      
      // Last month's proposals
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .match(ownershipFilter)
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString())
    ])

    // Calculate metrics
    const proposals = proposalsResult.data || []
    const acceptedProposals = proposals.filter(p => p.status === 'accepted' || p.status === 'signed')
    const pendingProposals = proposals.filter(p => p.status === 'sent' || p.status === 'draft')
    const totalRevenue = acceptedProposals.reduce((sum, p) => sum + (p.total_value || 0), 0)
    const pendingRevenue = pendingProposals.reduce((sum, p) => sum + (p.total_value || 0), 0)
    
    // Conversion rate
    const conversionRate = proposals.length > 0 
      ? Math.round((acceptedProposals.length / proposals.length) * 100) 
      : 0

    // Month over month changes
    const thisMonthAudits = thisMonthAuditsResult.count || 0
    const lastMonthAudits = lastMonthAuditsResult.count || 0
    const auditsChange = lastMonthAudits > 0 
      ? Math.round(((thisMonthAudits - lastMonthAudits) / lastMonthAudits) * 100)
      : thisMonthAudits > 0 ? 100 : 0

    const thisMonthProposals = thisMonthProposalsResult.count || 0
    const lastMonthProposals = lastMonthProposalsResult.count || 0
    const proposalsChange = lastMonthProposals > 0
      ? Math.round(((thisMonthProposals - lastMonthProposals) / lastMonthProposals) * 100)
      : thisMonthProposals > 0 ? 100 : 0

    // Pipeline breakdown
    const pipelineData = pipelineResult.data || []
    const pipelineStats = {
      new_lead: 0,
      contacted: 0,
      qualified: 0,
      proposal_sent: 0,
      negotiating: 0,
      won: 0,
      lost: 0
    }
    pipelineData.forEach(c => {
      const stage = c.pipeline_stage || 'new_lead'
      if (pipelineStats[stage] !== undefined) {
        pipelineStats[stage]++
      }
    })

    // Format recent activity
    const recentActivity = (recentActivityResult.data || []).map(a => ({
      id: a.id,
      type: a.activity_type,
      description: a.description,
      contactId: a.contact_id,
      createdAt: a.created_at
    }))

    // Build response
    const dashboard = {
      metrics: {
        totalAudits: auditsResult.count || 0,
        totalProposals: proposals.length,
        acceptedProposals: acceptedProposals.length,
        pendingProposals: pendingProposals.length,
        assignedClients: clientsResult.count || 0,
        conversionRate,
        totalRevenue,
        pendingRevenue
      },
      trends: {
        thisMonthAudits,
        lastMonthAudits,
        auditsChange,
        thisMonthProposals,
        lastMonthProposals,
        proposalsChange
      },
      pipeline: pipelineStats,
      recentActivity,
      period: {
        startOfMonth: startOfMonth.toISOString(),
        startOfWeek: startOfWeek.toISOString(),
        now: now.toISOString()
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(dashboard)
    }

  } catch (error) {
    console.error('Error in rep-dashboard:', error)
    return {
      statusCode: error.message?.includes('required') ? 403 : 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}
