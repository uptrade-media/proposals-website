/**
 * Form Submissions Get - Get a single submission with full details
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
      return { statusCode: 400, body: JSON.stringify({ error: 'Submission ID is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get submission with related data
    const { data: submission, error } = await supabase
      .from('form_submissions')
      .select(`
        *,
        form:forms(id, name, slug, form_type, fields, website_url),
        contact:contacts(id, name, email, company, phone, pipeline_stage),
        processed_by_contact:contacts!form_submissions_processed_by_fkey(id, name, email)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching submission:', error)
      return { statusCode: 404, body: JSON.stringify({ error: 'Submission not found' }) }
    }

    // Get other submissions from same contact
    let relatedSubmissions = []
    if (submission.contact_id) {
      const { data: related } = await supabase
        .from('form_submissions')
        .select('id, form_id, source_page, status, created_at, form:forms(name)')
        .eq('contact_id', submission.contact_id)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(5)

      relatedSubmissions = related || []
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        submission,
        relatedSubmissions
      })
    }
  } catch (error) {
    console.error('Submission get error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
