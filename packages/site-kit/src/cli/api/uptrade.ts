/**
 * Uptrade API Client for CLI
 * 
 * Handles authentication and API calls to Portal API
 */

import open from 'open'
import http from 'http'
import { URL } from 'url'

// ============================================
// Types
// ============================================

export interface Organization {
  id: string
  name: string
  slug: string
}

export interface Project {
  id: string
  name: string
  domain: string
  org_id: string
}

export interface AuthResult {
  accessToken: string
  userId: string
  email: string
}

// ============================================
// Configuration
// ============================================

const PORTAL_URL = process.env.UPTRADE_PORTAL_URL || 'https://portal.uptrademedia.com'
const API_URL = process.env.UPTRADE_API_URL || 'https://api.uptrademedia.com'

// ============================================
// OAuth Flow
// ============================================

export async function authenticateWithUptrade(): Promise<AuthResult> {
  return new Promise((resolve, reject) => {
    // Create local server to receive OAuth callback
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url?.startsWith('/callback')) {
          res.writeHead(404)
          res.end('Not found')
          return
        }

        const url = new URL(req.url, `http://localhost:${port}`)
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(errorHtml('Authentication failed', error))
          reject(new Error(error))
          server.close()
          return
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(errorHtml('Missing code', 'No authorization code received'))
          reject(new Error('No code received'))
          server.close()
          return
        }

        // Exchange code for token
        const tokenResponse = await fetch(`${API_URL}/auth/cli-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirect_uri: `http://localhost:${port}/callback` })
        })

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange code for token')
        }

        const { access_token, user_id, email } = await tokenResponse.json()

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(successHtml())
        
        resolve({
          accessToken: access_token,
          userId: user_id,
          email: email
        })
        
        server.close()
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end(errorHtml('Server error', (err as Error).message))
        reject(err)
        server.close()
      }
    })

    // Find available port
    let port = 8765
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        port++
        server.listen(port)
      }
    })

    server.listen(port, () => {
      const authUrl = `${PORTAL_URL}/auth/cli?redirect_uri=${encodeURIComponent(`http://localhost:${port}/callback`)}`
      
      console.log('\n  Opening browser for authentication...')
      console.log(`  If browser doesn't open, visit: ${authUrl}\n`)
      
      open(authUrl).catch(() => {
        console.log('  Could not open browser automatically.')
      })
    })

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close()
      reject(new Error('Authentication timed out'))
    }, 5 * 60 * 1000)
  })
}

// ============================================
// API Token Authentication (alternative)
// ============================================

export async function authenticateWithApiKey(apiKey: string): Promise<AuthResult> {
  const response = await fetch(`${API_URL}/auth/verify-api-key`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })

  if (!response.ok) {
    throw new Error('Invalid API key')
  }

  const { user_id, email } = await response.json()

  return {
    accessToken: apiKey,
    userId: user_id,
    email: email
  }
}

// ============================================
// Organization & Project APIs
// ============================================

export async function fetchOrganizations(accessToken: string): Promise<Organization[]> {
  const response = await fetch(`${API_URL}/organizations`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch organizations')
  }

  return response.json()
}

export async function fetchProjects(accessToken: string, orgId: string): Promise<Project[]> {
  const response = await fetch(`${API_URL}/organizations/${orgId}/projects`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }

  return response.json()
}

export async function createProject(
  accessToken: string, 
  orgId: string, 
  data: { name: string; domain: string }
): Promise<Project> {
  const response = await fetch(`${API_URL}/organizations/${orgId}/projects`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error('Failed to create project')
  }

  return response.json()
}

export async function generateApiKey(accessToken: string, projectId: string): Promise<string> {
  const response = await fetch(`${API_URL}/projects/${projectId}/api-keys`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'Site-Kit Setup' })
  })

  if (!response.ok) {
    throw new Error('Failed to generate API key')
  }

  const { api_key } = await response.json()
  return api_key
}

// ============================================
// Config Storage
// ============================================

export async function saveCredentials(credentials: AuthResult): Promise<void> {
  const configDir = await getConfigDir()
  const configPath = `${configDir}/credentials.json`
  
  const { default: fs } = await import('fs/promises')
  await fs.mkdir(configDir, { recursive: true })
  await fs.writeFile(configPath, JSON.stringify(credentials, null, 2), 'utf-8')
}

export async function loadCredentials(): Promise<AuthResult | null> {
  try {
    const configDir = await getConfigDir()
    const configPath = `${configDir}/credentials.json`
    
    const { default: fs } = await import('fs/promises')
    const content = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function getConfigDir(): Promise<string> {
  const { homedir } = await import('os')
  return `${homedir()}/.uptrade`
}

// ============================================
// HTML Templates
// ============================================

function successHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Uptrade Setup - Authenticated</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 3rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem; }
    p { color: rgba(255, 255, 255, 0.7); margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Authenticated!</h1>
    <p>You can close this window and return to your terminal.</p>
  </div>
</body>
</html>`
}

function errorHtml(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Uptrade Setup - Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #2e1a1a 0%, #1a0f0f 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 3rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 1rem;
      border: 1px solid rgba(255, 100, 100, 0.2);
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
