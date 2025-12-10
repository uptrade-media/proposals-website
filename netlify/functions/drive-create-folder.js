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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  
  try {
    const { name, parentId } = JSON.parse(event.body)
    
    if (!name) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing folder name' }) }
    }
    
    const drive = await getDriveClient()
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root'
    const targetParentId = parentId || rootFolderId
    
    const fileMetadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [targetParentId]
    }
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, mimeType, createdTime, modifiedTime, webViewLink',
      supportsAllDrives: true
    })
    
    const folder = response.data
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        folder: {
          id: folder.id,
          name: folder.name,
          mimeType: folder.mimeType,
          isFolder: true,
          createdAt: folder.createdTime,
          modifiedAt: folder.modifiedTime,
          webViewLink: folder.webViewLink
        }
      })
    }
  } catch (error) {
    console.error('Drive create folder error:', error)
    
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
      body: JSON.stringify({ error: error.message || 'Failed to create folder' })
    }
  }
}
