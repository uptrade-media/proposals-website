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

    // 2. Parse query parameters
    const { limit = '10', offset = '0' } = event.queryStringParameters || {}
    const queryLimit = Math.min(parseInt(limit), 50) // Cap at 50
    const queryOffset = parseInt(offset)

    // 3. Get activity based on user type
    const supabase = createSupabaseAdmin()
    
    // Calculate 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    let activities = []

    if (contact.role === 'admin') {
      // Admin sees all activity across all clients
      // Fetch from multiple tables and combine
      
      // Projects updated in last 30 days
      const { data: projectActivities } = await supabase
        .from('projects')
        .select('id, name, updated_at, contact_id, contacts!inner(email)')
        .gte('updated_at', thirtyDaysAgoISO)
        .order('updated_at', { ascending: false })
        .limit(queryLimit)
      
      // Invoices created in last 30 days
      const { data: invoiceActivities } = await supabase
        .from('invoices')
        .select('id, created_at, contact_id, contacts!inner(email)')
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(queryLimit)
      
      // Messages received in last 30 days
      const { data: messageActivities } = await supabase
        .from('messages')
        .select('id, content, created_at, contact_id, contacts!inner(email, name)')
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(queryLimit)
      
      // Proposals accepted in last 30 days
      const { data: proposalActivities } = await supabase
        .from('proposals')
        .select('id, title, accepted_at, contact_id, contacts!inner(email, name)')
        .eq('status', 'accepted')
        .gte('accepted_at', thirtyDaysAgoISO)
        .order('accepted_at', { ascending: false })
        .limit(queryLimit)

      // Combine and format activities
      const allActivities = []
      
      if (projectActivities) {
        projectActivities.forEach(p => {
          allActivities.push({
            type: 'project',
            action: 'updated',
            title: p.name,
            description: 'Project status changed',
            related_id: p.id,
            timestamp: p.updated_at,
            user_email: p.contacts?.email
          })
        })
      }
      
      if (invoiceActivities) {
        invoiceActivities.forEach(i => {
          allActivities.push({
            type: 'invoice',
            action: 'created',
            title: `Invoice #${i.id}`,
            description: 'New invoice created',
            related_id: i.id,
            timestamp: i.created_at,
            user_email: i.contacts?.email
          })
        })
      }
      
      if (messageActivities) {
        messageActivities.forEach(m => {
          allActivities.push({
            type: 'message',
            action: 'received',
            title: m.contacts?.name || 'Client',
            description: `New message: ${m.content?.substring(0, 50)}...`,
            related_id: m.id,
            timestamp: m.created_at,
            user_email: m.contacts?.email
          })
        })
      }
      
      if (proposalActivities) {
        proposalActivities.forEach(pr => {
          allActivities.push({
            type: 'proposal',
            action: 'accepted',
            title: pr.title,
            description: `Proposal accepted by ${pr.contacts?.name}`,
            related_id: pr.id,
            timestamp: pr.accepted_at,
            user_email: pr.contacts?.email
          })
        })
      }

      // Sort by timestamp and apply pagination
      activities = allActivities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(queryOffset, queryOffset + queryLimit)

    } else {
      // Client sees only their own activity
      const contactId = contact.id

      // Projects
      const { data: projectActivities } = await supabase
        .from('projects')
        .select('id, name, status, updated_at')
        .eq('contact_id', contactId)
        .gte('updated_at', thirtyDaysAgoISO)
        .order('updated_at', { ascending: false })
        .limit(queryLimit)
      
      // Invoices
      const { data: invoiceActivities } = await supabase
        .from('invoices')
        .select('id, total_amount, created_at')
        .eq('contact_id', contactId)
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(queryLimit)
      
      // Messages
      const { data: messageActivities } = await supabase
        .from('messages')
        .select('id, content, created_at')
        .eq('contact_id', contactId)
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(queryLimit)
      
      // Proposals
      const { data: proposalActivities } = await supabase
        .from('proposals')
        .select('id, title, accepted_at')
        .eq('contact_id', contactId)
        .eq('status', 'accepted')
        .gte('accepted_at', thirtyDaysAgoISO)
        .order('accepted_at', { ascending: false })
        .limit(queryLimit)

      const allActivities = []
      
      if (projectActivities) {
        projectActivities.forEach(p => {
          allActivities.push({
            type: 'project',
            action: 'updated',
            title: p.name,
            description: `Project status: ${p.status}`,
            related_id: p.id,
            timestamp: p.updated_at,
            user_email: 'You'
          })
        })
      }
      
      if (invoiceActivities) {
        invoiceActivities.forEach(i => {
          allActivities.push({
            type: 'invoice',
            action: 'created',
            title: `Invoice #${i.id}`,
            description: `Invoice amount: $${i.total_amount}`,
            related_id: i.id,
            timestamp: i.created_at,
            user_email: 'You'
          })
        })
      }
      
      if (messageActivities) {
        messageActivities.forEach(m => {
          allActivities.push({
            type: 'message',
            action: 'received',
            title: 'Team Message',
            description: m.content?.substring(0, 100) || '',
            related_id: m.id,
            timestamp: m.created_at,
            user_email: 'Team'
          })
        })
      }
      
      if (proposalActivities) {
        proposalActivities.forEach(pr => {
          allActivities.push({
            type: 'proposal',
            action: 'accepted',
            title: pr.title,
            description: 'You accepted this proposal',
            related_id: pr.id,
            timestamp: pr.accepted_at,
            user_email: 'You'
          })
        })
      }

      activities = allActivities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(queryOffset, queryOffset + queryLimit)
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
