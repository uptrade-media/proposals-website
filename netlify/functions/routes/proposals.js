// netlify/functions/routes/proposals.js
// ═══════════════════════════════════════════════════════════════════════════════
// Proposals Routes
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'

export async function handle(ctx) {
  const { method, segments, supabase, query, body, contact, orgId } = ctx
  const [, resource, id, action] = segments
  
  if (action) {
    return await handleAction(ctx, id, action)
  }
  
  if (!id) {
    if (method === 'GET') return await listProposals(ctx)
    if (method === 'POST') return await createProposal(ctx)
  } else {
    if (method === 'GET') return await getProposal(ctx, id)
    if (method === 'PUT' || method === 'PATCH') return await updateProposal(ctx, id)
    if (method === 'DELETE') return await deleteProposal(ctx, id)
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function listProposals(ctx) {
  const { supabase, query, orgId } = ctx
  const { status, contactId, limit = 50 } = query
  
  let q = supabase
    .from('proposals')
    .select('*, contact:contacts(id, name, email, company)')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (orgId) q = q.eq('org_id', orgId)
  if (status) q = q.eq('status', status)
  if (contactId) q = q.eq('contact_id', contactId)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { proposals: data })
}

async function createProposal(ctx) {
  const { supabase, body, contact, orgId } = ctx
  const { title, contactId, content, lineItems, validUntil } = body
  
  if (!title || !contactId) {
    return response(400, { error: 'title and contactId are required' })
  }
  
  // Calculate total from line items
  const total = (lineItems || []).reduce((sum, item) => 
    sum + (item.quantity * item.unitPrice), 0
  )
  
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      title,
      contact_id: contactId,
      org_id: orgId,
      content,
      line_items: lineItems,
      total,
      valid_until: validUntil,
      status: 'draft',
      created_by: contact.id
    })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(201, { proposal: data })
}

async function getProposal(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('proposals')
    .select('*, contact:contacts(id, name, email, company, address)')
    .eq('id', id)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { proposal: data })
}

async function updateProposal(ctx, id) {
  const { supabase, body } = ctx
  
  // Recalculate total if line items changed
  if (body.lineItems) {
    body.total = body.lineItems.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    )
    body.line_items = body.lineItems
    delete body.lineItems
  }
  
  const { data, error } = await supabase
    .from('proposals')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { proposal: data })
}

async function deleteProposal(ctx, id) {
  const { supabase } = ctx
  
  const { error } = await supabase.from('proposals').delete().eq('id', id)
  if (error) return response(500, { error: error.message })
  return response(200, { success: true })
}

async function handleAction(ctx, id, action) {
  const { method, supabase, body } = ctx
  
  switch (action) {
    case 'send':
      if (method === 'POST') return await sendProposal(ctx, id)
      break
    case 'accept':
      if (method === 'POST') return await acceptProposal(ctx, id)
      break
    case 'decline':
      if (method === 'POST') return await declineProposal(ctx, id)
      break
    case 'sign':
      if (method === 'POST') return await signProposal(ctx, id)
      break
    case 'track-view':
      if (method === 'POST') return await trackView(ctx, id)
      break
    case 'analytics':
      if (method === 'GET') return await getAnalytics(ctx, id)
      break
    case 'ai-edit':
      if (method === 'POST') return await triggerAIEdit(ctx, id)
      break
    case 'pay-deposit':
      if (method === 'POST') return await payDeposit(ctx, id)
      break
  }
  
  return response(404, { error: `Unknown proposal action: ${action}` })
}

async function sendProposal(ctx, id) {
  const { supabase } = ctx
  
  // Get proposal with contact
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*, contact:contacts(id, name, email)')
    .eq('id', id)
    .single()
  
  if (error) return response(404, { error: 'Proposal not found' })
  
  // TODO: Send email via Resend
  
  await supabase
    .from('proposals')
    .update({ 
      status: 'sent', 
      sent_at: new Date().toISOString() 
    })
    .eq('id', id)
  
  return response(200, { success: true })
}

