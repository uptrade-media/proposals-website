// netlify/functions/seo-schedule.js
// Schedule recurring SEO analysis tasks

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      }
    }
  }

  // GET - Fetch schedule for a site
  if (event.httpMethod === 'GET') {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const siteId = event.queryStringParameters?.siteId
    if (!siteId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'siteId is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch schedule configuration
    const { data: schedule, error } = await supabase
      .from('seo_schedules')
      .select('*')
      .eq('site_id', siteId)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is OK
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      }
    }

    // Also fetch recent scheduled runs
    const { data: recentRuns } = await supabase
      .from('seo_scheduled_runs')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedule: schedule || { enabled: false, frequency: 'weekly' },
        recentRuns: recentRuns || []
      })
    }
  }

  // POST - Create or update schedule
  if (event.httpMethod === 'POST') {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const { 
      siteId, 
      schedule = 'weekly', // 'daily', 'weekly', 'monthly'
      enabled = true,
      notifications = true,
      autoApply = false,
      modules = ['all'] // Which modules to run: 'all' or specific ones
    } = JSON.parse(event.body || '{}')

    if (!siteId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'siteId is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Calculate next run time based on schedule
    const now = new Date()
    let nextRun = new Date(now)
    
    switch (schedule) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1)
        nextRun.setHours(2, 0, 0, 0) // Run at 2 AM
        break
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay())) // Next Sunday
        nextRun.setHours(2, 0, 0, 0)
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1)
        nextRun.setDate(1)
        nextRun.setHours(2, 0, 0, 0)
        break
    }

    // Upsert schedule configuration
    const { data: scheduleData, error } = await supabase
      .from('seo_schedules')
      .upsert({
        site_id: siteId,
        frequency: schedule,
        enabled,
        notifications,
        auto_apply: autoApply,
        modules,
        next_run_at: nextRun.toISOString(),
        updated_at: now.toISOString()
      }, { onConflict: 'site_id' })
      .select()
      .single()

    if (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Schedule updated successfully',
        schedule: scheduleData,
        nextRun: nextRun.toISOString()
      })
    }
  }

  // DELETE - Disable schedule
  if (event.httpMethod === 'DELETE') {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const siteId = event.queryStringParameters?.siteId
    if (!siteId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'siteId is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    const { error } = await supabase
      .from('seo_schedules')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('site_id', siteId)

    if (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Schedule disabled' })
    }
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Method not allowed' })
  }
}
