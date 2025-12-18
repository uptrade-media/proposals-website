// netlify/functions/api.js
// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED API ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
// Single function that routes all API requests, reducing cold starts
// and enabling shared resources (DB connections, auth, etc.)
//
// Usage: All requests go to /.netlify/functions/api/{path}
// Example: /.netlify/functions/api/seo/sites → seo.sites.list handler
// ═══════════════════════════════════════════════════════════════════════════════

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

// ─────────────────────────────────────────────────────────────────────────────
// Import Route Modules
// ─────────────────────────────────────────────────────────────────────────────
import * as seoRoutes from './routes/seo.js'
import * as crmRoutes from './routes/crm.js'
import * as billingRoutes from './routes/billing.js'
import * as projectsRoutes from './routes/projects.js'
import * as proposalsRoutes from './routes/proposals.js'
import * as adminRoutes from './routes/admin.js'
import * as emailRoutes from './routes/email.js'
import * as filesRoutes from './routes/files.js'
import * as authRoutes from './routes/auth.js'
import * as dashboardRoutes from './routes/dashboard.js'
import * as messagesRoutes from './routes/messages.js'
import * as jobsRoutes from './routes/jobs.js'
import * as clientSeoRoutes from './routes/client-seo.js'
import signalRoutes from './routes/signal.js'

// ─────────────────────────────────────────────────────────────────────────────
// CORS Headers
// ─────────────────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json'
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Registry
// ─────────────────────────────────────────────────────────────────────────────
// Maps path prefixes to route modules
const ROUTE_MODULES = {
  'seo': seoRoutes,
  'crm': crmRoutes,
  'billing': billingRoutes,
  'invoices': billingRoutes,
  'projects': projectsRoutes,
  'proposals': proposalsRoutes,
  'admin': adminRoutes,
  'email': emailRoutes,
  'files': filesRoutes,
  'auth': authRoutes,
  'dashboard': dashboardRoutes,
  'messages': messagesRoutes,
  'jobs': jobsRoutes,
  'client': clientSeoRoutes,  // Client-facing SEO routes
  'signal': { default: signalRoutes }  // Signal AI unified layer
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  'GET /auth/verify',
  'POST /auth/login',
  'POST /auth/google',
  'POST /auth/logout',
  'GET /invoices/public/:id',
  'POST /invoices/pay-public',
  'GET /audits/public/:id',
  'GET /proposals/public/:id',
  'POST /proposals/public/:id/accept',
  'GET /health'
]

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  const startTime = Date.now()
  
  try {
    // Parse the path
    const basePath = '/.netlify/functions/api'
    const fullPath = event.path.replace(basePath, '') || '/'
    const method = event.httpMethod
    
    // Health check endpoint
    if (fullPath === '/health' || fullPath === '/') {
      return response(200, { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      })
    }

    // Parse path segments: /seo/sites/123 → ['seo', 'sites', '123']
    const segments = fullPath.split('/').filter(Boolean)
    const moduleKey = segments[0]
    const subPath = '/' + segments.slice(1).join('/')
    
    // Find route module
    const routeModule = ROUTE_MODULES[moduleKey]
    if (!routeModule) {
      return response(404, { error: `Unknown route: ${moduleKey}` })
    }

    // Build route key for matching
    const routeKey = `${method} ${subPath}`
    
    // Check if route requires authentication
    const isPublicRoute = PUBLIC_ROUTES.some(route => {
      const pattern = route.replace(/:[\w]+/g, '[^/]+')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(`${method} /${moduleKey}${subPath}`)
    })

    // Create shared context
    const ctx = {
      event,
      method,
      path: fullPath,
      subPath,
      segments,
      query: event.queryStringParameters || {},
      body: parseBody(event.body),
      headers: event.headers,
      supabase: createSupabaseAdmin(),
      user: null,
      contact: null,
      organization: null,
      orgId: event.headers['x-organization-id'] || null
    }

    // Authenticate unless public route
    if (!isPublicRoute) {
      const authResult = await getAuthenticatedUser(event)
      if (authResult.error || !authResult.contact) {
        return response(401, { error: 'Authentication required' })
      }
      ctx.user = authResult.user
      ctx.contact = authResult.contact
      ctx.organization = authResult.organization
      ctx.orgId = authResult.organization?.id || ctx.orgId
    }

    // Route to handler
    const result = await routeModule.handle(ctx)
    
    // Log request
    const duration = Date.now() - startTime
    console.log(`[API] ${method} ${fullPath} → ${result.statusCode} (${duration}ms)`)
    
    return {
      ...result,
      headers: { ...CORS_HEADERS, ...result.headers }
    }

  } catch (error) {
    console.error('[API] Error:', error)
    return response(500, { 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseBody(body) {
  if (!body) return {}
  try {
    return JSON.parse(body)
  } catch {
    return {}
  }
}

export function response(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: JSON.stringify(data)
  }
}

// Export for use in route modules
export { CORS_HEADERS }
