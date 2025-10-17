// netlify/functions/reports-lighthouse.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

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

  // Get and verify auth token
  const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]

  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)

    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      }
    }

    const db = neon(DATABASE_URL)
    const drizzleDb = drizzle(db, { schema })

    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || {})
    const projectId = params.get('projectId')
    const auditId = params.get('auditId')
    const limit = parseInt(params.get('limit') || '10')

    // If auditId provided, return specific audit
    if (auditId) {
      const audit = await drizzleDb.query.audits.findFirst({
        where: eq(schema.audits.id, auditId),
        with: {
          metrics: true,
          project: true,
          contact: true
        }
      })

      if (!audit) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Audit not found' })
        }
      }

      // Check access: admin can see all, clients can only see their own projects
      if (payload.role !== 'admin' && audit.project.contactId !== payload.userId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied' })
        }
      }

      // Parse full audit JSON if exists
      const fullAudit = audit.fullAuditJson ? JSON.parse(audit.fullAuditJson) : null

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          audit: {
            id: audit.id,
            projectId: audit.projectId,
            targetUrl: audit.targetUrl,
            status: audit.status,
            deviceType: audit.deviceType,
            scores: {
              performance: audit.performanceScore,
              accessibility: audit.accessibilityScore,
              bestPractices: audit.bestPracticesScore,
              seo: audit.seoScore,
              pwa: audit.pwascore
            },
            metrics: {
              lcp: audit.lcpMs,
              fid: audit.fidMs,
              cls: audit.clsScore,
              fcp: audit.fcpMs,
              tti: audit.ttiMs,
              tbt: audit.tbtMs,
              speedIndex: audit.speedIndexMs
            },
            createdAt: audit.createdAt,
            completedAt: audit.completedAt,
            errorMessage: audit.errorMessage,
            fullAudit: fullAudit ? extractKeyAudits(fullAudit) : null
          }
        })
      }
    }

    // If projectId provided, return audits for that project
    if (projectId) {
      const project = await drizzleDb.query.projects.findFirst({
        where: eq(schema.projects.id, projectId)
      })

      if (!project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }

      // Check access
      if (payload.role !== 'admin' && project.contactId !== payload.userId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied' })
        }
      }

      // Fetch audits for this project
      const audits = await drizzleDb.query.audits.findMany({
        where: eq(schema.audits.projectId, projectId),
        orderBy: [desc(schema.audits.createdAt)],
        limit,
        with: {
          metrics: true
        }
      })

      // Calculate trends
      const trends = calculateTrends(audits)

      // Get latest audit
      const latestAudit = audits[0]

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          projectId,
          audits: audits.map(audit => ({
            id: audit.id,
            targetUrl: audit.targetUrl,
            status: audit.status,
            deviceType: audit.deviceType,
            scores: {
              performance: audit.performanceScore,
              accessibility: audit.accessibilityScore,
              bestPractices: audit.bestPracticesScore,
              seo: audit.seoScore,
              pwa: audit.pwascore
            },
            metrics: {
              lcp: audit.lcpMs,
              fid: audit.fidMs,
              cls: audit.clsScore,
              fcp: audit.fcpMs,
              tti: audit.ttiMs,
              tbt: audit.tbtMs,
              speedIndex: audit.speedIndexMs
            },
            createdAt: audit.createdAt,
            completedAt: audit.completedAt
          })),
          summary: {
            totalAudits: audits.length,
            latestAudit: latestAudit
              ? {
                  date: latestAudit.completedAt || latestAudit.createdAt,
                  status: latestAudit.status,
                  scores: {
                    performance: latestAudit.performanceScore,
                    accessibility: latestAudit.accessibilityScore,
                    bestPractices: latestAudit.bestPracticesScore,
                    seo: latestAudit.seoScore,
                    pwa: latestAudit.pwascore
                  }
                }
              : null,
            trends
          }
        })
      }
    }

    // If no projectId, return all audits for admin or user's projects
    let auditQuery
    if (payload.role === 'admin') {
      auditQuery = await drizzleDb.query.audits.findMany({
        orderBy: [desc(schema.audits.createdAt)],
        limit,
        with: {
          project: true,
          metrics: true
        }
      })
    } else {
      auditQuery = await drizzleDb.query.audits.findMany({
        where: eq(schema.audits.contactId, payload.userId),
        orderBy: [desc(schema.audits.createdAt)],
        limit,
        with: {
          project: true,
          metrics: true
        }
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audits: auditQuery.map(audit => ({
          id: audit.id,
          projectId: audit.projectId,
          projectTitle: audit.project?.title,
          targetUrl: audit.targetUrl,
          status: audit.status,
          deviceType: audit.deviceType,
          scores: {
            performance: audit.performanceScore,
            accessibility: audit.accessibilityScore,
            bestPractices: audit.bestPracticesScore,
            seo: audit.seoScore,
            pwa: audit.pwascore
          },
          createdAt: audit.createdAt,
          completedAt: audit.completedAt
        })),
        summary: {
          totalAudits: auditQuery.length,
          completedAudits: auditQuery.filter(a => a.status === 'completed').length,
          failedAudits: auditQuery.filter(a => a.status === 'failed').length,
          averagePerformanceScore:
            auditQuery.filter(a => a.performanceScore).length > 0
              ? Math.round(
                  auditQuery
                    .filter(a => a.performanceScore)
                    .reduce((sum, a) => sum + a.performanceScore, 0) / auditQuery.filter(a => a.performanceScore).length
                )
              : null
        }
      })
    }
  } catch (error) {
    console.error('Error fetching Lighthouse data:', error)

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch Lighthouse data',
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
      current: latest.performanceScore,
      previous: previous.performanceScore,
      change: latest.performanceScore - previous.performanceScore
    },
    accessibility: {
      current: latest.accessibilityScore,
      previous: previous.accessibilityScore,
      change: latest.accessibilityScore - previous.accessibilityScore
    },
    bestPractices: {
      current: latest.bestPracticesScore,
      previous: previous.bestPracticesScore,
      change: latest.bestPracticesScore - previous.bestPracticesScore
    },
    seo: {
      current: latest.seoScore,
      previous: previous.seoScore,
      change: latest.seoScore - previous.seoScore
    }
  }
}
