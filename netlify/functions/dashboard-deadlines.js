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
    const { daysAhead = '30' } = event.queryStringParameters || {}
    const queryDays = Math.min(parseInt(daysAhead), 365) // Cap at 365 days

    // 3. Get upcoming deadlines
    const supabase = createSupabaseAdmin()
    
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + queryDays)
    const futureDateISO = futureDate.toISOString()

    let deadlines = []

    // Helper function to calculate status and priority
    const getItemDetails = (dueDate, status, itemType, amount = 0) => {
      const due = new Date(dueDate)
      const daysUntil = Math.floor((due - now) / (1000 * 60 * 60 * 24))
      
      let itemStatus = 'pending'
      if (itemType === 'project') {
        if (status === 'completed') itemStatus = 'completed'
        else if (daysUntil < 0) itemStatus = 'overdue'
        else if (daysUntil < 7) itemStatus = 'in-progress'
      } else if (itemType === 'invoice') {
        if (status === 'paid') itemStatus = 'completed'
        else if (daysUntil < 0) itemStatus = 'overdue'
        else if (daysUntil < 7) itemStatus = 'in-progress'
      } else if (itemType === 'proposal') {
        if (status === 'accepted') itemStatus = 'completed'
        else if (daysUntil < 0) itemStatus = 'overdue'
        else if (daysUntil < 3) itemStatus = 'in-progress'
      }
      
      let priority = 'normal'
      if (itemType === 'proposal') priority = 'high'
      else if (itemType === 'invoice' && amount > 5000) priority = 'high'
      
      return { itemStatus, priority, daysUntil }
    }

    if (contact.role === 'admin') {
      // Admin sees all deadlines across all clients
      
      // Projects with end dates
      const { data: projectDeadlines } = await supabase
        .from('projects')
        .select('id, name, end_date, status, contact_id, contacts!inner(email, name)')
        .not('end_date', 'is', null)
        .neq('status', 'completed')
        .lte('end_date', futureDateISO)
        .order('end_date', { ascending: true })
        .limit(20)
      
      // Invoices with due dates
      const { data: invoiceDeadlines } = await supabase
        .from('invoices')
        .select('id, due_date, status, total_amount, contact_id, contacts!inner(email, name)')
        .not('due_date', 'is', null)
        .neq('status', 'paid')
        .lte('due_date', futureDateISO)
        .order('due_date', { ascending: true })
        .limit(20)
      
      // Proposals with valid_until dates
      const { data: proposalDeadlines } = await supabase
        .from('proposals')
        .select('id, title, valid_until, status, contact_id, contacts!inner(email, name)')
        .not('valid_until', 'is', null)
        .not('status', 'in', '("accepted","declined")')
        .lte('valid_until', futureDateISO)
        .order('valid_until', { ascending: true })
        .limit(20)

      const allDeadlines = []
      
      if (projectDeadlines) {
        projectDeadlines.forEach(p => {
          const { itemStatus, priority, daysUntil } = getItemDetails(p.end_date, p.status, 'project')
          allDeadlines.push({
            item_type: 'project',
            item_id: p.id,
            name: p.name,
            due_date: p.end_date,
            priority,
            status: itemStatus,
            days_until: daysUntil,
            contact_email: p.contacts?.email,
            contact_name: p.contacts?.name
          })
        })
      }
      
      if (invoiceDeadlines) {
        invoiceDeadlines.forEach(i => {
          const { itemStatus, priority, daysUntil } = getItemDetails(i.due_date, i.status, 'invoice', i.total_amount)
          allDeadlines.push({
            item_type: 'invoice',
            item_id: i.id,
            name: `Invoice #${i.id}`,
            due_date: i.due_date,
            priority,
            status: itemStatus,
            days_until: daysUntil,
            contact_email: i.contacts?.email,
            contact_name: i.contacts?.name
          })
        })
      }
      
      if (proposalDeadlines) {
        proposalDeadlines.forEach(pr => {
          const { itemStatus, priority, daysUntil } = getItemDetails(pr.valid_until, pr.status, 'proposal')
          allDeadlines.push({
            item_type: 'proposal',
            item_id: pr.id,
            name: pr.title,
            due_date: pr.valid_until,
            priority,
            status: itemStatus,
            days_until: daysUntil,
            contact_email: pr.contacts?.email,
            contact_name: pr.contacts?.name
          })
        })
      }

      deadlines = allDeadlines
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 20)

    } else {
      // Client sees only their own deadlines
      const contactId = contact.id

      // Projects
      const { data: projectDeadlines } = await supabase
        .from('projects')
        .select('id, name, end_date, status')
        .eq('contact_id', contactId)
        .not('end_date', 'is', null)
        .neq('status', 'completed')
        .lte('end_date', futureDateISO)
        .order('end_date', { ascending: true })
        .limit(20)
      
      // Invoices
      const { data: invoiceDeadlines } = await supabase
        .from('invoices')
        .select('id, due_date, status, total_amount')
        .eq('contact_id', contactId)
        .not('due_date', 'is', null)
        .neq('status', 'paid')
        .lte('due_date', futureDateISO)
        .order('due_date', { ascending: true })
        .limit(20)
      
      // Proposals
      const { data: proposalDeadlines } = await supabase
        .from('proposals')
        .select('id, title, valid_until, status')
        .eq('contact_id', contactId)
        .not('valid_until', 'is', null)
        .not('status', 'in', '("accepted","declined")')
        .lte('valid_until', futureDateISO)
        .order('valid_until', { ascending: true })
        .limit(20)

      const allDeadlines = []
      
      if (projectDeadlines) {
        projectDeadlines.forEach(p => {
          const { itemStatus, priority, daysUntil } = getItemDetails(p.end_date, p.status, 'project')
          allDeadlines.push({
            item_type: 'project',
            item_id: p.id,
            name: p.name,
            due_date: p.end_date,
            priority,
            status: itemStatus,
            days_until: daysUntil
          })
        })
      }
      
      if (invoiceDeadlines) {
        invoiceDeadlines.forEach(i => {
          const { itemStatus, priority, daysUntil } = getItemDetails(i.due_date, i.status, 'invoice', i.total_amount)
          allDeadlines.push({
            item_type: 'invoice',
            item_id: i.id,
            name: `Invoice #${i.id}`,
            due_date: i.due_date,
            priority,
            status: itemStatus,
            days_until: daysUntil
          })
        })
      }
      
      if (proposalDeadlines) {
        proposalDeadlines.forEach(pr => {
          const { itemStatus, priority, daysUntil } = getItemDetails(pr.valid_until, pr.status, 'proposal')
          allDeadlines.push({
            item_type: 'proposal',
            item_id: pr.id,
            name: pr.title,
            due_date: pr.valid_until,
            priority,
            status: itemStatus,
            days_until: daysUntil
          })
        })
      }

      deadlines = allDeadlines
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 20)
    }

    return {
      statusCode: 200,
      headers,
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
      headers,
      body: JSON.stringify({ error: 'Failed to fetch deadlines', message: error.message })
    }
  }
}
