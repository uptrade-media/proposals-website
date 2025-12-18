// netlify/functions/routes/projects.js
// ═══════════════════════════════════════════════════════════════════════════════
// Projects Routes
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'

export async function handle(ctx) {
  const { method, segments, supabase, query, body, contact, orgId } = ctx
  const [, resource, id, subResource, subId] = segments
  
  if (subResource) {
    return await handleSubResource(ctx, id, subResource, subId)
  }
  
  if (!id) {
    if (method === 'GET') return await listProjects(ctx)
    if (method === 'POST') return await createProject(ctx)
  } else {
    if (method === 'GET') return await getProject(ctx, id)
    if (method === 'PUT' || method === 'PATCH') return await updateProject(ctx, id)
    if (method === 'DELETE') return await deleteProject(ctx, id)
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function listProjects(ctx) {
  const { supabase, query, orgId } = ctx
  const { status, contactId, limit = 50 } = query
  
  let q = supabase
    .from('projects')
    .select('*, contact:contacts(id, name, email, company)')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (orgId) q = q.eq('org_id', orgId)
  if (status) q = q.eq('status', status)
  if (contactId) q = q.eq('contact_id', contactId)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { projects: data })
}

async function createProject(ctx) {
  const { supabase, body, contact, orgId } = ctx
  const { name, contactId, type, budget, startDate, endDate } = body
  
  if (!name) {
    return response(400, { error: 'Project name is required' })
  }
  
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      contact_id: contactId,
      org_id: orgId,
      type,
      budget,
      start_date: startDate,
      end_date: endDate,
      status: 'active',
      created_by: contact.id
    })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(201, { project: data })
}

async function getProject(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      contact:contacts(id, name, email, company),
      milestones:project_milestones(*),
      members:project_members(*, user:contacts(id, name, email, avatar))
    `)
    .eq('id', id)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { project: data })
}

async function updateProject(ctx, id) {
  const { supabase, body } = ctx
  
  const { data, error } = await supabase
    .from('projects')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { project: data })
}

async function deleteProject(ctx, id) {
  const { supabase } = ctx
  
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return response(500, { error: error.message })
  return response(200, { success: true })
}

async function handleSubResource(ctx, projectId, subResource, subId) {
  const { method, supabase, body } = ctx
  
  switch (subResource) {
    case 'milestones':
      return await handleMilestones(ctx, projectId, subId)
    case 'members':
      return await handleMembers(ctx, projectId, subId)
    case 'activities':
      return await getProjectActivities(ctx, projectId)
    case 'checklist':
      return await handleChecklist(ctx, projectId, subId)
    case 'complete':
      if (method === 'POST') return await completeProject(ctx, projectId)
      break
  }
  
  return response(404, { error: `Unknown sub-resource: ${subResource}` })
}

async function handleMilestones(ctx, projectId, milestoneId) {
  const { method, supabase, body } = ctx
  
  if (!milestoneId) {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true })
      
      if (error) return response(500, { error: error.message })
      return response(200, { milestones: data })
    }
    
    if (method === 'POST') {
      const { data, error } = await supabase
        .from('project_milestones')
        .insert({ project_id: projectId, ...body })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(201, { milestone: data })
    }
  } else {
    if (method === 'PUT' || method === 'PATCH') {
      const { data, error } = await supabase
        .from('project_milestones')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', milestoneId)
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(200, { milestone: data })
    }
    
    if (method === 'DELETE') {
      const { error } = await supabase.from('project_milestones').delete().eq('id', milestoneId)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleMembers(ctx, projectId, memberId) {
  const { method, supabase, body } = ctx
  
  if (!memberId) {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('project_members')
        .select('*, user:contacts(id, name, email, avatar)')
        .eq('project_id', projectId)
      
      if (error) return response(500, { error: error.message })
      return response(200, { members: data })
    }
    
    if (method === 'POST') {
      const { userId, role = 'member' } = body
      
      const { data, error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: userId, role })
        .select('*, user:contacts(id, name, email, avatar)')
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(201, { member: data })
    }
  } else {
    if (method === 'DELETE') {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function getProjectActivities(ctx, projectId) {
  const { supabase, query } = ctx
  const { limit = 20 } = query
  
  const { data, error } = await supabase
    .from('project_activities')
    .select('*, user:contacts(id, name, avatar)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) return response(500, { error: error.message })
  return response(200, { activities: data })
}

async function handleChecklist(ctx, projectId, itemId) {
  const { method, supabase, body } = ctx
  
  if (!itemId && method === 'GET') {
    const { data, error } = await supabase
      .from('project_checklist')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
    
    if (error) return response(500, { error: error.message })
    return response(200, { checklist: data })
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function completeProject(ctx, projectId) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('projects')
    .update({ 
      status: 'completed', 
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { project: data })
}
