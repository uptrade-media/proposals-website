// netlify/functions/audits-get.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  // Get audit ID from query params
  const auditId = event.queryStringParameters?.id

  if (!auditId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Audit ID is required' })
    }
  }

  try {
    const userId = contact.id

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.role === 'admin'

    // Build query - admins can see any audit, users only their own
    let query = supabase
      .from('audits')
      .select('*')
      .eq('id', auditId)
    
    // Non-admins can only view their own audits
    if (!isAdmin) {
      query = query.eq('contact_id', userId)
    }
    
    const { data: audit, error } = await query.single()

    if (error || !audit) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Audit not found' })
      }
    }

    // Transform to camelCase for frontend consistency
    const transformedAudit = {
      id: audit.id,
      targetUrl: audit.target_url,
      status: audit.status,
      errorMessage: audit.error_message,
      
      // Grade - check summary first
      grade: audit.summary?.grade || audit.summary?.metrics?.grade || null,
      
      // Scores
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
      
      // Summary data
      summary: audit.summary || null,
      seoIssues: audit.summary?.seoIssues || [],
      performanceIssues: audit.summary?.performanceIssues || [],
      securityIssues: audit.summary?.securityIssues || {},
      priorityActions: audit.summary?.priorityActions || [],
      insightsSummary: audit.summary?.insightsSummary || null,
      
      // Full data
      fullAuditJson: audit.full_audit_json || audit.pagespeed_response,
      reportUrl: audit.report_url,
      htmlReport: audit.html_report,
      
      // Metadata
      deviceType: audit.device_type,
      throttlingProfile: audit.throttling_profile,
      
      // Magic link
      magicToken: audit.magic_token,
      magicTokenExpires: audit.magic_token_expires,
      
      // Timestamps
      createdAt: audit.created_at,
      completedAt: audit.completed_at,
      updatedAt: audit.updated_at
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audit: transformedAudit
      })
    }

  } catch (error) {
    console.error('Error fetching audit:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch audit' })
    }
  }
}
