import { google } from 'googleapis'
import { Readable } from 'stream'
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
    const { filename, mimeType, base64Data, folderId } = JSON.parse(event.body)
    
    if (!filename || !base64Data) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing filename or file data' }) }
    }
    
    const drive = await getDriveClient()
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root'
    const targetFolderId = folderId || rootFolderId
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Create readable stream from buffer
    const stream = new Readable()
    stream.push(buffer)
    stream.push(null)
    
    // File metadata
    const fileMetadata = {
      name: filename,
      parents: [targetFolderId]
    }
    
    // Upload file
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: mimeType || 'application/octet-stream',
        body: stream
      },
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink',
      supportsAllDrives: true
    })
    
    const file = response.data
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        file: {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          isFolder: false,
          size: file.size ? parseInt(file.size) : buffer.length,
          createdAt: file.createdTime,
          modifiedAt: file.modifiedTime,
          webViewLink: file.webViewLink,
          downloadLink: file.webContentLink,
          iconLink: file.iconLink,
          thumbnailLink: file.thumbnailLink
        }
      })
    }
  } catch (error) {
    console.error('Drive upload error:', error)
    
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
      body: JSON.stringify({ error: error.message || 'Failed to upload file' })
    }
  }
}
