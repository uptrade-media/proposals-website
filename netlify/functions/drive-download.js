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
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
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
    const fileId = params.get('fileId')
    
    if (!fileId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fileId' }) }
    }
    
    const drive = await getDriveClient()
    
    // Get file metadata first
    const fileMeta = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
      supportsAllDrives: true
    })
    
    // Check if it's a Google Docs file (needs export)
    const googleDocsMimeTypes = {
      'application/vnd.google-apps.document': 'application/pdf',
      'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.google-apps.presentation': 'application/pdf',
      'application/vnd.google-apps.drawing': 'image/png'
    }
    
    const exportMimeType = googleDocsMimeTypes[fileMeta.data.mimeType]
    
    let response
    if (exportMimeType) {
      // Export Google Docs files
      response = await drive.files.export({
        fileId,
        mimeType: exportMimeType
      }, { responseType: 'arraybuffer' })
    } else {
      // Download regular files
      response = await drive.files.get({
        fileId,
        alt: 'media',
        supportsAllDrives: true
      }, { responseType: 'arraybuffer' })
    }
    
    const base64 = Buffer.from(response.data).toString('base64')
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        filename: fileMeta.data.name,
        mimeType: exportMimeType || fileMeta.data.mimeType,
        data: base64
      })
    }
  } catch (error) {
    console.error('Drive download error:', error)
    
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
      body: JSON.stringify({ error: error.message || 'Failed to download file' })
    }
  }
}
