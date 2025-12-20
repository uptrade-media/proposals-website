// netlify/functions/audits-validate-token.js
// Validates audit magic tokens and returns full audit data
// Used for magic link access to audit reports

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { auditId, token } = JSON.parse(event.body || '{}')

    if (!auditId || !token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ valid: false, error: 'Missing auditId or token' })
      }
    }

    const supabase = createSupabaseAdmin()
    
    // Look up the audit by ID and verify the token matches
    const { data: audit, error } = await supabase
      .from('audits')
      .select(`
        *,
        contact:contacts(id, name, email, company)
      `)
      .eq('id', auditId)
      .single()
    
    if (error || !audit) {
      console.error('[validate-token] Audit not found:', auditId, error)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ valid: false, error: 'Audit not found' })
      }
    }
    
    // Check if token matches
    if (audit.magic_token !== token) {
      console.error('[validate-token] Token mismatch for audit:', auditId)
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ valid: false, error: 'Invalid token' })
      }
    }
    
    // Check if token is expired (if expiry is set)
    if (audit.magic_token_expires_at) {
      const expiresAt = new Date(audit.magic_token_expires_at)
      if (expiresAt < new Date()) {
        console.error('[validate-token] Token expired for audit:', auditId)
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ valid: false, error: 'Token expired' })
        }
      }
    }
    
    // Check if audit is still processing
    if (audit.status === 'pending' || audit.status === 'running') {
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({ 
          valid: true,
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
          valid: true,
          error: 'Audit failed to complete',
          message: audit.error_message || 'There was an error processing your audit. Please request a new one.'
        })
      }
    }

    console.log('[validate-token] Token valid for audit:', auditId)
    
    // Transform response to camelCase for frontend (same as audits-get-public)
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
      
      // Summary data (processed insights)
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
        valid: true, 
        audit: transformedAudit,
        contact: audit.contact ? {
          name: audit.contact.name,
          email: audit.contact.email,
          company: audit.contact.company
        } : null
      })
    }

  } catch (error) {
    console.error('Error validating token:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ valid: false, error: 'Failed to validate token' })
    }
  }
}
