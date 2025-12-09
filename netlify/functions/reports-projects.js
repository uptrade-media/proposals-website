// netlify/functions/reports-projects.js
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

  try {
    // Verify authentication via Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    const isAdmin = contact?.role === 'admin'
    const contactId = contact?.id
    const supabase = createSupabaseAdmin()

    // Fetch all projects (filtered by role)
    let projectsQuery = supabase
      .from('projects')
      .select('id, name, status, budget, start_date, end_date, contact_id, created_at')
    
    if (!isAdmin) {
      projectsQuery = projectsQuery.eq('contact_id', contactId)
    }
    
    const { data: projects, error: projectsError } = await projectsQuery
    
    if (projectsError) {
      console.error('Projects query error:', projectsError)
      throw new Error('Failed to fetch projects')
    }

    // Calculate summary
    const summary = {
      totalProjects: projects?.length || 0,
      activeProjects: projects?.filter(p => p.status === 'active').length || 0,
      completedProjects: projects?.filter(p => p.status === 'completed').length || 0,
      onHoldProjects: projects?.filter(p => p.status === 'on-hold').length || 0,
      planningProjects: projects?.filter(p => p.status === 'planning').length || 0,
      totalBudget: projects?.reduce((sum, p) => sum + parseFloat(p.budget || 0), 0) || 0,
      avgBudget: projects?.length > 0 
        ? projects.reduce((sum, p) => sum + parseFloat(p.budget || 0), 0) / projects.length 
        : 0
    }

    // Status breakdown
    const statusMap = new Map()
    for (const p of projects || []) {
      const key = p.status || 'unknown'
      if (!statusMap.has(key)) {
        statusMap.set(key, { status: key, count: 0, totalBudget: 0 })
      }
      const entry = statusMap.get(key)
      entry.count++
      entry.totalBudget += parseFloat(p.budget || 0)
    }
    const statusBreakdown = Array.from(statusMap.values())
      .sort((a, b) => b.count - a.count)

    // Projects by client (admin only)
    let projectsByClient = []
    if (isAdmin) {
      // Fetch contacts with their projects
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, company')
      
      if (!contactsError && contacts) {
        const clientMap = new Map()
        for (const c of contacts) {
          clientMap.set(c.id, { 
            contactId: c.id, 
            contactName: c.name, 
            company: c.company, 
            projectCount: 0, 
            activeCount: 0, 
            totalBudget: 0 
          })
        }
        
        for (const p of projects || []) {
          if (p.contact_id && clientMap.has(p.contact_id)) {
            const entry = clientMap.get(p.contact_id)
            entry.projectCount++
            if (p.status === 'active') entry.activeCount++
            entry.totalBudget += parseFloat(p.budget || 0)
          }
        }
        
        projectsByClient = Array.from(clientMap.values())
          .filter(c => c.projectCount > 0)
          .sort((a, b) => b.projectCount - a.projectCount)
          .slice(0, 10)
      }
    }

    // Timeline - projects by month
    const timelineMap = new Map()
    for (const p of projects || []) {
      if (!p.start_date) continue
      const date = new Date(p.start_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
      
      if (!timelineMap.has(monthKey)) {
        timelineMap.set(monthKey, { month: monthKey, startedCount: 0, completedCount: 0 })
      }
      const entry = timelineMap.get(monthKey)
      entry.startedCount++
      if (p.end_date) entry.completedCount++
    }
    const timeline = Array.from(timelineMap.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12)

    // Duration analysis (completed projects only)
    const completedProjects = (projects || []).filter(p => 
      p.status === 'completed' && p.start_date && p.end_date
    )
    
    let duration = { avgDurationDays: 0, minDurationDays: 0, maxDurationDays: 0 }
    if (completedProjects.length > 0) {
      const durations = completedProjects.map(p => {
        const start = new Date(p.start_date)
        const end = new Date(p.end_date)
        return (end - start) / (1000 * 60 * 60 * 24) // days
      })
      duration = {
        avgDurationDays: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDurationDays: Math.min(...durations),
        maxDurationDays: Math.max(...durations)
      }
    }

    // Projects with pending invoices
    let invoicesQuery = supabase
      .from('invoices')
      .select('project_id, total_amount, projects!inner(id, name)')
      .eq('status', 'pending')
    
    if (!isAdmin) {
      invoicesQuery = invoicesQuery.eq('contact_id', contactId)
    }
    
    const { data: pendingInvoices, error: invoicesError } = await invoicesQuery
    
    const pendingMap = new Map()
    for (const inv of pendingInvoices || []) {
      if (!inv.projects) continue
      const key = inv.projects.id
      if (!pendingMap.has(key)) {
        pendingMap.set(key, { 
          projectId: inv.projects.id, 
          projectName: inv.projects.name, 
          pendingInvoiceCount: 0, 
          pendingAmount: 0 
        })
      }
      const entry = pendingMap.get(key)
      entry.pendingInvoiceCount++
      entry.pendingAmount += parseFloat(inv.total_amount || 0)
    }
    const projectsWithPendingInvoices = Array.from(pendingMap.values())
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 10)

    // Recent activity - messages and files in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    let messagesQuery = supabase
      .from('messages')
      .select('project_id, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
    
    if (!isAdmin) {
      messagesQuery = messagesQuery.eq('contact_id', contactId)
    }
    
    const { data: recentMessages } = await messagesQuery
    
    let filesQuery = supabase
      .from('files')
      .select('project_id, uploaded_at')
      .gte('uploaded_at', sevenDaysAgo.toISOString())
    
    if (!isAdmin) {
      filesQuery = filesQuery.eq('contact_id', contactId)
    }
    
    const { data: recentFiles } = await filesQuery
    
    const activityMap = new Map()
    const projectNames = new Map()
    for (const p of projects || []) {
      projectNames.set(p.id, p.name)
    }
    
    for (const m of recentMessages || []) {
      if (!m.project_id) continue
      if (!activityMap.has(m.project_id)) {
        activityMap.set(m.project_id, { 
          projectId: m.project_id, 
          projectName: projectNames.get(m.project_id) || 'Unknown', 
          messageCount: 0, 
          fileCount: 0, 
          lastActivity: null 
        })
      }
      const entry = activityMap.get(m.project_id)
      entry.messageCount++
      if (!entry.lastActivity || new Date(m.created_at) > new Date(entry.lastActivity)) {
        entry.lastActivity = m.created_at
      }
    }
    
    for (const f of recentFiles || []) {
      if (!f.project_id) continue
      if (!activityMap.has(f.project_id)) {
        activityMap.set(f.project_id, { 
          projectId: f.project_id, 
          projectName: projectNames.get(f.project_id) || 'Unknown', 
          messageCount: 0, 
          fileCount: 0, 
          lastActivity: null 
        })
      }
      const entry = activityMap.get(f.project_id)
      entry.fileCount++
      if (!entry.lastActivity || new Date(f.uploaded_at) > new Date(entry.lastActivity)) {
        entry.lastActivity = f.uploaded_at
      }
    }
    
    const recentActivity = Array.from(activityMap.values())
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, 10)

    // Completion rate by month (admin only)
    let completionRate = []
    if (isAdmin) {
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
      
      const recentProjects = (projects || []).filter(p => 
        p.created_at && new Date(p.created_at) >= twelveMonthsAgo
      )
      
      const rateMap = new Map()
      for (const p of recentProjects) {
        const date = new Date(p.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
        
        if (!rateMap.has(monthKey)) {
          rateMap.set(monthKey, { month: monthKey, totalStarted: 0, completed: 0 })
        }
        const entry = rateMap.get(monthKey)
        entry.totalStarted++
        if (p.status === 'completed') entry.completed++
      }
      
      completionRate = Array.from(rateMap.values())
        .map(entry => ({
          ...entry,
          completionPercentage: entry.totalStarted > 0 
            ? Math.round((entry.completed / entry.totalStarted) * 100 * 100) / 100 
            : 0
        }))
        .sort((a, b) => b.month.localeCompare(a.month))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        summary,
        statusBreakdown,
        projectsByClient,
        timeline,
        duration,
        projectsWithPendingInvoices,
        recentActivity,
        completionRate,
        generatedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching project analytics:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch project analytics',
        message: error.message 
      })
    }
  }
}
