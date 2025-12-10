import { google } from 'googleapis'
import { getAuthenticatedUser, getGoogleServiceAccountCredentials } from './utils/supabase.js'

// Get Google Drive client using Service Account
async function getDriveClient() {
  const credentials = await getGoogleServiceAccountCredentials()
  
  if (!credentials?.client_email || !credentials?.private_key) {
    throw new Error('Google Service Account not configured. Add credentials to Supabase app_secrets table.')
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  })
  
  return google.drive({ version: 'v3', auth })
}

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  
  try {
    const params = new URLSearchParams(event.rawQuery || '')
    // Default to shared Drive folder from env, or 'root' for service account's own drive
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root'
    const folderId = params.get('folderId') || rootFolderId
    const pageToken = params.get('pageToken')
    const pageSize = parseInt(params.get('pageSize') || '50')
    const query = params.get('query')
    
    const drive = await getDriveClient()
    
    // Build query
    let q = `'${folderId}' in parents and trashed = false`
    if (query) {
      q = `name contains '${query}' and trashed = false`
    }
    
    const response = await drive.files.list({
      q,
      pageSize,
      pageToken: pageToken || undefined,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, owners, shared)',
      orderBy: 'folder,name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    })
    
    // Separate folders and files
    const items = response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      size: file.size ? parseInt(file.size) : null,
      createdAt: file.createdTime,
      modifiedAt: file.modifiedTime,
      webViewLink: file.webViewLink,
      downloadLink: file.webContentLink,
      iconLink: file.iconLink,
      thumbnailLink: file.thumbnailLink,
      parents: file.parents,
      owner: file.owners?.[0]?.displayName,
      shared: file.shared
    }))
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        files: items,
        nextPageToken: response.data.nextPageToken,
        currentFolder: folderId,
        rootFolderId
      })
    }
  } catch (error) {
    console.error('Drive list error:', error)
    
    // Check for configuration error
    if (error.message?.includes('Service Account')) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: error.message,
          needsConfig: true
        })
      }
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to list files' })
    }
  }
}
