// netlify/functions/admin-team-list.js
// Lists all team members (admin/manager only)
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { requireAdmin } from './utils/permissions.js'

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
    // Only admins and managers can list team members
    requireAdmin(contact)

    const supabase = createSupabaseAdmin()

    // Get all team members with their metrics
    const { data: teamMembers, error: teamError } = await supabase
      .from('contacts')
      .select(`
        id,
        email,
        name,
        avatar,
        google_id,
        team_role,
        team_status,
        openphone_number,
        gmail_address,
        created_at
      `)
      .eq('is_team_member', true)
      .order('team_role', { ascending: true })
      .order('name', { ascending: true })

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch team members' })
      }
    }

    // Get counts for each team member
    const teamMemberIds = teamMembers.map(m => m.id)
    
    // Get audit counts by creator
    const { data: auditCounts } = await supabase
      .from('audits')
      .select('created_by')
      .in('created_by', teamMemberIds)
    
    // Get proposal counts by creator
    const { data: proposalCounts } = await supabase
      .from('proposals')
      .select('created_by, status')
      .in('created_by', teamMemberIds)
    
    // Get assigned client counts
    const { data: clientCounts } = await supabase
      .from('contacts')
      .select('assigned_to')
      .eq('is_team_member', false)
      .in('assigned_to', teamMemberIds)

    // Aggregate counts per team member
    const auditsByMember = {}
    const proposalsByMember = {}
    const acceptedProposalsByMember = {}
    const clientsByMember = {}

    auditCounts?.forEach(a => {
      auditsByMember[a.created_by] = (auditsByMember[a.created_by] || 0) + 1
    })

    proposalCounts?.forEach(p => {
      proposalsByMember[p.created_by] = (proposalsByMember[p.created_by] || 0) + 1
      if (p.status === 'accepted' || p.status === 'signed') {
        acceptedProposalsByMember[p.created_by] = (acceptedProposalsByMember[p.created_by] || 0) + 1
      }
    })

    clientCounts?.forEach(c => {
      clientsByMember[c.assigned_to] = (clientsByMember[c.assigned_to] || 0) + 1
    })

    // Format response with metrics
    const formattedTeamMembers = teamMembers.map(member => ({
      id: member.id,
      email: member.email,
      name: member.name,
      avatar: member.avatar,
      hasGoogleAuth: !!member.google_id,
      teamRole: member.team_role,
      teamStatus: member.team_status,
      openphoneNumber: member.openphone_number,
      gmailAddress: member.gmail_address,
      createdAt: member.created_at,
      metrics: {
        auditsCreated: auditsByMember[member.id] || 0,
        proposalsCreated: proposalsByMember[member.id] || 0,
        proposalsAccepted: acceptedProposalsByMember[member.id] || 0,
        clientsAssigned: clientsByMember[member.id] || 0,
        conversionRate: proposalsByMember[member.id] 
          ? Math.round((acceptedProposalsByMember[member.id] || 0) / proposalsByMember[member.id] * 100)
          : 0
      }
    }))

    // Calculate team summary
    const summary = {
      totalMembers: teamMembers.length,
      activeMembers: teamMembers.filter(m => m.team_status === 'active').length,
      admins: teamMembers.filter(m => m.team_role === 'admin').length,
      managers: teamMembers.filter(m => m.team_role === 'manager').length,
      salesReps: teamMembers.filter(m => m.team_role === 'sales_rep').length,
      totalAudits: Object.values(auditsByMember).reduce((sum, n) => sum + n, 0),
      totalProposals: Object.values(proposalsByMember).reduce((sum, n) => sum + n, 0),
      totalAccepted: Object.values(acceptedProposalsByMember).reduce((sum, n) => sum + n, 0)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        teamMembers: formattedTeamMembers,
        summary
      })
    }

  } catch (error) {
    console.error('Error in admin-team-list:', error)
    return {
      statusCode: error.message?.includes('required') ? 403 : 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}
