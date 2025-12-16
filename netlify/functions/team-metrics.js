/**
 * Team Metrics API
 * Returns aggregate team performance metrics for admin/manager view
 * 
 * Permissions:
 * - Admin: See all team members
 * - Manager: See all team members
 * - Sales Rep: 403 Forbidden
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Authenticate user
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  // Only admin and manager can view team metrics
  if (contact.team_role !== 'admin' && contact.team_role !== 'manager') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden - Admin or Manager access required' })
    }
  }

  const supabase = createSupabaseAdmin()

  try {
    // Get all active team members
    const { data: teamMembers, error: membersError } = await supabase
      .from('contacts')
      .select('id, name, email, team_role, team_status, created_at')
      .eq('is_team_member', true)
      .eq('team_status', 'active')
      .order('name')

    if (membersError) throw membersError

    // Calculate metrics for each team member
    const memberMetrics = await Promise.all(
      teamMembers.map(async (member) => {
        // Get assigned clients count
        const { count: assignedClientsCount } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', member.id)
          .eq('is_team_member', false)

        // Get audits created by this member (all time)
        const { data: audits, error: auditsError } = await supabase
          .from('audits')
          .select('id, created_at, status')
          .eq('created_by', member.id)

        if (auditsError) throw auditsError

        // Get proposals created by this member
        const { data: proposals, error: proposalsError } = await supabase
          .from('proposals')
          .select('id, created_at, status, total_amount')
          .eq('created_by', member.id)

        if (proposalsError) throw proposalsError

        // Calculate this month's activity
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const thisMonthAudits = audits.filter(a => new Date(a.created_at) >= startOfMonth).length
        const thisMonthProposals = proposals.filter(p => new Date(p.created_at) >= startOfMonth).length

        // Calculate last month's activity for trend
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        
        const lastMonthAudits = audits.filter(a => {
          const date = new Date(a.created_at)
          return date >= startOfLastMonth && date <= endOfLastMonth
        }).length

        const lastMonthProposals = proposals.filter(p => {
          const date = new Date(p.created_at)
          return date >= startOfLastMonth && date <= endOfLastMonth
        }).length

        // Calculate trends
        const auditsTrend = lastMonthAudits > 0 
          ? Math.round(((thisMonthAudits - lastMonthAudits) / lastMonthAudits) * 100)
          : thisMonthAudits > 0 ? 100 : 0

        const proposalsTrend = lastMonthProposals > 0
          ? Math.round(((thisMonthProposals - lastMonthProposals) / lastMonthProposals) * 100)
          : thisMonthProposals > 0 ? 100 : 0

        // Calculate revenue metrics
        const acceptedProposals = proposals.filter(p => p.status === 'accepted')
        const totalRevenue = acceptedProposals.reduce((sum, p) => sum + (p.total_amount || 0), 0)
        const pendingProposals = proposals.filter(p => p.status === 'sent' || p.status === 'viewed')
        const pendingRevenue = pendingProposals.reduce((sum, p) => sum + (p.total_amount || 0), 0)

        // Calculate conversion rate (accepted proposals / total proposals)
        const conversionRate = proposals.length > 0
          ? Math.round((acceptedProposals.length / proposals.length) * 100)
          : 0

        // Get pipeline distribution for this member
        const { data: assignedClients } = await supabase
          .from('contacts')
          .select('pipeline_stage')
          .eq('assigned_to', member.id)
          .eq('is_team_member', false)

        const pipelineDistribution = {
          new_lead: 0,
          contacted: 0,
          qualified: 0,
          proposal_sent: 0,
          negotiating: 0,
          won: 0,
          lost: 0
        }

        assignedClients?.forEach(client => {
          if (client.pipeline_stage && pipelineDistribution.hasOwnProperty(client.pipeline_stage)) {
            pipelineDistribution[client.pipeline_stage]++
          }
        })

        // Get recent activity (last 10 items)
        const { data: recentActivity } = await supabase
          .from('activity_logs')
          .select('id, activity_type, description, created_at, metadata')
          .eq('contact_id', member.id)
          .order('created_at', { ascending: false })
          .limit(10)

        return {
          member: {
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.team_role,
            joinedAt: member.created_at
          },
          metrics: {
            assignedClients: assignedClientsCount || 0,
            totalAudits: audits.length,
            totalProposals: proposals.length,
            acceptedProposals: acceptedProposals.length,
            conversionRate,
            totalRevenue,
            pendingRevenue,
            thisMonthAudits,
            thisMonthProposals,
            lastMonthAudits,
            lastMonthProposals
          },
          trends: {
            auditsChange: auditsTrend,
            proposalsChange: proposalsTrend
          },
          pipeline: pipelineDistribution,
          recentActivity: recentActivity || []
        }
      })
    )

    // Calculate aggregate team metrics
    const aggregate = {
      totalMembers: teamMembers.length,
      totalClients: memberMetrics.reduce((sum, m) => sum + m.metrics.assignedClients, 0),
      totalAudits: memberMetrics.reduce((sum, m) => sum + m.metrics.totalAudits, 0),
      totalProposals: memberMetrics.reduce((sum, m) => sum + m.metrics.totalProposals, 0),
      totalRevenue: memberMetrics.reduce((sum, m) => sum + m.metrics.totalRevenue, 0),
      pendingRevenue: memberMetrics.reduce((sum, m) => sum + m.metrics.pendingRevenue, 0),
      thisMonthAudits: memberMetrics.reduce((sum, m) => sum + m.metrics.thisMonthAudits, 0),
      thisMonthProposals: memberMetrics.reduce((sum, m) => sum + m.metrics.thisMonthProposals, 0),
      averageConversion: memberMetrics.length > 0
        ? Math.round(memberMetrics.reduce((sum, m) => sum + m.metrics.conversionRate, 0) / memberMetrics.length)
        : 0
    }

    // Calculate team-wide pipeline distribution
    const teamPipeline = {
      new_lead: 0,
      contacted: 0,
      qualified: 0,
      proposal_sent: 0,
      negotiating: 0,
      won: 0,
      lost: 0
    }

    memberMetrics.forEach(m => {
      Object.keys(m.pipeline).forEach(stage => {
        teamPipeline[stage] += m.pipeline[stage]
      })
    })

    // Create leaderboard (sorted by revenue)
    const leaderboard = memberMetrics
      .map(m => ({
        id: m.member.id,
        name: m.member.name,
        email: m.member.email,
        role: m.member.role,
        totalRevenue: m.metrics.totalRevenue,
        acceptedProposals: m.metrics.acceptedProposals,
        conversionRate: m.metrics.conversionRate,
        thisMonthAudits: m.metrics.thisMonthAudits,
        thisMonthProposals: m.metrics.thisMonthProposals,
        assignedClients: m.metrics.assignedClients
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    // Get top performers
    const topPerformers = {
      byRevenue: leaderboard[0] || null,
      byConversion: [...leaderboard].sort((a, b) => b.conversionRate - a.conversionRate)[0] || null,
      byActivity: [...leaderboard].sort((a, b) => 
        (b.thisMonthAudits + b.thisMonthProposals) - (a.thisMonthAudits + a.thisMonthProposals)
      )[0] || null
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        aggregate,
        teamPipeline,
        leaderboard,
        topPerformers,
        memberMetrics
      })
    }

  } catch (error) {
    console.error('Error fetching team metrics:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch team metrics',
        details: error.message 
      })
    }
  }
}
