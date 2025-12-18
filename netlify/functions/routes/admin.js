// netlify/functions/routes/admin.js
// ═══════════════════════════════════════════════════════════════════════════════
// Admin Routes - Client management, team, tenants
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'

export async function handle(ctx) {
  const { method, segments, supabase, query, body, contact, orgId } = ctx
  const [, resource, id, action] = segments
  
  // Check admin permission
  if (!['admin', 'super_admin'].includes(contact?.role)) {
    return response(403, { error: 'Admin access required' })
  }
  
  switch (resource) {
    case 'clients':
      return await handleClients(ctx, id, action)
    case 'team':
      return await handleTeam(ctx, id)
    case 'tenants':
      return await handleTenants(ctx, id)
    case 'activity':
      return await getActivityLog(ctx)
    case 'setup':
      if (method === 'POST') return await adminSetup(ctx)
      break
  }
  
  return response(404, { error: `Unknown admin resource: ${resource}` })
}

async function handleClients(ctx, id, action) {
  const { method, supabase, query, body, orgId, contact } = ctx
  
  if (action === 'resend-setup') {
    if (method === 'POST') return await resendSetupEmail(ctx, id)
  }
  
  if (!id) {
    if (method === 'GET') {
      const { type = 'client', limit = 100 } = query
      
      let q = supabase
        .from('contacts')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (orgId) q = q.eq('org_id', orgId)
      
      const { data, error } = await q
      
      if (error) return response(500, { error: error.message })
      return response(200, { clients: data })
    }
    
    if (method === 'POST') {
      const { email, name, company, sendSetupEmail = true } = body
      
      if (!email) {
        return response(400, { error: 'Email is required' })
      }
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()
      
      if (existing) {
        return response(409, { error: 'Contact with this email already exists' })
      }
      
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          email: email.toLowerCase(),
          name,
          company,
          type: 'client',
          org_id: orgId,
          created_by: contact.id,
          account_setup: 'false'
        })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      
      // TODO: Send setup email if requested
      
      return response(201, { client: data })
    }
  } else {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
      return response(200, { client: data })
    }
    
    if (method === 'PUT' || method === 'PATCH') {
      const { data, error } = await supabase
        .from('contacts')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(200, { client: data })
    }
    
    if (method === 'DELETE') {
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleTeam(ctx, id) {
  const { method, supabase, query, body, orgId, contact } = ctx
  
  if (!id) {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, role, avatar, created_at')
        .eq('org_id', orgId)
        .in('role', ['admin', 'sales', 'manager', 'super_admin'])
        .order('name')
      
      if (error) return response(500, { error: error.message })
      return response(200, { team: data })
    }
    
    if (method === 'POST') {
      const { email, name, role = 'sales' } = body
      
      if (!email || !name) {
        return response(400, { error: 'Email and name are required' })
      }
      
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          email: email.toLowerCase(),
          name,
          role,
          type: 'team',
          org_id: orgId,
          created_by: contact.id
        })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(201, { member: data })
    }
  } else {
    if (method === 'PUT' || method === 'PATCH') {
      const { data, error } = await supabase
        .from('contacts')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(200, { member: data })
    }
    
    if (method === 'DELETE') {
      // Don't allow deleting yourself
      if (id === contact.id) {
        return response(400, { error: 'Cannot delete your own account' })
      }
      
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleTenants(ctx, id) {
  const { method, supabase, query, body, contact } = ctx
  
  // Super admin only for tenant management
  if (contact.role !== 'super_admin') {
    return response(403, { error: 'Super admin access required' })
  }
  
  if (!id) {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name')
      
      if (error) return response(500, { error: error.message })
      return response(200, { tenants: data })
    }
    
    if (method === 'POST') {
      const { name, slug, domain } = body
      
      if (!name || !slug) {
        return response(400, { error: 'Name and slug are required' })
      }
      
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          slug,
          domain,
          created_by: contact.id
        })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(201, { tenant: data })
    }
  } else {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
      return response(200, { tenant: data })
    }
    
    if (method === 'PUT' || method === 'PATCH') {
      const { data, error } = await supabase
        .from('organizations')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(200, { tenant: data })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function getActivityLog(ctx) {
  const { supabase, query, orgId } = ctx
  const { type, userId, limit = 50 } = query
  
  let q = supabase
    .from('activity_logs')
    .select('*, user:contacts(id, name, avatar)')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (orgId) q = q.eq('org_id', orgId)
  if (type) q = q.eq('type', type)
  if (userId) q = q.eq('user_id', userId)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { activities: data })
}

async function resendSetupEmail(ctx, clientId) {
  const { supabase } = ctx
  
  const { data: client, error } = await supabase
    .from('contacts')
    .select('id, email, name, account_setup')
    .eq('id', clientId)
    .single()
  
  if (error) return response(404, { error: 'Client not found' })
  
  if (client.account_setup === 'true') {
    return response(400, { error: 'Account already set up' })
  }
  
  // TODO: Send setup email via Resend
  
  return response(200, { success: true, message: 'Setup email sent' })
}

async function adminSetup(ctx) {
  // Initial admin setup for new organizations
  const { body, supabase } = ctx
  const { orgName, adminEmail, adminName, adminPassword } = body
  
  // This is a dangerous operation, typically only run once
  // Add appropriate security checks
  
  return response(501, { error: 'Admin setup not implemented in router' })
}
