// netlify/functions/reports-lighthouse.js
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || {})
    const projectId = params.get('projectId')
    const auditId = params.get('auditId')
    const limit = parseInt(params.get('limit') || '10')

    // If auditId provided, return specific audit
    if (auditId) {
      const { data: audit, error: auditError } = await supabase
        .from('audits')
        .select(`
          *,
          project:projects!audits_project_id_fkey (*),
          contact:contacts!audits_contact_id_fkey (*)
        `)
        .eq('id', auditId)
        .single()

      if (auditError || !audit) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Audit not found' })
        }
      }

      // Check access: admin can see all, clients can only see their own projects
      if (contact.role !== 'admin' && audit.project?.contact_id !== contact.id) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied' })
        }
      }

      // Parse full audit JSON if exists
      const fullAudit = audit.full_audit_json ? JSON.parse(audit.full_audit_json) : null

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          audit: {
            id: audit.id,
            projectId: audit.project_id,
            targetUrl: audit.target_url,
            status: audit.status,
            deviceType: audit.device_type,
            scores: {
              performance: audit.performance_score,
              accessibility: audit.accessibility_score,
              bestPractices: audit.best_practices_score,
              seo: audit.seo_score,
              pwa: audit.pwa_score
            },
            metrics: {
              lcp: audit.lcp_ms,
              fid: audit.fid_ms,
              cls: audit.cls_score,
              fcp: audit.fcp_ms,
              tti: audit.tti_ms,
              tbt: audit.tbt_ms,
              speedIndex: audit.speed_index_ms
            },
            createdAt: audit.created_at,
            completedAt: audit.completed_at,
            errorMessage: audit.error_message,
            fullAudit: fullAudit ? extractKeyAudits(fullAudit) : null
          }
        })
      }
    }

    // If projectId provided, return audits for that project
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }

      // Check access
      if (contact.role !== 'admin' && project.contact_id !== contact.id) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied' })
        }
      }

      // Fetch audits for this project
      const { data: audits, error: auditsError } = await supabase
        .from('audits')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (auditsError) {
        throw auditsError
      }

      // Calculate trends
      const trends = calculateTrends(audits || [])

      // Get latest audit
      const latestAudit = audits?.[0]

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          projectId,
          audits: (audits || []).map(audit => ({
            id: audit.id,
            targetUrl: audit.target_url,
            status: audit.status,
            deviceType: audit.device_type,
            scores: {
              performance: audit.performance_score,
              accessibility: audit.accessibility_score,
              bestPractices: audit.best_practices_score,
              seo: audit.seo_score,
              pwa: audit.pwa_score
            },
            metrics: {
              lcp: audit.lcp_ms,
              fid: audit.fid_ms,
              cls: audit.cls_score,
              fcp: audit.fcp_ms,
              tti: audit.tti_ms,
              tbt: audit.tbt_ms,
              speedIndex: audit.speed_index_ms
            },
            createdAt: audit.created_at,
            completedAt: audit.completed_at
          })),
          summary: {
            totalAudits: audits?.length || 0,
            latestAudit: latestAudit
              ? {
                  date: latestAudit.completed_at || latestAudit.created_at,
                  status: latestAudit.status,
                  scores: {
                    performance: latestAudit.performance_score,
                    accessibility: latestAudit.accessibility_score,
                    bestPractices: latestAudit.best_practices_score,
                    seo: latestAudit.seo_score,
                    pwa: latestAudit.pwa_score
                  }
                }
              : null,
            trends
          }
        })
      }
    }

    // If no projectId, return all audits for admin or user's projects
    let auditsQuery
    if (contact.role === 'admin') {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          project:projects!audits_project_id_fkey (*)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      auditsQuery = data || []
    } else {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          *,
          project:projects!audits_project_id_fkey (*)
        `)
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      auditsQuery = data || []
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audits: auditsQuery.map(audit => ({
          id: audit.id,
          projectId: audit.project_id,
          projectTitle: audit.project?.title,
          targetUrl: audit.target_url,
          status: audit.status,
          deviceType: audit.device_type,
          scores: {
            performance: audit.performance_score,
            accessibility: audit.accessibility_score,
            bestPractices: audit.best_practices_score,
            seo: audit.seo_score,
            pwa: audit.pwa_score
          },
          createdAt: audit.created_at,
          completedAt: audit.completed_at
        }))
      })
    }
  } catch (error) {
    console.error('Error fetching lighthouse audits:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch audits',
        message: error.message
      })
    }
  }
}

/**
 * Extract key audit opportunities from full Lighthouse JSON
 */
function extractKeyAudits(fullAudit) {
  const audits = fullAudit.audits || {}
  const opportunities = []

  // Extract opportunities and diagnostics
  const relevantAudits = [
    'unused-css',
    'unused-javascript',
    'modern-image-formats',
    'offscreen-images',
    'render-blocking-resources',
    'minified-css',
    'minified-javascript',
    'uses-rel-preload',
    'uses-rel-prefetch',
    'tap-targets',
    'image-alt-text',
    'heading-order',
    'valid-lang'
  ]

  relevantAudits.forEach(auditId => {
    const audit = audits[auditId]
    if (audit && audit.score !== 1 && audit.score !== null) {
      opportunities.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        scoreDisplayMode: audit.scoreDisplayMode,
        details: audit.details?.summary
      })
    }
  })

  return opportunities.sort((a, b) => (a.score || 1) - (b.score || 1))
}

/**
 * Calculate performance trends
 */
function calculateTrends(audits) {
  if (audits.length < 2) return null

  const latest = audits[0]
  const previous = audits[1]

  return {
    performance: {
      current: latest.performance_score,
      previous: previous.performance_score,
      change: (latest.performance_score || 0) - (previous.performance_score || 0)
    },
    accessibility: {
      current: latest.accessibility_score,
      previous: previous.accessibility_score,
      change: (latest.accessibility_score || 0) - (previous.accessibility_score || 0)
    },
    bestPractices: {
      current: latest.best_practices_score,
      previous: previous.best_practices_score,
      change: (latest.best_practices_score || 0) - (previous.best_practices_score || 0)
    },
    seo: {
      current: latest.seo_score,
      previous: previous.seo_score,
      change: (latest.seo_score || 0) - (previous.seo_score || 0)
    }
  }
}
