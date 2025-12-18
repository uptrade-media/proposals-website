// netlify/functions/routes/crm.js
// ═══════════════════════════════════════════════════════════════════════════════
// CRM Routes - Prospects, calls, emails, follow-ups
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'

export async function handle(ctx) {
  const { method, segments, supabase, query, body, contact, orgId } = ctx
  const [, resource, id, subResource] = segments
  
  switch (resource) {
    case 'prospects':
      return await handleProspects(ctx, id, subResource)
    case 'calls':
      return await handleCalls(ctx, id)
    case 'emails':
      return await handleEmails(ctx, id)
    case 'follow-ups':
      return await handleFollowUps(ctx, id)
    case 'tasks':
      return await handleTasks(ctx, id)
    case 'notifications':
      return await handleNotifications(ctx, id)
    case 'notes':
      if (method === 'POST') return await createNote(ctx)
      break
    case 'lead-score':
      if (method === 'POST') return await calculateLeadScore(ctx)
      break
    case 'lookup-business':
      if (method === 'POST') return await lookupBusiness(ctx)
      break
    case 'analyze-website':
      if (method === 'POST') return await analyzeWebsite(ctx)
      break
    case 'users':
      if (method === 'GET') return await listUsers(ctx)
      break
  }
  
  return response(404, { error: `Unknown CRM resource: ${resource}` })
}

