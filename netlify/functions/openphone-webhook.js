// ========================================
// OPENPHONE WEBHOOK HANDLER
// Processes call events and triggers AI analysis
// Events: call.completed, call.recording.completed, call.transcript.completed
// ========================================

import { createSupabaseAdmin } from './utils/supabase.js'
import { createHash, createHmac } from 'crypto'
import OpenAI from 'openai'

const OPENPHONE_WEBHOOK_SECRET = process.env.OPENPHONE_WEBHOOK_SECRET

/**
 * Verify OpenPhone webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return digest === signature
}

/**
 * Fetch OpenPhone call transcript
 */
async function fetchTranscript(callId) {
  const response = await fetch(`https://api.openphone.com/v1/calls/${callId}/transcript`, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENPHONE_API_KEY}`
    }
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      return null // Transcription not available yet
    }
    throw new Error(`Failed to fetch transcript: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.text || null
}

/**
 * Fetch OpenPhone AI summary
 */
async function fetchSummary(callId) {
  const response = await fetch(`https://api.openphone.com/v1/calls/${callId}/summary`, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENPHONE_API_KEY}`
    }
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      return null // Summary not available yet
    }
    throw new Error(`Failed to fetch summary: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.summary || null
}

/**
 * Match contact by phone number
 */
async function matchContactByPhone(supabase, phoneNumber) {
  // Normalize phone number (remove +1, spaces, dashes)
  const normalized = phoneNumber.replace(/[\s\-\+]/g, '').slice(-10)
  
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, email, company')
    .or(`phone.ilike.%${normalized}%`)
    .limit(1)
  
  if (error) {
    console.error('Error matching contact:', error)
    return null
  }
  
  return data?.[0] || null
}

/**
 * Enhanced AI analysis using OpenPhone data
 */
