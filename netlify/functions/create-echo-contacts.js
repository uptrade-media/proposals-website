// Create Echo contacts for all organizations that don't have one
import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const supabase = createSupabaseAdmin()
  
  try {
    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
    
    if (orgsError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: orgsError.message })
      }
    }
    
    const results = []
    
    for (const org of orgs) {
      // Check if Echo already exists
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('org_id', org.id)
        .eq('is_ai', true)
        .limit(1)
      
      if (existing && existing.length > 0) {
        results.push({
          org_id: org.id,
          org_name: org.name,
          status: 'already_exists',
          echo_id: existing[0].id
        })
        continue
      }
      
      // Create Echo contact
      const { data: echo, error: createError } = await supabase
        .from('contacts')
        .insert({
          org_id: org.id,
          email: `echo-${org.id}@signal.uptrademedia.com`,
          name: 'Echo',
          role: 'Signal AI Assistant',
          contact_type: 'ai',
          is_ai: true,
          avatar_url: '/echo-avatar.svg',
          always_available: true
        })
        .select()
        .single()
      
      if (createError) {
        results.push({
          org_id: org.id,
          org_name: org.name,
          status: 'error',
          error: createError.message
        })
      } else {
        results.push({
          org_id: org.id,
          org_name: org.name,
          status: 'created',
          echo_id: echo.id
        })
      }
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        organizations_processed: orgs.length,
        results
      }, null, 2)
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    }
  }
}