async function handleProspects(ctx, id, subResource) {
  const { method, supabase, query, body, orgId } = ctx
  
  if (subResource) {
    switch (subResource) {
      case 'activity':
        return await getProspectActivity(ctx, id)
      case 'convert':
        if (method === 'POST') return await convertProspect(ctx, id)
        break
    }
    return response(404, { error: `Unknown prospect sub-resource: ${subResource}` })
  }
  
  if (!id) {
    if (method === 'GET') {
      const { stage, rep, limit = 50, offset = 0 } = query
      
      let q = supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('type', 'prospect')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (orgId) q = q.eq('org_id', orgId)
      if (stage) q = q.eq('pipeline_stage', stage)
      if (rep) q = q.eq('assigned_to', rep)
      
      const { data, count, error } = await q
      
      if (error) return response(500, { error: error.message })
      return response(200, { prospects: data, total: count })
    }
    
    if (method === 'POST') {
      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...body, type: 'prospect', org_id: orgId })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(201, { prospect: data })
    }
  } else {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
      return response(200, { prospect: data })
    }
    
    if (method === 'PUT' || method === 'PATCH') {
      const { data, error } = await supabase
        .from('contacts')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(200, { prospect: data })
    }
    
    if (method === 'DELETE') {
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleCalls(ctx, id) {
  const { method, supabase, query, orgId } = ctx
  
  if (!id && method === 'GET') {
    const { contactId, limit = 50 } = query
    
    let q = supabase
      .from('call_logs')
      .select('*')
      .order('call_date', { ascending: false })
      .limit(limit)
    
    if (contactId) q = q.eq('contact_id', contactId)
    
    const { data, error } = await q
    
    if (error) return response(500, { error: error.message })
    return response(200, { calls: data })
  }
  
  if (id && method === 'GET') {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*, tasks:call_tasks(*), follow_ups:call_follow_ups(*)')
      .eq('id', id)
      .single()
    
    if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
    return response(200, { call: data })
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleEmails(ctx, id) {
  const { method, supabase, query, body, contact } = ctx
  
  if (!id && method === 'GET') {
    const { contactId, limit = 50 } = query
    
    let q = supabase
      .from('email_tracking')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit)
    
    if (contactId) q = q.eq('contact_id', contactId)
    
    const { data, error } = await q
    
    if (error) return response(500, { error: error.message })
    return response(200, { emails: data })
  }
  
  if (method === 'POST') {
    // Send email via separate email routes
    return response(501, { error: 'Use /email/send endpoint' })
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleFollowUps(ctx, id) {
  const { method, supabase, query, body, contact } = ctx
  
  if (!id && method === 'GET') {
    const { status = 'pending', limit = 50 } = query
    
    const { data, error } = await supabase
      .from('call_follow_ups')
      .select('*, contact:contacts(id, name, email, company)')
      .eq('status', status)
      .eq('assigned_to', contact.id)
      .order('due_date', { ascending: true })
      .limit(limit)
    
    if (error) return response(500, { error: error.message })
    return response(200, { followUps: data })
  }
  
  if (id && (method === 'PUT' || method === 'PATCH')) {
    const { data, error } = await supabase
      .from('call_follow_ups')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) return response(500, { error: error.message })
    return response(200, { followUp: data })
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleTasks(ctx, id) {
  const { method, supabase, query, body, contact } = ctx
  
  if (!id && method === 'GET') {
    const { status, limit = 50 } = query
    
    let q = supabase
      .from('call_tasks')
      .select('*, contact:contacts(id, name, email)')
      .order('due_date', { ascending: true })
      .limit(limit)
    
    if (status) q = q.eq('status', status)
    
    const { data, error } = await q
    
    if (error) return response(500, { error: error.message })
    return response(200, { tasks: data })
  }
  
  if (id && (method === 'PUT' || method === 'PATCH')) {
    const { data, error } = await supabase
      .from('call_tasks')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) return response(500, { error: error.message })
    return response(200, { task: data })
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleNotifications(ctx, id) {
  const { method, supabase, query, body, contact } = ctx
  
  if (!id && method === 'GET') {
    const { unreadOnly, limit = 20 } = query
    
    let q = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (unreadOnly === 'true') q = q.eq('read', false)
    
    const { data, error } = await q
    
    if (error) return response(500, { error: error.message })
    return response(200, { notifications: data })
  }
  
  if (id && (method === 'PUT' || method === 'PATCH')) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) return response(500, { error: error.message })
    return response(200, { notification: data })
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function getProspectActivity(ctx, prospectId) {
  const { supabase, query } = ctx
  const { limit = 20 } = query
  
  // Aggregate activity from multiple tables
  const [callsResult, emailsResult, notesResult] = await Promise.all([
    supabase.from('call_logs').select('*').eq('contact_id', prospectId).limit(10),
    supabase.from('email_tracking').select('*').eq('contact_id', prospectId).limit(10),
    supabase.from('contact_notes').select('*').eq('contact_id', prospectId).limit(10)
  ])
  
  const activity = [
    ...(callsResult.data || []).map(c => ({ type: 'call', ...c, date: c.call_date })),
    ...(emailsResult.data || []).map(e => ({ type: 'email', ...e, date: e.sent_at })),
    ...(notesResult.data || []).map(n => ({ type: 'note', ...n, date: n.created_at }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit)
  
  return response(200, { activity })
}

async function convertProspect(ctx, prospectId) {
  const { supabase, body } = ctx
  const { projectName, projectType } = body
  
  // Get prospect
  const { data: prospect, error: prospectError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', prospectId)
    .single()
  
  if (prospectError) return response(404, { error: 'Prospect not found' })
  
  // Update to client
  const { error: updateError } = await supabase
    .from('contacts')
    .update({ 
      type: 'client', 
      pipeline_stage: 'won',
      updated_at: new Date().toISOString()
    })
    .eq('id', prospectId)
  
  if (updateError) return response(500, { error: updateError.message })
  
  // Create project if requested
  let project = null
  if (projectName) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        contact_id: prospectId,
        org_id: prospect.org_id,
        status: 'active',
        type: projectType
      })
      .select()
      .single()
    
    if (!error) project = data
  }
  
  return response(200, { success: true, project })
}

async function createNote(ctx) {
  const { supabase, body, contact } = ctx
  const { contactId, content, type = 'note' } = body
  
  if (!contactId || !content) {
    return response(400, { error: 'contactId and content required' })
  }
  
  const { data, error } = await supabase
    .from('contact_notes')
    .insert({
      contact_id: contactId,
      content,
      type,
      created_by: contact.id
    })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(201, { note: data })
}

async function calculateLeadScore(ctx) {
  // This would call AI for lead scoring
  return response(501, { error: 'Lead scoring not implemented in router yet' })
}

async function lookupBusiness(ctx) {
  // This would call external API for business lookup
  return response(501, { error: 'Business lookup not implemented in router yet' })
}

async function analyzeWebsite(ctx) {
  // This would analyze a website
  return response(501, { error: 'Website analysis not implemented in router yet' })
}

async function listUsers(ctx) {
  const { supabase, orgId } = ctx
  
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, email, role, avatar')
    .eq('org_id', orgId)
    .in('role', ['admin', 'sales', 'manager'])
  
  if (error) return response(500, { error: error.message })
  return response(200, { users: data })
}
