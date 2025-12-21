// netlify/functions/routes/email.js
// ═══════════════════════════════════════════════════════════════════════════════
// Email Routes - Campaigns, automations, templates, AI-powered email creation
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'
import { EmailSkill } from '../skills/email-skill.js'

export async function handle(ctx) {
  const { method, segments, supabase, query, body, contact, orgId } = ctx
  const [, resource, id, action] = segments
  
  switch (resource) {
    // ─────────────────────────────────────────────────────────────────────────
    // AI-POWERED EMAIL ROUTES (Signal Email Skill)
    // ─────────────────────────────────────────────────────────────────────────
    case 'ai':
      return await handleAI(ctx, id, action)
    case 'campaigns':
      return await handleCampaigns(ctx, id, action)
    case 'templates':
      return await handleTemplates(ctx, id)
    case 'lists':
      return await handleLists(ctx, id, action)
    case 'send':
      if (method === 'POST') return await sendEmail(ctx)
      break
    case 'track':
      return await handleTracking(ctx, action, id)
  }
  
  return response(404, { error: `Unknown email resource: ${resource}` })
}

async function handleCampaigns(ctx, id, action) {
  const { method, supabase, query, body, orgId, contact } = ctx
  
  if (action) {
    switch (action) {
      case 'send':
        if (method === 'POST') return await sendCampaign(ctx, id)
        break
      case 'schedule':
        if (method === 'POST') return await scheduleCampaign(ctx, id)
        break
      case 'stats':
        if (method === 'GET') return await getCampaignStats(ctx, id)
        break
      case 'pause':
        if (method === 'POST') return await pauseCampaign(ctx, id)
        break
      case 'resume':
        if (method === 'POST') return await resumeCampaign(ctx, id)
        break
    }
    return response(404, { error: `Unknown campaign action: ${action}` })
  }
  
  if (!id) {
    if (method === 'GET') {
      let q = supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (orgId) q = q.eq('org_id', orgId)
      
      const { data, error } = await q
      
      if (error) return response(500, { error: error.message })
      return response(200, { campaigns: data })
    }
    
    if (method === 'POST') {
      const { name, subject, content, templateId, listId, scheduledAt } = body
      
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          name,
          subject,
          content,
          template_id: templateId,
          list_id: listId,
          scheduled_at: scheduledAt,
          org_id: orgId,
          status: 'draft',
          created_by: contact.id
        })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(201, { campaign: data })
    }
  } else {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
      return response(200, { campaign: data })
    }
    
    if (method === 'PUT' || method === 'PATCH') {
      const { data, error } = await supabase
        .from('email_campaigns')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(200, { campaign: data })
    }
    
    if (method === 'DELETE') {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleTemplates(ctx, id) {
  const { method, supabase, query, body, orgId, contact } = ctx
  
  if (!id) {
    if (method === 'GET') {
      let q = supabase
        .from('email_templates')
        .select('*')
        .order('name')
      
      if (orgId) q = q.eq('org_id', orgId)
      
      const { data, error } = await q
      
      if (error) return response(500, { error: error.message })
      return response(200, { templates: data })
    }
    
    if (method === 'POST') {
      const { name, subject, content, category } = body
      
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          name,
          subject,
          content,
          category,
          org_id: orgId,
          created_by: contact.id
        })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(201, { template: data })
    }
  } else {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
      return response(200, { template: data })
    }
    
    if (method === 'PUT' || method === 'PATCH') {
      const { data, error } = await supabase
        .from('email_templates')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(200, { template: data })
    }
    
    if (method === 'DELETE') {
      const { error } = await supabase.from('email_templates').delete().eq('id', id)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleLists(ctx, id, action) {
  const { method, supabase, query, body, orgId, contact } = ctx
  
  if (action === 'subscribers') {
    return await handleSubscribers(ctx, id)
  }
  
  if (!id) {
    if (method === 'GET') {
      let q = supabase
        .from('email_lists')
        .select('*, subscriber_count:email_list_subscribers(count)')
        .order('name')
      
      if (orgId) q = q.eq('org_id', orgId)
      
      const { data, error } = await q
      
      if (error) return response(500, { error: error.message })
      return response(200, { lists: data })
    }
    
    if (method === 'POST') {
      const { name, description } = body
      
      const { data, error } = await supabase
        .from('email_lists')
        .insert({
          name,
          description,
          org_id: orgId,
          created_by: contact.id
        })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(201, { list: data })
    }
  } else {
    if (method === 'DELETE') {
      const { error } = await supabase.from('email_lists').delete().eq('id', id)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleSubscribers(ctx, listId) {
  const { method, supabase, body, query } = ctx
  
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('email_list_subscribers')
      .select('*, contact:contacts(id, name, email)')
      .eq('list_id', listId)
    
    if (error) return response(500, { error: error.message })
    return response(200, { subscribers: data })
  }
  
  if (method === 'POST') {
    const { contactId, email } = body
    
    const { data, error } = await supabase
      .from('email_list_subscribers')
      .insert({
        list_id: listId,
        contact_id: contactId,
        email: email?.toLowerCase(),
        subscribed_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) return response(500, { error: error.message })
    return response(201, { subscriber: data })
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function sendEmail(ctx) {
  const { body, supabase, contact, orgId } = ctx
  const { to, subject, content, templateId } = body
  
  if (!to || (!content && !templateId)) {
    return response(400, { error: 'to and content or templateId are required' })
  }
  
  // Get template if specified
  let emailContent = content
  let emailSubject = subject
  
  if (templateId) {
    const { data: template } = await supabase
      .from('email_templates')
      .select('subject, content')
      .eq('id', templateId)
      .single()
    
    if (template) {
      emailContent = template.content
      emailSubject = subject || template.subject
    }
  }
  
  // TODO: Send via Resend
  
  // Log send
  const { data, error } = await supabase
    .from('email_tracking')
    .insert({
      to_email: to,
      subject: emailSubject,
      sent_by: contact.id,
      org_id: orgId,
      sent_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { success: true, trackingId: data?.id })
}

async function sendCampaign(ctx, campaignId) {
  const { supabase, contact } = ctx
  
  // Get campaign
  const { data: campaign, error } = await supabase
    .from('email_campaigns')
    .select('*, list:email_lists(*)')
    .eq('id', campaignId)
    .single()
  
  if (error) return response(404, { error: 'Campaign not found' })
  
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    return response(400, { error: 'Campaign already sent or in progress' })
  }
  
  // Start sending (trigger background job)
  await supabase
    .from('email_campaigns')
    .update({ status: 'sending', started_at: new Date().toISOString() })
    .eq('id', campaignId)
  
  // Trigger background function
  fetch(`${process.env.URL}/.netlify/functions/email-campaign-send-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId })
  }).catch(console.error)
  
  return response(202, { message: 'Campaign sending started' })
}

async function scheduleCampaign(ctx, campaignId) {
  const { supabase, body } = ctx
  const { scheduledAt } = body
  
  if (!scheduledAt) {
    return response(400, { error: 'scheduledAt is required' })
  }
  
  const { data, error } = await supabase
    .from('email_campaigns')
    .update({ 
      status: 'scheduled', 
      scheduled_at: scheduledAt 
    })
    .eq('id', campaignId)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { campaign: data })
}

async function getCampaignStats(ctx, campaignId) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('email_campaigns')
    .select('id, sent_count, open_count, click_count, bounce_count, unsubscribe_count')
    .eq('id', campaignId)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  
  const stats = {
    ...data,
    openRate: data.sent_count ? (data.open_count / data.sent_count * 100).toFixed(2) : 0,
    clickRate: data.open_count ? (data.click_count / data.open_count * 100).toFixed(2) : 0,
    bounceRate: data.sent_count ? (data.bounce_count / data.sent_count * 100).toFixed(2) : 0
  }
  
  return response(200, { stats })
}

async function pauseCampaign(ctx, campaignId) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('email_campaigns')
    .update({ status: 'paused' })
    .eq('id', campaignId)
    .eq('status', 'sending')
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { campaign: data })
}

async function resumeCampaign(ctx, campaignId) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('email_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId)
    .eq('status', 'paused')
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { campaign: data })
}

async function handleTracking(ctx, action, id) {
  const { method, supabase, query } = ctx
  
  if (action === 'open' && id) {
    // Track email open (typically via pixel)
    await supabase
      .from('email_tracking')
      .update({ 
        opened_at: new Date().toISOString(),
        open_count: supabase.rpc('increment', { x: 1 })
      })
      .eq('id', id)
    
    // Return 1x1 transparent pixel
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'image/gif' },
      body: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      isBase64Encoded: true
    }
  }
  
  if (action === 'click' && id) {
    const { url } = query
    
    // Track click
    await supabase
      .from('email_tracking')
      .update({ 
        clicked_at: new Date().toISOString(),
        click_count: supabase.rpc('increment', { x: 1 })
      })
      .eq('id', id)
    
    // Redirect to actual URL
    return {
      statusCode: 302,
      headers: { Location: url || '/' }
    }
  }
  
  return response(404, { error: 'Invalid tracking request' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI-POWERED EMAIL HANDLERS (Signal Email Skill Integration)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleAI(ctx, tool, action) {
  const { method, supabase, body, orgId, contact } = ctx
  
  if (method !== 'POST') {
    return response(405, { error: 'AI endpoints require POST method' })
  }
  
  const email = new EmailSkill(supabase, orgId, { userId: contact.id })
  
  switch (tool) {
    // ─────────────────────────────────────────────────────────────────────────
    // POST /email/ai/draft - Generate email draft from purpose
    // ─────────────────────────────────────────────────────────────────────────
    case 'draft': {
      const { purpose, recipientId, recipientEmail, recipientName, projectId, tone } = body
      
      if (!purpose) {
        return response(400, { error: 'purpose is required' })
      }
      
      try {
        const draft = await email.draftEmail(purpose, {
          recipientId,
          recipientEmail,
          recipientName,
          projectId,
          tone
        })
        return response(200, { draft })
      } catch (err) {
        return response(500, { error: err.message })
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // POST /email/ai/template - Create full email template
    // ─────────────────────────────────────────────────────────────────────────
    case 'template': {
      const { purpose, category, includeBlocks } = body
      
      if (!purpose) {
        return response(400, { error: 'purpose is required' })
      }
      
      try {
        const template = await email.createTemplate(purpose, { category, includeBlocks })
        return response(200, { template })
      } catch (err) {
        return response(500, { error: err.message })
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // POST /email/ai/optimize - Optimize existing template
    // ─────────────────────────────────────────────────────────────────────────
    case 'optimize': {
      const { templateId, focusArea } = body
      
      if (!templateId) {
        return response(400, { error: 'templateId is required' })
      }
      
      try {
        const optimizations = await email.optimizeTemplate(templateId, { focusArea })
        return response(200, { optimizations })
      } catch (err) {
        return response(500, { error: err.message })
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // POST /email/ai/subjects - Generate subject line variants
    // ─────────────────────────────────────────────────────────────────────────
    case 'subjects': {
      const { emailContent, currentSubject, numberOfVariants, purpose } = body
      
      if (!emailContent && !currentSubject) {
        return response(400, { error: 'emailContent or currentSubject is required' })
      }
      
      try {
        const subjects = await email.suggestSubjectLines(emailContent || currentSubject, {
          currentSubject,
          numberOfVariants,
          purpose
        })
        return response(200, { subjects })
      } catch (err) {
        return response(500, { error: err.message })
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // POST /email/ai/analyze - Analyze campaign performance
    // ─────────────────────────────────────────────────────────────────────────
    case 'analyze': {
      const { days, campaignId, templateId } = body
      
      try {
        const analysis = await email.analyzePerformance({ days, campaignId, templateId })
        return response(200, { analysis })
      } catch (err) {
        return response(500, { error: err.message })
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // POST /email/ai/patterns - Get learned email patterns
    // ─────────────────────────────────────────────────────────────────────────
    case 'patterns': {
      const { patternType } = body
      
      try {
        const patterns = await email.getPatterns(patternType || 'all')
        return response(200, { patterns })
      } catch (err) {
        return response(500, { error: err.message })
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // POST /email/ai/blocks - Generate GrapesJS blocks
    // ─────────────────────────────────────────────────────────────────────────
    case 'blocks': {
      const { purpose, blockTypes, style } = body
      
      if (!purpose) {
        return response(400, { error: 'purpose is required' })
      }
      
      try {
        const blocks = await email.generateBlocks(purpose, { blockTypes, style })
        return response(200, { blocks })
      } catch (err) {
        return response(500, { error: err.message })
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // POST /email/ai/send-time - Get optimal send time recommendation
    // ─────────────────────────────────────────────────────────────────────────
    case 'send-time': {
      const { recipientId, audience } = body
      
      try {
        const sendTime = await email.suggestSendTime({ recipientId, audience })
        return response(200, { sendTime })
      } catch (err) {
        return response(500, { error: err.message })
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // POST /email/ai/full-template - Complete template creation flow
    // ─────────────────────────────────────────────────────────────────────────
    case 'full-template': {
      const { name, purpose, category, audience } = body
      
      if (!purpose) {
        return response(400, { error: 'purpose is required' })
      }
      
      try {
        const result = await email.createFullTemplate(name, purpose, { category, audience })
        return response(200, { result })
      } catch (err) {
        return response(500, { error: err.message })
      }
    }
    
    default:
      return response(404, { error: `Unknown AI tool: ${tool}` })
  }
}
