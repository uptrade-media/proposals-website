/**
 * Health Check Endpoint
 * 
 * Returns the health status of the application and its dependencies.
 * Useful for monitoring, uptime checks, and debugging.
 * 
 * GET /.netlify/functions/health
 * 
 * Response:
 * {
 *   "status": "healthy",
 *   "timestamp": "2025-10-12T10:30:00.000Z",
 *   "version": "1.0.0",
 *   "checks": {
 *     "database": { "status": "healthy", "responseTime": 45 },
 *     "email": { "status": "healthy" },
 *     "environment": { "status": "healthy" }
 *   }
 * }
 */

import { checkConnection } from './utils/db.js'

export async function handler(event) {
  const startTime = Date.now()
  const checks = {}
  let overallStatus = 'healthy'

  // Check database connection
  try {
    const dbStart = Date.now()
    const isHealthy = await checkConnection()
    checks.database = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - dbStart
    }
    if (!isHealthy) overallStatus = 'degraded'
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error.message
    }
    overallStatus = 'unhealthy'
  }

  // Check email service (Resend API key configured)
  checks.email = {
    status: process.env.RESEND_API_KEY ? 'healthy' : 'unhealthy'
  }
  if (!process.env.RESEND_API_KEY) {
    overallStatus = 'degraded'
  }

  // Check critical environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'AUTH_JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'RESEND_API_KEY',
    'ADMIN_EMAIL'
  ]

  const missingVars = requiredEnvVars.filter(v => !process.env[v])
  checks.environment = {
    status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
    ...(missingVars.length > 0 && { missingVariables: missingVars })
  }
  if (missingVars.length > 0) {
    overallStatus = 'unhealthy'
  }

  // Build response
  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    uptime: process.uptime ? process.uptime() : undefined,
    responseTime: Date.now() - startTime,
    checks
  }

  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    body: JSON.stringify(response, null, 2)
  }
}
