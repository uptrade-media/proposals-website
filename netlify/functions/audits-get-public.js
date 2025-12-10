// netlify/functions/audits-get-public.js
// Public endpoint for magic link access to audits
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const auditId = event.queryStringParameters?.id
    const magicToken = event.queryStringParameters?.token

    if (!auditId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Audit ID is required' })
      }
    }

    if (!magicToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Access token is required' })
      }
    }

    // Fetch audit with magic token validation
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select(`
        *,
        contact:contacts(id, name, email, company)
      `)
      .eq('id', auditId)
      .eq('magic_token', magicToken)
      .single()

    if (auditError || !audit) {
      console.error('Audit fetch error:', auditError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired link' })
      }
    }

    // Check token expiration
    if (audit.magic_token_expires_at) {
      const expiresAt = new Date(audit.magic_token_expires_at)
      if (expiresAt < new Date()) {
        return {
          statusCode: 410,
          headers,
          body: JSON.stringify({ error: 'This link has expired. Please request a new audit.' })
        }
      }
    }

    // Check if audit is complete
    if (audit.status === 'pending' || audit.status === 'running') {
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({ 
          error: 'Audit is still processing',
          status: audit.status,
          message: 'Your audit is currently being processed. Please check back in a few minutes.'
        })
      }
    }

    if (audit.status === 'failed' || audit.status === 'error') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Audit failed to complete',
          message: audit.error_message || 'There was an error processing your audit. Please request a new one.'
        })
      }
    }

    // Transform response to camelCase for frontend
    const transformedAudit = {
      id: audit.id,
      targetUrl: audit.target_url,
      status: audit.status,
      
      // Grade - check summary first, then calculate
      grade: audit.summary?.grade || audit.summary?.metrics?.grade || null,
      
      // Scores - prefer score_* columns, fall back to summary.metrics
      performanceScore: audit.performance_score || audit.score_performance || audit.summary?.metrics?.performance,
      seoScore: audit.seo_score || audit.score_seo || audit.summary?.metrics?.seo,
      accessibilityScore: audit.accessibility_score || audit.score_accessibility || audit.summary?.metrics?.accessibility,
      bestPracticesScore: audit.best_practices_score || audit.score_best_practices,
      securityScore: audit.score_security || audit.summary?.metrics?.security,
      overallScore: audit.score_overall || audit.summary?.metrics?.overall,
      
      // Core Web Vitals
      lcpMs: audit.lcp_ms,
      fidMs: audit.fid_ms,
      clsScore: audit.cls_score,
      fcpMs: audit.fcp_ms,
      ttiMs: audit.tti_ms,
      tbtMs: audit.tbt_ms,
      speedIndexMs: audit.speed_index_ms,
      
      // Summary data (processed insights from main site)
      summary: audit.summary || null,
      
      // Issues extracted from summary for convenience
      seoIssues: audit.summary?.seoIssues || [],
      performanceIssues: audit.summary?.performanceIssues || [],
      securityIssues: audit.summary?.securityIssues || {},
      priorityActions: audit.summary?.priorityActions || [],
      insightsSummary: audit.summary?.insightsSummary || null,
      
      // Full PageSpeed response (raw data, large)
      fullAuditJson: audit.full_audit_json || audit.pagespeed_response,
      reportUrl: audit.report_url,
      htmlReport: audit.html_report,
      
      // Metadata
      deviceType: audit.device_type,
      
      // Timestamps
      createdAt: audit.created_at,
      completedAt: audit.completed_at
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audit: transformedAudit,
        contact: audit.contact ? {
          name: audit.contact.name,
          email: audit.contact.email,
          company: audit.contact.company
        } : null
      })
    }

  } catch (error) {
    console.error('Error fetching public audit:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
