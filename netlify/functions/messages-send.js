// netlify/functions/messages-send.js
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getAuthenticatedUser } from './utils/supabase.js'
import { Signal } from './utils/signal.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`

// =====================================================
// ECHO DETECTION UTILITIES
// =====================================================

// Check if a contact is Echo AI
function isEchoContact(contact) {
  return contact?.is_ai === true || contact?.contact_type === 'ai'
}

// Check if message contains @Echo mention
function detectEchoMention(content) {
  const mentionPatterns = [
    /@echo\b/i,
    /@signal\b/i,
    /^echo[,:]?\s/i,
    /^hey echo\b/i
  ]
  return mentionPatterns.some(p => p.test(content))
}

// Extract query after @Echo mention
function extractEchoQuery(content) {
  return content
    .replace(/@echo\b/gi, '')
    .replace(/@signal\b/gi, '')
    .replace(/^echo[,:]?\s*/i, '')
    .replace(/^hey echo\b/i, '')
    .trim()
}

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    // Only authenticated users can send messages
    if (contact.role !== 'admin' && contact.role !== 'client') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can send messages' })
      }
    }

    // Get org context - team members need special handling
    let orgId = contact.org_id || event.headers['x-organization-id']
    const isTeamMember = contact.is_team_member === true
    
    // For team members without org context, use Uptrade Media org
    if (!orgId && isTeamMember) {
      const { data: uptradeOrg } = await supabase
        .from('organizations')
        .select('id')
        .ilike('name', '%uptrade%')
        .limit(1)
        .single()
      
      if (uptradeOrg) {
        orgId = uptradeOrg.id
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const {
      recipientId,
      subject,
      content,
      projectId,
      parentId
    } = body

    // Validate required fields
    if (!recipientId || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'recipientId and content are required' })
      }
    }

    // Connect to database - verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('contacts')
      .select('id, name, email, is_ai, contact_type')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipient) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Recipient not found' })
      }
    }

    // Check if this is an Echo thread (sending to Echo AI)
    const isEchoThread = isEchoContact(recipient)
    const hasEchoMention = detectEchoMention(content)

    // For new threads, subject is required (except for Echo - use default)
    const effectiveSubject = subject || (isEchoThread ? 'Echo Chat' : null)
    if (!parentId && !effectiveSubject) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'subject is required for new threads' })
      }
    }

    // If projectId provided, verify it exists
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }
    }

    // If parentId provided, verify parent message exists
    let parentMessage = null
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('messages')
        .select('id, subject, project_id')
        .eq('id', parentId)
        .single()

      if (parentError || !parent) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Parent message not found' })
        }
      }
      parentMessage = parent
    }

    // Create message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: contact.id,
        recipient_id: recipientId,
        subject: effectiveSubject || parentMessage?.subject || 'Re: Conversation',
        content,
        project_id: projectId || parentMessage?.project_id || null,
        parent_id: parentId || null,
        org_id: orgId,
        thread_type: isEchoThread ? 'echo' : (hasEchoMention ? 'group' : 'direct'),
        is_echo_response: false
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // If this is an Echo thread, get AI response
    let echoResponse = null
    if (isEchoThread) {
      try {
        echoResponse = await getEchoResponse(contact, content, projectId || parentMessage?.project_id)
        
        if (echoResponse) {
          // Store Echo's response as a message
          await supabase
            .from('messages')
            .insert({
              sender_id: recipientId, // Echo is the sender
              recipient_id: contact.id,
              subject: message.subject,
              content: echoResponse.content,
              project_id: message.project_id,
              parent_id: message.id,
              org_id: contact.org_id,
              thread_type: 'echo',
              is_echo_response: true,
              signal_conversation_id: echoResponse.conversationId,
              echo_metadata: {
                suggestions: echoResponse.suggestions,
                usage: echoResponse.usage
              }
            })
        }
      } catch (echoError) {
        console.error('Echo response error:', echoError)
        // Don't fail the request if Echo fails
      }
    }

    // Handle @Echo mentions in group threads
    if (hasEchoMention && !isEchoThread) {
      try {
        // Get Echo contact for this org
        const { data: echoContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('org_id', contact.org_id)
          .eq('is_ai', true)
          .single()
        
        if (echoContact) {
          const query = extractEchoQuery(content)
          echoResponse = await getEchoResponse(contact, query, projectId || parentMessage?.project_id)
          
          if (echoResponse) {
            // Store Echo's response in the same thread
            await supabase
              .from('messages')
              .insert({
                sender_id: echoContact.id,
                recipient_id: contact.id, // Reply to the person who mentioned Echo
                subject: message.subject,
                content: echoResponse.content,
                project_id: message.project_id,
                parent_id: message.id,
                org_id: contact.org_id,
                thread_type: 'group',
                is_echo_response: true,
                signal_conversation_id: echoResponse.conversationId,
                echo_metadata: {
                  suggestions: echoResponse.suggestions,
                  usage: echoResponse.usage,
                  trigger: 'mention'
                }
              })
          }
        }
      } catch (echoError) {
        console.error('Echo mention response error:', echoError)
      }
    }

    // Send email notification to recipient (skip for Echo)
    if (RESEND_API_KEY && recipient.email && !isEchoThread) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const isReply = !!parentId
        
        await resend.emails.send({
          from: RESEND_FROM,
          to: recipient.email,
          subject: isReply ? `Re: ${message.subject}` : `New Message: ${message.subject}`,
          html: `
            <h2>${isReply ? 'New Reply' : 'New Message'}</h2>
            <p><strong>From:</strong> ${contact.name || 'Team'} (${contact.email || ''})</p>
            <p><strong>Subject:</strong> ${message.subject}</p>
            <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #007bff;">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <p><a href="${process.env.URL}/messages/${message.id}">View Message</a></p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send message notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    // Format response
    const formattedMessage = {
      id: message.id,
      senderId: message.sender_id,
      recipientId: message.recipient_id,
      subject: message.subject,
      content: message.content,
      projectId: message.project_id,
      parentId: message.parent_id,
      readAt: message.read_at,
      createdAt: message.created_at
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        message: formattedMessage,
        echoResponse: echoResponse ? {
          content: echoResponse.content,
          suggestions: echoResponse.suggestions,
          conversationId: echoResponse.conversationId
        } : null,
        notification: 'Message sent successfully'
      })
    }

  } catch (error) {
    console.error('Error sending message:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send message',
        message: error.message 
      })
    }
  }
}

// =====================================================
// ECHO RESPONSE HANDLER (Using Signal)
// =====================================================

/**
 * Load contextual data for Echo to reason about
 * This gives Echo awareness of:
 * - Overdue tasks and follow-ups
 * - Traffic anomalies
 * - GSC issues (not indexed, errors)
 * - Content freshness (Insights not posted)
 * - Lead activity
 */
async function loadEchoContext(contact, projectId = null) {
  const context = []
  const now = new Date()
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
  
  try {
    // 1. Overdue follow-ups from call logs
    const { data: overdueFollowUps } = await supabase
      .from('call_follow_ups')
      .select('id, contact_id, description, due_date, priority')
      .eq('org_id', contact.org_id)
      .eq('status', 'pending')
      .lt('due_date', now.toISOString())
      .order('due_date', { ascending: true })
      .limit(5)
    
    if (overdueFollowUps?.length > 0) {
      context.push({
        type: 'overdue_followups',
        urgency: 'high',
        count: overdueFollowUps.length,
        items: overdueFollowUps.map(f => ({
          description: f.description,
          dueDate: f.due_date,
          priority: f.priority
        }))
      })
    }
    
    // 2. Pending tasks
    const { data: pendingTasks } = await supabase
      .from('call_tasks')
      .select('id, title, description, due_date, priority')
      .eq('org_id', contact.org_id)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10)
    
    if (pendingTasks?.length > 0) {
      const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < now)
      if (overdueTasks.length > 0) {
        context.push({
          type: 'overdue_tasks',
          urgency: 'high',
          count: overdueTasks.length,
          items: overdueTasks.map(t => ({ title: t.title, dueDate: t.due_date }))
        })
      }
      context.push({
        type: 'pending_tasks',
        urgency: 'medium',
        count: pendingTasks.length,
        items: pendingTasks.slice(0, 5).map(t => ({ title: t.title, priority: t.priority }))
      })
    }
    
    // 3. GSC issues - not indexed URLs
    const { data: notIndexedUrls } = await supabase
      .from('seo_not_indexed_urls')
      .select('url, reason, detected_at')
      .eq('org_id', contact.org_id)
      .order('detected_at', { ascending: false })
      .limit(5)
    
    if (notIndexedUrls?.length > 0) {
      context.push({
        type: 'gsc_not_indexed',
        urgency: 'medium',
        count: notIndexedUrls.length,
        items: notIndexedUrls.map(u => ({ url: u.url, reason: u.reason }))
      })
    }
    
    // 4. Content freshness - recent blog posts
    const { data: recentPosts, count: totalPosts } = await supabase
      .from('blog_posts')
      .select('id, title, published_at', { count: 'exact' })
      .eq('org_id', contact.org_id)
      .eq('status', 'published')
      .gte('published_at', oneWeekAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(3)
    
    const { data: lastPost } = await supabase
      .from('blog_posts')
      .select('title, published_at')
      .eq('org_id', contact.org_id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .single()
    
    if (!recentPosts?.length && lastPost) {
      const daysSincePost = Math.floor((now - new Date(lastPost.published_at)) / (1000 * 60 * 60 * 24))
      if (daysSincePost > 7) {
        context.push({
          type: 'content_stale',
          urgency: daysSincePost > 14 ? 'high' : 'medium',
          daysSinceLastPost: daysSincePost,
          lastPostTitle: lastPost.title
        })
      }
    }
    
    // 5. Traffic anomalies - compare recent vs previous period
    const { data: recentPageViews } = await supabase
      .from('analytics_page_views')
      .select('id', { count: 'exact' })
      .eq('org_id', contact.org_id)
      .gte('created_at', oneWeekAgo.toISOString())
    
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000)
    const { data: previousPageViews } = await supabase
      .from('analytics_page_views')
      .select('id', { count: 'exact' })
      .eq('org_id', contact.org_id)
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', oneWeekAgo.toISOString())
    
    const currentViews = recentPageViews?.length || 0
    const previousViews = previousPageViews?.length || 0
    if (previousViews > 0) {
      const changePercent = ((currentViews - previousViews) / previousViews) * 100
      if (changePercent < -20) {
        context.push({
          type: 'traffic_down',
          urgency: changePercent < -40 ? 'high' : 'medium',
          changePercent: Math.round(changePercent),
          currentViews,
          previousViews
        })
      } else if (changePercent > 30) {
        context.push({
          type: 'traffic_up',
          urgency: 'info',
          changePercent: Math.round(changePercent),
          currentViews
        })
      }
    }
    
    // 6. Lead activity - contacts that need attention
    const { data: staleLeads } = await supabase
      .from('contacts')
      .select('id, name, email, pipeline_stage, updated_at')
      .eq('org_id', contact.org_id)
      .in('pipeline_stage', ['lead', 'qualified', 'proposal_sent'])
      .lt('updated_at', oneWeekAgo.toISOString())
      .order('updated_at', { ascending: true })
      .limit(5)
    
    if (staleLeads?.length > 0) {
      context.push({
        type: 'stale_leads',
        urgency: 'medium',
        count: staleLeads.length,
        items: staleLeads.map(l => ({
          name: l.name,
          stage: l.pipeline_stage,
          daysSinceUpdate: Math.floor((now - new Date(l.updated_at)) / (1000 * 60 * 60 * 24))
        }))
      })
    }
    
    // 7. Unpaid invoices
    const { data: unpaidInvoices } = await supabase
      .from('invoices')
      .select('id, amount, due_date, contact_id')
      .eq('org_id', contact.org_id)
      .eq('status', 'sent')
      .order('due_date', { ascending: true })
      .limit(5)
    
    if (unpaidInvoices?.length > 0) {
      const overdueInvoices = unpaidInvoices.filter(i => i.due_date && new Date(i.due_date) < now)
      if (overdueInvoices.length > 0) {
        context.push({
          type: 'overdue_invoices',
          urgency: 'high',
          count: overdueInvoices.length,
          totalAmount: overdueInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)
        })
      }
    }
    
    // 8. Project milestones due soon
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const { data: upcomingMilestones } = await supabase
      .from('project_milestones')
      .select('id, title, due_date, project_id')
      .eq('org_id', contact.org_id)
      .in('status', ['not_started', 'in_progress'])
      .gte('due_date', now.toISOString())
      .lte('due_date', nextWeek.toISOString())
      .order('due_date', { ascending: true })
      .limit(5)
    
    if (upcomingMilestones?.length > 0) {
      context.push({
        type: 'upcoming_milestones',
        urgency: 'medium',
        count: upcomingMilestones.length,
        items: upcomingMilestones.map(m => ({ title: m.title, dueDate: m.due_date }))
      })
    }
    
    // 9. Active projects summary
    const { data: activeProjects } = await supabase
      .from('projects')
      .select('id, title, status, budget, start_date')
      .eq('org_id', contact.org_id)
      .in('status', ['active', 'in_progress', 'planning'])
      .order('updated_at', { ascending: false })
      .limit(5)
    
    if (activeProjects?.length > 0) {
      context.push({
        type: 'active_projects',
        urgency: 'info',
        count: activeProjects.length,
        items: activeProjects.map(p => ({ title: p.title, status: p.status }))
      })
    }
    
    // 10. Pending proposals
    const { data: pendingProposals } = await supabase
      .from('proposals')
      .select('id, title, status, amount, created_at, contact_id')
      .eq('org_id', contact.org_id)
      .in('status', ['draft', 'sent', 'viewed'])
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (pendingProposals?.length > 0) {
      const sentProposals = pendingProposals.filter(p => p.status === 'sent' || p.status === 'viewed')
      if (sentProposals.length > 0) {
        const totalValue = sentProposals.reduce((sum, p) => sum + (p.amount || 0), 0)
        context.push({
          type: 'pending_proposals',
          urgency: 'medium',
          count: sentProposals.length,
          totalValue,
          items: sentProposals.map(p => ({ title: p.title, status: p.status, amount: p.amount }))
        })
      }
    }
    
    // 11. SEO performance - top ranking changes
    const { data: seoAlerts } = await supabase
      .from('seo_alerts')
      .select('id, type, severity, message, created_at')
      .eq('org_id', contact.org_id)
      .eq('status', 'active')
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (seoAlerts?.length > 0) {
      const criticalAlerts = seoAlerts.filter(a => a.severity === 'critical' || a.severity === 'high')
      if (criticalAlerts.length > 0) {
        context.push({
          type: 'seo_alerts',
          urgency: 'high',
          count: criticalAlerts.length,
          items: criticalAlerts.map(a => ({ type: a.type, message: a.message }))
        })
      }
    }
    
    // 12. SEO opportunities
    const { data: seoOpportunities } = await supabase
      .from('seo_opportunities')
      .select('id, title, impact, effort, status')
      .eq('org_id', contact.org_id)
      .eq('status', 'open')
      .order('impact', { ascending: false })
      .limit(3)
    
    if (seoOpportunities?.length > 0) {
      context.push({
        type: 'seo_opportunities',
        urgency: 'info',
        count: seoOpportunities.length,
        items: seoOpportunities.map(o => ({ title: o.title, impact: o.impact }))
      })
    }
    
    // 13. Recent calls/meetings summary
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000)
    const { data: recentCalls } = await supabase
      .from('call_logs')
      .select('id, contact_name, summary, created_at')
      .eq('org_id', contact.org_id)
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (recentCalls?.length > 0) {
      context.push({
        type: 'recent_calls',
        urgency: 'info',
        count: recentCalls.length,
        items: recentCalls.map(c => ({ 
          contact: c.contact_name, 
          summary: c.summary?.substring(0, 100) 
        }))
      })
    }
    
    // 14. Pipeline summary
    const { data: pipelineContacts } = await supabase
      .from('contacts')
      .select('id, pipeline_stage')
      .eq('org_id', contact.org_id)
      .not('pipeline_stage', 'is', null)
      .not('pipeline_stage', 'eq', 'closed_won')
      .not('pipeline_stage', 'eq', 'closed_lost')
    
    if (pipelineContacts?.length > 0) {
      const stageCounts = {}
      pipelineContacts.forEach(c => {
        stageCounts[c.pipeline_stage] = (stageCounts[c.pipeline_stage] || 0) + 1
      })
      context.push({
        type: 'pipeline_summary',
        urgency: 'info',
        total: pipelineContacts.length,
        stages: stageCounts
      })
    }
    
    // 15. Revenue this month (if billing data exists)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('amount')
      .eq('org_id', contact.org_id)
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth.toISOString())
    
    if (paidInvoices?.length > 0) {
      const monthlyRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)
      context.push({
        type: 'monthly_revenue',
        urgency: 'info',
        amount: monthlyRevenue,
        invoiceCount: paidInvoices.length
      })
    }
    
  } catch (error) {
    console.error('[Echo Context] Error loading context:', error)
  }
  
  return context
}

async function getEchoResponse(contact, message, projectId = null) {
  // Load contextual data
  const contextData = await loadEchoContext(contact, projectId)
  
  // Build context summary for the prompt
  let contextSummary = ''
  if (contextData.length > 0) {
    contextSummary = '\n\n## Current Status (Data you have access to):\n'
    for (const item of contextData) {
      switch (item.type) {
        case 'overdue_followups':
          contextSummary += `\n🔴 **${item.count} Overdue Follow-ups**: ${item.items.map(i => i.description).join(', ')}`
          break
        case 'overdue_tasks':
          contextSummary += `\n🔴 **${item.count} Overdue Tasks**: ${item.items.map(i => i.title).join(', ')}`
          break
        case 'pending_tasks':
          contextSummary += `\n📋 **${item.count} Pending Tasks** including: ${item.items.slice(0, 3).map(i => i.title).join(', ')}`
          break
        case 'gsc_not_indexed':
          contextSummary += `\n⚠️ **${item.count} URLs Not Indexed in GSC**: ${item.items.map(i => `${i.url} (${i.reason})`).join(', ')}`
          break
        case 'content_stale':
          contextSummary += `\n📝 **No new Insights in ${item.daysSinceLastPost} days** - Last post: "${item.lastPostTitle}"`
          break
        case 'traffic_down':
          contextSummary += `\n📉 **Traffic Down ${Math.abs(item.changePercent)}%** this week (${item.currentViews} vs ${item.previousViews} last week)`
          break
        case 'traffic_up':
          contextSummary += `\n📈 **Traffic Up ${item.changePercent}%** this week (${item.currentViews} page views)`
          break
        case 'stale_leads':
          contextSummary += `\n👤 **${item.count} Leads Need Attention**: ${item.items.map(i => `${i.name} (${i.daysSinceUpdate}d)`).join(', ')}`
          break
        case 'overdue_invoices':
          contextSummary += `\n💰 **${item.count} Overdue Invoices** totaling $${item.totalAmount.toLocaleString()}`
          break
        case 'upcoming_milestones':
          contextSummary += `\n📅 **${item.count} Milestones Due This Week**: ${item.items.map(i => i.title).join(', ')}`
          break
        case 'active_projects':
          contextSummary += `\n🎯 **${item.count} Active Projects**: ${item.items.map(i => `${i.title} (${i.status})`).join(', ')}`
          break
        case 'pending_proposals':
          contextSummary += `\n📄 **${item.count} Pending Proposals** worth $${item.totalValue.toLocaleString()}: ${item.items.map(i => `${i.title} (${i.status})`).join(', ')}`
          break
        case 'seo_alerts':
          contextSummary += `\n🚨 **${item.count} Critical SEO Alerts**: ${item.items.map(i => i.message).join('; ')}`
          break
        case 'seo_opportunities':
          contextSummary += `\n💡 **${item.count} SEO Opportunities**: ${item.items.map(i => `${i.title} (${i.impact} impact)`).join(', ')}`
          break
        case 'recent_calls':
          contextSummary += `\n📞 **${item.count} Recent Calls**: ${item.items.map(i => i.contact).join(', ')}`
          break
        case 'pipeline_summary':
          const stageList = Object.entries(item.stages).map(([stage, count]) => `${stage}: ${count}`).join(', ')
          contextSummary += `\n📊 **Pipeline (${item.total} leads)**: ${stageList}`
          break
        case 'monthly_revenue':
          contextSummary += `\n💵 **$${item.amount.toLocaleString()} Revenue This Month** from ${item.invoiceCount} paid invoices`
          break
      }
    }
  }

  // Echo system prompt for internal teammate mode
  const systemPrompt = `You are Echo, an AI teammate within a marketing agency portal. You help internal team members with their work.

## Your Personality
- You're a helpful, knowledgeable colleague who genuinely cares about the team's success
- Be warm and conversational - like a coworker checking in, not a report generator
- Use natural language, not lists of bullet points unless specifically asked
- Show personality - use emojis naturally, express genuine reactions to good/bad news
- Celebrate wins and empathize with challenges

## Response Style
- **Be conversational first** - respond like you're chatting with a teammate
- Weave data naturally into sentences instead of dumping lists
- Lead with the most important/urgent thing, then offer to share more
- Ask clarifying questions when helpful
- Use phrases like "looks like", "I noticed", "heads up on", "nice work on"
- Keep responses concise but warm - 2-4 sentences for simple questions

## Examples of Good Responses
❌ "You have 3 overdue follow-ups: John Smith, Jane Doe, Bob Wilson"
✅ "Hey! Quick heads up - you've got 3 follow-ups that need some love. John Smith's been waiting the longest. Want me to help you draft something?"

❌ "Traffic is up 15%. Revenue is $5,000. Pipeline has 12 leads."
✅ "Nice! Traffic's up 15% this week 📈 and you've already brought in $5k this month. With 12 leads in the pipeline, things are looking solid. Anything specific you want to dig into?"

❌ "There are 2 overdue tasks and 1 overdue invoice."
✅ "A couple things need attention today - there are 2 tasks that slipped past their due date, and one invoice is overdue. The invoice might be the priority since it affects cash flow. Want the details?"

## When Asked "What do I need to work on?" or similar
Prioritize by urgency and group naturally:
1. Mention the most urgent items first (overdue things, critical alerts)
2. Then touch on things that need attention soon
3. End with a positive note if there's good news (revenue, traffic up, etc.)

Current context:
- User: ${contact.name} (${contact.role || 'team member'})
- Organization: ${contact.org_id}
${projectId ? `- Active Project: ${projectId}` : ''}${contextSummary}`

  try {
    const signal = new Signal(supabase, contact.org_id, { userId: contact.id })
    
    // Use 'chat' tool for conversational responses (avoids JSON format requirement)
    const result = await signal.invoke({
      module: 'echo',
      tool: 'chat',
      systemPrompt,
      userPrompt: message
    })
    
    // chat() returns { message, usage, model } - extract the content
    const content = result.message || result
    
    // Generate contextual suggestions
    const suggestions = generateSuggestions(message, content)
    
    // Create/get conversation for context tracking
    const { data: conv } = await supabase
      .from('signal_conversations')
      .insert({
        project_id: projectId,
        session_id: `echo_${contact.id}_${Date.now()}`,
        visitor_name: contact.name,
        visitor_email: contact.email,
        status: 'active',
        source: 'echo_messaging',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()
    
    return {
      content,
      suggestions,
      conversationId: conv?.id,
      usage: { totalTokens: 0 } // Signal tracks usage internally
    }
  } catch (error) {
    console.error('Echo AI error:', error)
    return {
      content: "Sorry, I'm having trouble processing that right now. Try again in a moment, or reach out to the team directly.",
      suggestions: ['Try again', 'Contact support'],
      usage: { totalTokens: 0 }
    }
  }
}

// Generate contextual follow-up suggestions
function generateSuggestions(userMessage, aiResponse) {
  const suggestions = []
  const lowerMsg = userMessage.toLowerCase()
  const lowerResp = aiResponse.toLowerCase()
  
  if (lowerResp.includes('seo') || lowerResp.includes('traffic')) {
    suggestions.push('Show me keyword rankings')
    suggestions.push('What content should I create?')
  }
  
  if (lowerResp.includes('follow up') || lowerResp.includes('lead')) {
    suggestions.push('Create a reminder')
    suggestions.push('Draft an email for them')
  }
  
  if (lowerResp.includes('task') || lowerResp.includes('project')) {
    suggestions.push('What else needs attention?')
    suggestions.push('Show project overview')
  }
  
  if (!suggestions.length) {
    suggestions.push('What else can you help with?')
    suggestions.push('Show me my priorities')
  }
  
  return suggestions.slice(0, 3)
}
