/**
 * Setup Wizard API Handlers
 * 
 * These are Next.js API route handlers that the SetupWizard component calls.
 * They run on the server and have access to fs for code generation.
 * 
 * Usage: Copy these to your app/_uptrade/api/ folder
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================
// Configuration
// ============================================

const PORTAL_URL = process.env.UPTRADE_PORTAL_URL || 'https://portal.uptrademedia.com'
const API_URL = process.env.UPTRADE_API_URL || 'https://api.uptrademedia.com'

// In-memory session store (for dev server only)
let authSession: {
  accessToken?: string
  userId?: string
  email?: string
  pendingCode?: string
} = {}

// ============================================
// Status Handler
// ============================================

export async function handleStatus(): Promise<NextResponse> {
  const configured = !!(
    process.env.NEXT_PUBLIC_UPTRADE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )

  return NextResponse.json({
    configured,
    authenticated: !!authSession.accessToken,
    email: authSession.email
  })
}

// ============================================
// Auth Handlers
// ============================================

export async function handleAuthStart(): Promise<NextResponse> {
  const state = Math.random().toString(36).substring(7)
  const redirectUri = 'http://localhost:3000/_uptrade/api/auth/callback'
  
  const authUrl = `${PORTAL_URL}/auth/cli?` + new URLSearchParams({
    redirect_uri: redirectUri,
    state
  })

  return NextResponse.json({ authUrl, state })
}

export async function handleAuthCallback(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(errorHtml('Authentication Failed', error), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (!code) {
    return new NextResponse(errorHtml('Missing Code', 'No authorization code received'), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch(`${API_URL}/auth/cli-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirect_uri: 'http://localhost:3000/_uptrade/api/auth/callback'
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const { access_token, user_id, email } = await tokenResponse.json()
    
    authSession = {
      accessToken: access_token,
      userId: user_id,
      email
    }

    return new NextResponse(successHtml(), {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (err) {
    return new NextResponse(errorHtml('Token Exchange Failed', (err as Error).message), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

export async function handleAuthStatus(): Promise<NextResponse> {
  return NextResponse.json({
    authenticated: !!authSession.accessToken,
    email: authSession.email
  })
}

export async function handleApiKeyAuth(req: NextRequest): Promise<NextResponse> {
  const { apiKey } = await req.json()

  try {
    const response = await fetch(`${API_URL}/auth/verify-api-key`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const { user_id, email } = await response.json()
    
    authSession = {
      accessToken: apiKey,
      userId: user_id,
      email
    }

    return NextResponse.json({ email })
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

// ============================================
// Organization & Project Handlers
// ============================================

export async function handleGetOrganizations(): Promise<NextResponse> {
  if (!authSession.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const response = await fetch(`${API_URL}/organizations`, {
      headers: { 'Authorization': `Bearer ${authSession.accessToken}` }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch organizations')
    }

    const organizations = await response.json()
    return NextResponse.json({ organizations })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function handleCreateProject(req: NextRequest): Promise<NextResponse> {
  if (!authSession.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { orgId, name, domain } = await req.json()

  try {
    const response = await fetch(`${API_URL}/organizations/${orgId}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authSession.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, domain })
    })

    if (!response.ok) {
      throw new Error('Failed to create project')
    }

    const project = await response.json()
    return NextResponse.json(project)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// ============================================
// Scan Handler
// ============================================

export async function handleScan(): Promise<NextResponse> {
  const { scanCodebase } = await import('../cli/scanner')
  
  try {
    const results = await scanCodebase(process.cwd())
    
    return NextResponse.json({
      forms: results.forms.map(f => ({
        type: 'form',
        form_library: f.formLibrary,
        file: f.filePath,
        component_name: f.componentName,
        line: f.startLine,
        fields: f.fields,
        complexity: f.complexity,
        suggested_action: f.suggestedAction,
        has_validation: f.hasValidation,
        submits_to: f.submitsTo,
      })),
      widgets: results.widgets.map(w => ({
        type: 'widget',
        widget_type: w.widgetType,
        file: w.filePath,
        line: w.startLine,
      })),
      metadata: results.metadata.map(m => ({
        type: 'metadata',
        metadata_type: m.type,
        file: m.filePath,
        title: m.title,
        description: m.description,
      })),
      sitemaps: results.sitemaps.map(s => ({
        type: 'sitemap',
        sitemap_type: s.type,
        file: s.filePath,
        line: s.startLine,
        generator: s.generator,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// ============================================
// Migrate Handler
// ============================================

export async function handleMigrate(req: NextRequest): Promise<NextResponse> {
  if (!authSession.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { item, projectId } = await req.json()
  const { migrateFiles } = await import('../cli/migrator')

  try {
    // Wrap item into ScanResults format
    const scanResults = { forms: [item], metadata: [], widgets: [], sitemaps: [] }
    const options = { projectId, apiKey: authSession.accessToken || '' }
    await migrateFiles(scanResults, options)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// ============================================
// Configure Handler
// ============================================

export async function handleConfigure(req: NextRequest): Promise<NextResponse> {
  if (!authSession.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { projectId } = await req.json()
  const { generateEnvFile, generateProvider } = await import('../cli/generators')

  try {
    // Get Supabase config from API
    const configResponse = await fetch(`${API_URL}/projects/${projectId}/config`, {
      headers: { 'Authorization': `Bearer ${authSession.accessToken}` }
    })

    if (!configResponse.ok) {
      throw new Error('Failed to fetch project config')
    }

    const config = await configResponse.json()

    // Generate API key
    const keyResponse = await fetch(`${API_URL}/projects/${projectId}/api-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authSession.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Site-Kit Setup' })
    })

    let apiKey = 'ut_xxx'
    if (keyResponse.ok) {
      const keyData = await keyResponse.json()
      // Portal API returns { key: string, apiKey: {...} }
      apiKey = keyData.key
    }

    // Generate env file
    await generateEnvFile({
      projectId,
      supabaseUrl: config.supabase_url,
      supabaseAnonKey: config.supabase_anon_key,
      apiKey
    })

    // Generate provider in layout
    await generateProvider({ projectId })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// ============================================
// Self-Destruct Handler
// ============================================

export async function handleSelfDestruct(): Promise<NextResponse> {
  const { selfDestruct } = await import('../cli/generators')

  try {
    await selfDestruct()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// ============================================
// HTML Templates
// ============================================

function successHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Uptrade - Authenticated</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; justify-content: center; align-items: center;
      height: 100vh; margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
      color: white;
    }
    .container {
      text-align: center; padding: 3rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 1rem; border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem; }
    p { color: rgba(255, 255, 255, 0.7); margin: 0; }
  </style>
  <script>setTimeout(() => window.close(), 2000)</script>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Authenticated!</h1>
    <p>This window will close automatically...</p>
  </div>
</body>
</html>`
}

function errorHtml(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Uptrade - Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; justify-content: center; align-items: center;
      height: 100vh; margin: 0;
      background: linear-gradient(135deg, #2e1a1a 0%, #1a0f0f 100%);
      color: white;
    }
    .container {
      text-align: center; padding: 3rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 1rem; border: 1px solid rgba(255, 100, 100, 0.2);
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem; color: #ff6b6b; }
    p { color: rgba(255, 255, 255, 0.7); margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✗</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`
}

// ============================================
// Unified Route Handler
// ============================================

export async function handleRequest(
  req: NextRequest,
  route: string
): Promise<NextResponse> {
  switch (route) {
    case 'status':
      return handleStatus()
    case 'auth/start':
      return handleAuthStart()
    case 'auth/callback':
      return handleAuthCallback(req)
    case 'auth/status':
      return handleAuthStatus()
    case 'auth/apikey':
      return handleApiKeyAuth(req)
    case 'organizations':
      return handleGetOrganizations()
    case 'projects':
      return handleCreateProject(req)
    case 'scan':
      return handleScan()
    case 'migrate':
      return handleMigrate(req)
    case 'configure':
      return handleConfigure(req)
    case 'self-destruct':
      return handleSelfDestruct()
    default:
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