async function acceptProposal(ctx, id) {
  const { supabase, body } = ctx
  const { signatureData, createProject = true } = body
  
  // Get proposal
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*, contact:contacts(id, name, org_id)')
    .eq('id', id)
    .single()
  
  if (error) return response(404, { error: 'Proposal not found' })
  
  // Update proposal
  await supabase
    .from('proposals')
    .update({ 
      status: 'accepted', 
      accepted_at: new Date().toISOString(),
      signature_data: signatureData
    })
    .eq('id', id)
  
  // Create project if requested
  let project = null
  if (createProject) {
    const { data } = await supabase
      .from('projects')
      .insert({
        name: proposal.title,
        contact_id: proposal.contact_id,
        org_id: proposal.org_id,
        proposal_id: id,
        budget: proposal.total,
        status: 'active'
      })
      .select()
      .single()
    
    project = data
  }
  
  return response(200, { success: true, project })
}

async function declineProposal(ctx, id) {
  const { supabase, body } = ctx
  const { reason } = body
  
  const { data, error } = await supabase
    .from('proposals')
    .update({ 
      status: 'declined', 
      declined_at: new Date().toISOString(),
      decline_reason: reason
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { proposal: data })
}

async function signProposal(ctx, id) {
  const { body } = ctx
  const { signatureData, signerName, signerEmail } = body
  
  if (!signatureData) {
    return response(400, { error: 'signatureData is required' })
  }
  
  // Store signature - this would use Netlify Blobs
  // For now, just update the proposal
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('proposals')
    .update({
      signature_data: signatureData,
      signer_name: signerName,
      signer_email: signerEmail,
      signed_at: new Date().toISOString(),
      status: 'signed'
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { proposal: data })
}

async function trackView(ctx, id) {
  const { supabase, headers } = ctx
  
  // Update view count and last viewed
  const { data: proposal } = await supabase
    .from('proposals')
    .select('view_count')
    .eq('id', id)
    .single()
  
  await supabase
    .from('proposals')
    .update({
      view_count: (proposal?.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
      status: 'viewed' // Only if currently 'sent'
    })
    .eq('id', id)
    .in('status', ['sent', 'viewed'])
  
  return response(200, { success: true })
}

async function getAnalytics(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('proposals')
    .select('id, view_count, last_viewed_at, sent_at, accepted_at, status')
    .eq('id', id)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  
  const analytics = {
    ...data,
    timeToView: data.last_viewed_at && data.sent_at 
      ? new Date(data.last_viewed_at) - new Date(data.sent_at)
      : null,
    timeToAccept: data.accepted_at && data.sent_at
      ? new Date(data.accepted_at) - new Date(data.sent_at)
      : null
  }
  
  return response(200, { analytics })
}

async function triggerAIEdit(ctx, id) {
  const { body, supabase, contact, orgId } = ctx
  const { instructions } = body
  
  if (!instructions) {
    return response(400, { error: 'instructions are required' })
  }
  
  // Create background job
  const { data: job, error } = await supabase
    .from('background_jobs')
    .insert({
      type: 'proposal_ai_edit',
      status: 'pending',
      params: { proposalId: id, instructions },
      created_by: contact.id
    })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  
  // Trigger background function
  fetch(`${process.env.URL}/.netlify/functions/proposals-edit-ai-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId: id, instructions, jobId: job.id })
  }).catch(console.error)
  
  return response(202, { jobId: job.id })
}

async function payDeposit(ctx, id) {
  const { body, supabase } = ctx
  const { amount, paymentMethod } = body
  
  // Get proposal
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) return response(404, { error: 'Proposal not found' })
  
  // TODO: Process payment via Square
  
  // Record deposit
  await supabase
    .from('proposals')
    .update({
      deposit_amount: amount,
      deposit_paid_at: new Date().toISOString(),
      deposit_payment_method: paymentMethod
    })
    .eq('id', id)
  
  return response(200, { success: true })
}
