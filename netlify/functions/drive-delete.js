import { google } from 'googleapis'
import { getAuthenticatedUser } from './utils/supabase.js'

// Get Google Drive client using Service Account
function getDriveClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}')
  
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Google Service Account not configured. Please add GOOGLE_SERVICE_ACCOUNT_KEY.')
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
    'Access-Control-Allow-Methods': 'DELETE, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  
  try {
    const { fileId, permanent } = JSON.parse(event.body)
    
    if (!fileId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fileId' }) }
    }
    
    const drive = getDriveClient()
    
    if (permanent) {
      // Permanently delete
      await drive.files.delete({ fileId, supportsAllDrives: true })
    } else {
      // Move to trash
      await drive.files.update({
        fileId,
        requestBody: { trashed: true },
        supportsAllDrives: true
      })
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: permanent ? 'File permanently deleted' : 'File moved to trash'
      })
    }
  } catch (error) {
    console.error('Drive delete error:', error)
    
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
      body: JSON.stringify({ error: error.message || 'Failed to delete file' })
    }
  }
}
