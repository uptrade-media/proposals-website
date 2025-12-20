// netlify/functions/projects-update.js
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Get project ID from path
  const projectId = event.path.split('/').pop()
  if (!projectId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Project ID required' })
    }
  }

  try {
    // Verify authentication via Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    // Only admins can update projects
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can update projects' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      title, 
      description, 
      status,
      budget,
      startDate,
      endDate,
      contactId,
      start_date,
      end_date,
      tenant_features,
      tenantFeatures // alias
    } = body

    // Check if project exists (and get current tenant_features for merge)
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, tenant_features')
      .eq('id', projectId)
      .single()

    if (fetchError || !existingProject) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Build update object (only include fields that were provided)
    const updates = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (status !== undefined) updates.status = status
    if (budget !== undefined) updates.budget = budget ? String(budget) : null
    // Support both camelCase and snake_case for dates
    const startDateValue = startDate || start_date
    const endDateValue = endDate || end_date
    if (startDateValue !== undefined) updates.start_date = startDateValue ? new Date(startDateValue).toISOString() : null
    if (endDateValue !== undefined) updates.end_date = endDateValue ? new Date(endDateValue).toISOString() : null
    // Handle contact assignment
    if (contactId !== undefined) updates.contact_id = contactId || null
    
    // Handle tenant_features update (merge with existing)
    const tenantFeaturesValue = tenant_features || tenantFeatures
    if (tenantFeaturesValue !== undefined) {
      // Merge with existing tenant_features (array format) 
      const currentFeatures = existingProject.tenant_features || []
      if (Array.isArray(tenantFeaturesValue)) {
        // If passed as array, use directly
        updates.tenant_features = tenantFeaturesValue
      } else if (typeof tenantFeaturesValue === 'object') {
        // If passed as object { key: boolean }, convert to array
        const newFeatures = new Set(currentFeatures)
        for (const [key, enabled] of Object.entries(tenantFeaturesValue)) {
          if (enabled) {
            newFeatures.add(key)
          } else {
            newFeatures.delete(key)
          }
        }
        updates.tenant_features = Array.from(newFeatures)
      }
    }

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Format response
    const formattedProject = {
      id: updatedProject.id,
      contactId: updatedProject.contact_id,
      title: updatedProject.title,
      description: updatedProject.description,
      status: updatedProject.status,
      budget: updatedProject.budget ? parseFloat(updatedProject.budget) : null,
      startDate: updatedProject.start_date,
      endDate: updatedProject.end_date,
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at,
      is_tenant: updatedProject.is_tenant,
      tenant_features: updatedProject.tenant_features,
      tenant_domain: updatedProject.tenant_domain,
      tenant_modules: (updatedProject.tenant_features || []).reduce((acc, f) => ({ ...acc, [f]: true }), {})
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        project: formattedProject,
        message: 'Project updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating project:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update project',
        message: error.message 
      })
    }
  }
}
