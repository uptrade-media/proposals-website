/**
 * Forms Get - Get a single form with its submissions
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' } }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Auth check
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const { id } = event.queryStringParameters || {}
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Form ID is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get form with recent submissions
    const { data: form, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching form:', error)
      return { statusCode: 404, body: JSON.stringify({ error: 'Form not found' }) }
    }

    // Check access
    if (form.tenant_id && form.tenant_id !== contact.id && contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Access denied' }) }
    }

    // Get submission stats
    const { data: stats } = await supabase
      .from('form_submissions')
      .select('status, created_at')
      .eq('form_id', id)

    const totalSubmissions = stats?.length || 0
    const newSubmissions = stats?.filter(s => s.status === 'new').length || 0
    
    // Get submissions from last 7 days for sparkline
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentByDay = {}
    stats?.forEach(s => {
      const date = new Date(s.created_at).toISOString().split('T')[0]
      if (new Date(s.created_at) >= sevenDaysAgo) {
        recentByDay[date] = (recentByDay[date] || 0) + 1
      }
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        form,
        stats: {
          total: totalSubmissions,
          new: newSubmissions,
          last7Days: recentByDay
        }
      })
    }
  } catch (error) {
    console.error('Forms get error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