async function analyzeCallWithAI(transcript, openphoneSummary) {
  if (!transcript && !openphoneSummary) {
    return null // Nothing to analyze
  }
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const prompt = `You are a CRM assistant analyzing a sales call. You have been provided:
1. OpenPhone's transcript: ${transcript ? 'Available' : 'Not available'}
2. OpenPhone's AI summary: ${openphoneSummary ? 'Available' : 'Not available'}

Your task is to provide ENHANCED CRM analysis in JSON format with these fields:

{
  "enhanced_summary": "2-3 sentence summary with key business details",
  "sentiment": "positive|neutral|negative|mixed",
  "conversation_type": "sales|support|discovery|closing|follow_up",
  "lead_quality_score": 0-100 (0-40 cold, 41-70 warm, 71-100 hot),
  "contact": {
    "name": "Full name if mentioned",
    "company": "Company name",
    "title": "Job title",
    "email": "Email if mentioned",
    "phone": "Phone if mentioned",
    "website": "Website if mentioned",
    "confidence": 0.00-1.00
  },
  "tasks": [
    {
      "title": "Action item title",
      "description": "Details",
      "task_type": "follow_up|send_proposal|schedule_meeting|research|technical",
      "priority": "low|medium|high|urgent",
      "due_date": "ISO 8601 date string",
      "confidence": 0.00-1.00,
      "reasoning": "Why this task is needed"
    }
  ],
  "topics": [
    {
      "topic": "pricing|timeline|features|objections|budget|competition",
      "relevance_score": 0.00-1.00,
      "sentiment": "positive|neutral|negative",
      "key_phrases": ["relevant quotes"]
    }
  ],
  "follow_up": {
    "type": "email|call|sms|meeting",
    "scheduled_for": "ISO 8601 date string",
    "suggested_subject": "Subject line for email",
    "suggested_message": "Draft message"
  }
}

INPUT DATA:
${transcript ? `Transcript: ${transcript}` : ''}
${openphoneSummary ? `OpenPhone Summary: ${openphoneSummary}` : ''}

Return ONLY valid JSON, no markdown.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })
  
  return JSON.parse(completion.choices[0].message.content)
}

/**
 * Process call and create database records
 */
async function processCall(supabase, callData, transcript, openphoneSummary, aiAnalysis) {
  // Match or create contact
  let contactId = await matchContactByPhone(supabase, callData.phoneNumber)
  let matchedBy = 'phone_number'
  
  if (!contactId && aiAnalysis?.contact?.confidence > 0.7) {
    // Auto-create contact from AI extraction
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        email: aiAnalysis.contact.email,
        name: aiAnalysis.contact.name,
        company: aiAnalysis.contact.company,
        phone: callData.phoneNumber,
        website: aiAnalysis.contact.website,
        role: 'client',
        source: 'openphone_call'
      })
      .select('id')
      .single()
    
    contactId = newContact?.id
    matchedBy = 'ai_extraction'
  }
  
  // Update call log with analysis
  const { data: callLog, error: callError } = await supabase
    .from('call_logs')
    .update({
      contact_id: contactId,
      matched_by: matchedBy,
      openphone_transcript: transcript,
      openphone_summary: openphoneSummary,
      ai_summary: aiAnalysis?.enhanced_summary,
      ai_key_points: JSON.stringify(aiAnalysis?.topics || []),
      sentiment: aiAnalysis?.sentiment,
      conversation_type: aiAnalysis?.conversation_type,
      lead_quality_score: aiAnalysis?.lead_quality_score,
      processing_status: 'completed',
      processed_at: new Date().toISOString()
    })
    .eq('openphone_call_id', callData.id)
    .select()
    .single()
  
  if (callError) {
    throw new Error(`Failed to update call log: ${callError.message}`)
  }
  
  // Create tasks
  if (aiAnalysis?.tasks) {
    for (const task of aiAnalysis.tasks) {
      await supabase.from('call_tasks').insert({
        call_log_id: callLog.id,
        contact_id: contactId,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        priority: task.priority,
        due_date: task.due_date,
        ai_confidence: task.confidence,
        ai_reasoning: task.reasoning,
        assigned_to: callLog.handled_by // Assign to whoever handled the call
      })
    }
  }
  
  // Create contact extraction record
  if (aiAnalysis?.contact) {
    await supabase.from('call_contact_extractions').insert({
      call_log_id: callLog.id,
      extracted_name: aiAnalysis.contact.name,
      extracted_company: aiAnalysis.contact.company,
      extracted_title: aiAnalysis.contact.title,
      extracted_email: aiAnalysis.contact.email,
      extracted_phone: aiAnalysis.contact.phone,
      extracted_website: aiAnalysis.contact.website,
      confidence_score: aiAnalysis.contact.confidence,
      match_status: contactId ? 'matched' : 'pending',
      matched_contact_id: contactId,
      auto_created_contact: matchedBy === 'ai_extraction'
    })
  }
  
  // Create topics
  if (aiAnalysis?.topics) {
    for (const topic of aiAnalysis.topics) {
      await supabase.from('call_topics').insert({
        call_log_id: callLog.id,
        topic: topic.topic,
        relevance_score: topic.relevance_score,
        sentiment: topic.sentiment,
        key_phrases: JSON.stringify(topic.key_phrases || [])
      })
    }
  }
  
  // Create follow-up
  if (aiAnalysis?.follow_up && contactId) {
    await supabase.from('call_follow_ups').insert({
      call_log_id: callLog.id,
      contact_id: contactId,
      follow_up_type: aiAnalysis.follow_up.type,
      scheduled_for: aiAnalysis.follow_up.scheduled_for,
      suggested_subject: aiAnalysis.follow_up.suggested_subject,
      suggested_message: aiAnalysis.follow_up.suggested_message
    })
  }
  
  // Update contact stats
  if (contactId) {
    await supabase.rpc('update_contact_call_stats', {
      p_contact_id: contactId,
      p_duration: callData.duration,
      p_sentiment: aiAnalysis?.sentiment
    })
  }
  
  return callLog
}

/**
 * Find a pre-logged call intent that matches this call
 * (for outgoing calls initiated from CRM)
 */
async function findMatchingIntent(supabase, phoneNumber, direction) {
  if (direction !== 'outgoing') return null
  
  // Normalize phone number for matching
  const normalized = phoneNumber.replace(/[\s\-\+]/g, '').slice(-10)
  
  // Look for a pending call log created in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  const { data: pendingLogs, error } = await supabase
    .from('call_logs')
    .select('*')
    .eq('processing_status', 'awaiting_call')
    .gte('initiated_at', fiveMinutesAgo)
    .or(`phone_number.ilike.%${normalized}%`)
    .order('initiated_at', { ascending: false })
    .limit(1)
  
  if (error) {
    console.error('Error finding matching intent:', error)
    return null
  }
  
  return pendingLogs?.[0] || null
}

/**
 * Main webhook handler
 */
export async function handler(event) {
  try {
    // Verify webhook signature
    const signature = event.headers['x-openphone-signature']
    const isValid = verifyWebhookSignature(
      event.body,
      signature,
      OPENPHONE_WEBHOOK_SECRET
    )
    
    if (!isValid) {
      console.error('Invalid webhook signature')
      return { statusCode: 401, body: 'Invalid signature' }
    }
    
    const { event: eventType, data } = JSON.parse(event.body)
    console.log('OpenPhone webhook event:', eventType, data.id)
    
    const supabase = createSupabaseAdmin()
    
    // Handle different event types
    switch (eventType) {
      case 'call.completed': {
        // Check if there's a pre-logged intent from CRM click-to-call
        const matchingIntent = await findMatchingIntent(supabase, data.phoneNumber, data.direction)
        
        if (matchingIntent) {
          // Update the existing pre-logged call with OpenPhone data
          console.log('Found matching intent:', matchingIntent.id)
          
          const { data: callLog } = await supabase
            .from('call_logs')
            .update({
              openphone_call_id: data.id,
              openphone_conversation_id: data.conversationId,
              status: data.status,
              duration: data.duration,
              recording_url: data.recordingUrl,
              handled_by: data.answeredBy,
              processing_status: 'pending'
            })
            .eq('id', matchingIntent.id)
            .select()
            .single()
          
          console.log('Updated pre-logged call:', callLog.id)
          
          // Try to fetch and analyze
          const transcript = await fetchTranscript(data.id).catch(() => null)
          const summary = await fetchSummary(data.id).catch(() => null)
          
          if (transcript || summary) {
            const analysis = await analyzeCallWithAI(transcript, summary)
            await processCall(supabase, { ...data, id: data.id }, transcript, summary, analysis)
            console.log('Call analyzed immediately')
          }
        } else {
          // Create new call log (incoming or no matching intent)
          const { data: callLog } = await supabase
            .from('call_logs')
            .insert({
              openphone_call_id: data.id,
              openphone_conversation_id: data.conversationId,
              phone_number: data.phoneNumber,
              direction: data.direction,
              status: data.status,
              duration: data.duration,
              recording_url: data.recordingUrl,
              handled_by: data.answeredBy,
              processing_status: 'pending'
            })
            .select()
            .single()
          
          console.log('Call log created:', callLog.id)
          
          // Try to fetch transcript and summary immediately (might not be ready)
          const transcript = await fetchTranscript(data.id).catch(() => null)
          const summary = await fetchSummary(data.id).catch(() => null)
          
          if (transcript || summary) {
            // If available, analyze immediately
            const analysis = await analyzeCallWithAI(transcript, summary)
            await processCall(supabase, data, transcript, summary, analysis)
            console.log('Call analyzed immediately')
          } else {
            console.log('Transcript/summary not ready, waiting for webhook events')
          }
        }
        
        break
      }
      
      case 'call.recording.completed': {
        // Recording is ready, but we might still need transcript
        console.log('Recording completed for call:', data.id)
        
        // Update recording URL if not already set
        await supabase
          .from('call_logs')
          .update({ recording_url: data.recordingUrl })
          .eq('openphone_call_id', data.id)
        
        break
      }
      
      case 'call.transcript.completed': {
        // Transcript is ready - fetch and analyze
        const transcript = await fetchTranscript(data.id)
        const summary = await fetchSummary(data.id).catch(() => null) // Summary might not be ready yet
        
        // Get existing call log
        const { data: callLog } = await supabase
          .from('call_logs')
          .select('*, call_completed:call_completed(*)')
          .eq('openphone_call_id', data.id)
          .single()
        
        if (!callLog) {
          console.error('Call log not found:', data.id)
          return { statusCode: 404, body: 'Call log not found' }
        }
        
        // Only analyze if we have transcript OR summary and haven't processed yet
        if ((transcript || summary) && callLog.processing_status !== 'completed') {
          const analysis = await analyzeCallWithAI(transcript, summary)
          
          // Get call data from original webhook
          const callData = {
            id: data.id,
            phoneNumber: callLog.phone_number,
            duration: callLog.duration
          }
          
          await processCall(supabase, callData, transcript, summary, analysis)
          console.log('Call analyzed from transcript/summary webhook')
        }
        
        break
      }
      
      default:
        console.log('Unhandled event type:', eventType)
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    }
    
  } catch (error) {
    console.error('Webhook error:', error)
    
    // Update call log with error
    if (error.callId) {
      const supabase = createSupabaseAdmin()
      await supabase
        .from('call_logs')
        .update({
          processing_status: 'failed',
          processing_error: error.message
        })
        .eq('openphone_call_id', error.callId)
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
