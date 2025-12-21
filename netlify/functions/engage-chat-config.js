// netlify/functions/engage-chat-config.js
// Get and update chat widget configuration for a project

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  const supabase = createSupabaseAdmin()
  
  // Get project ID from query or body
  const projectId = event.queryStringParameters?.projectId || 
                   JSON.parse(event.body || '{}').projectId

  if (!projectId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Project ID is required' })
    }
  }

  try {
    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, org_id, organizations(id, name, slug)')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Check Signal status for this project
    const { data: signalConfig } = await supabase
      .from('signal_config')
      .select('is_enabled')
      .eq('project_id', projectId)
      .single()

    const signalEnabled = signalConfig?.is_enabled || false

    if (event.httpMethod === 'GET') {
      // Get chat config
      const { data: config, error } = await supabase
        .from('engage_chat_config')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error
      }

      // Return default config if none exists
      const defaultConfig = {
        project_id: projectId,
        org_id: project.org_id,
        is_enabled: false,
        chat_mode: 'live_only',
        position: 'bottom-right',
        theme: { mode: 'auto', accent: '#4bbf39' },
        widget_icon: 'chat',
        initial_message: 'Hi! 👋 How can I help you today?',
        quick_actions: [],
        form_heading: 'Chat with our team',
        form_description: 'Leave your info and we\'ll respond shortly.',
        form_required_fields: ['name', 'email'],
        form_optional_fields: [],
        form_show_message: true,
        form_submit_text: 'Start Chat',
        routing_type: 'project',
        custom_assignees: null,
        fallback_routing: null,
        business_hours: null,
        offline_mode: 'show_form',
        handoff_enabled: true,
        handoff_triggers: ['button', 'keywords'],
        handoff_keywords: ['human', 'agent', 'person', 'representative', 'talk to someone'],
        auto_open_delay: null,
        show_unread_indicator: true,
        play_sound_on_message: true,
        show_powered_by: true
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          config: config || defaultConfig,
          project: {
            id: project.id,
            title: project.title,
            org: project.organizations
          },
          signalEnabled,
          isNew: !config
        })
      }
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { config: updates } = body

      if (!updates) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Config updates required' })
        }
      }

      // Validate: can't enable AI mode without Signal
      if (updates.chat_mode === 'ai' && !signalEnabled) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            error: 'Cannot enable AI chat mode without Signal enabled for this project',
            signalEnabled: false
          })
        }
      }

      // Check if config exists
      const { data: existing } = await supabase
        .from('engage_chat_config')
        .select('id')
        .eq('project_id', projectId)
        .single()

      let result
      if (existing) {
        // Update existing config
        const { data, error } = await supabase
          .from('engage_chat_config')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('engage_chat_config')
          .insert({
            project_id: projectId,
            org_id: project.org_id,
            ...updates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        result = data
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          config: result,
          signalEnabled
        })
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Engage chat config error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
