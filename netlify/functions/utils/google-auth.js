// netlify/functions/utils/google-auth.js
// Google Service Account authentication for Search Console API
import { GoogleAuth } from 'google-auth-library'
import { getGoogleServiceAccountCredentials } from './supabase.js'

let authClient = null
let cachedCredentials = null

/**
 * Get authenticated Google client for Search Console API
 * Uses service account credentials from Supabase secrets
 */
export async function getGoogleAuthClient() {
  if (authClient) {
    return authClient
  }

  // Get credentials from Supabase (or env var fallback)
  const credentials = await getGoogleServiceAccountCredentials()
  
  if (!credentials?.client_email || !credentials?.private_key) {
    throw new Error('Missing Google service account credentials. Add GOOGLE_SERVICE_ACCOUNT_KEY to Supabase secrets.')
  }
  
  cachedCredentials = credentials

  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters', // For URL Inspection API
    ],
  })

  authClient = await auth.getClient()
  return authClient
}

/**
 * Get access token for API requests
 */
export async function getAccessToken() {
  const client = await getGoogleAuthClient()
  const { token } = await client.getAccessToken()
  return token
}

/**
 * Make authenticated request to Google API
 */
export async function googleApiRequest(url, options = {}) {
  const token = await getAccessToken()
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google API error (${response.status}): ${error}`)
  }

  return response.json()
}
