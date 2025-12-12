// netlify/functions/files-upload.js
// File upload function using Supabase Storage
import crypto from 'crypto'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Authenticate user
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      filename, 
      mimeType, 
      fileSize, 
      base64Data, 
      projectId, 
      category = 'general', 
      isPublic = false 
    } = body

    if (!filename || !base64Data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'filename and base64Data are required' })
      }
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    const actualSize = fileSize || (base64Data.length * 0.75)
    if (actualSize > maxSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File size exceeds 10MB limit' })
      }
    }

    // Validate mime type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-zip-compressed',
      'text/plain', 'text/csv'
    ]
    
    if (mimeType && !allowedTypes.some(t => mimeType.startsWith(t.split('/')[0]) || mimeType === t)) {
      console.warn('[files-upload] Potentially unsupported mime type:', mimeType)
      // Allow anyway but log warning
    }

    // Generate unique file path
    const fileId = crypto.randomUUID()
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100)
    const storagePath = `${category}/${fileId}.${ext}`

    console.log('[files-upload] Uploading:', { filename: sanitizedFilename, category, storagePath })

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(base64Data, 'base64')

    // Ensure bucket exists (create if needed)
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'files')
    
    if (!bucketExists) {
      console.log('[files-upload] Creating files bucket...')
      const { error: createError } = await supabase.storage.createBucket('files', {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      })
      if (createError && !createError.message?.includes('already exists')) {
        console.error('[files-upload] Failed to create bucket:', createError)
      }
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      console.error('[files-upload] Storage error:', uploadError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to upload file to storage', details: uploadError.message })
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('files')
      .getPublicUrl(storagePath)

    const publicUrl = urlData?.publicUrl

    // Save file metadata to database (actual schema from Supabase)
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        contact_id: contact.id,
        project_id: projectId || null,
        filename: sanitizedFilename,
        storage_path: storagePath,
        mime_type: mimeType || 'application/octet-stream',
        file_size: actualSize,
        category,
        is_public: isPublic,
        uploaded_by: contact.id,
        storage_type: 'supabase'
      })
      .select()
      .single()

    if (dbError) {
      console.error('[files-upload] Database error:', dbError)
      // Try to clean up uploaded file
      await supabase.storage.from('files').remove([storagePath])
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save file metadata', details: dbError.message })
      }
    }

    console.log('[files-upload] Success:', fileId)

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        file: {
          id: fileRecord.id,
          filename: fileRecord.filename,
          storagePath: fileRecord.storage_path,
          mimeType: fileRecord.mime_type,
          fileSize: fileRecord.file_size,
          category: fileRecord.category,
          isPublic: fileRecord.is_public,
          url: publicUrl,
          uploadedAt: fileRecord.uploaded_at,
          storageType: fileRecord.storage_type
        },
        url: publicUrl
      })
    }

  } catch (error) {
    console.error('[files-upload] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to upload file', details: error.message })
    }
  }
}
