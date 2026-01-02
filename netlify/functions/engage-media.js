/**
 * Engage Media Upload
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Handles media uploads for Engage elements (images/videos).
 * - Uploads to Supabase Storage
 * - Optimizes images with sharp (if available)
 * - Returns CDN URL for media
 * 
 * Endpoints:
 *   GET  - List media for a project
 *   POST - Upload new media
 *   DELETE - Remove media
 */

import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const BUCKET_NAME = 'engage-media'

export async function handler(event) {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    switch (event.httpMethod) {
      case 'GET':
        return await listMedia(event, supabase)
      case 'POST':
        return await uploadMedia(event, supabase)
      case 'DELETE':
        return await deleteMedia(event, supabase)
      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }
  } catch (error) {
    console.error('Media handler error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIST MEDIA
// ═══════════════════════════════════════════════════════════════════════════════

async function listMedia(event, supabase) {
  const { projectId } = event.queryStringParameters || {}

  if (!projectId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing projectId' })
    }
  }

  // Get media from database
  const { data: media, error } = await supabase
    .from('engage_media')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ media: media || [] })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD MEDIA
// ═══════════════════════════════════════════════════════════════════════════════

async function uploadMedia(event, supabase) {
  const body = JSON.parse(event.body || '{}')
  const { projectId, filename, mimeType, data, size } = body

  if (!projectId || !filename || !data) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields: projectId, filename, data' })
    }
  }

  // Validate file size
  const fileBuffer = Buffer.from(data, 'base64')
  if (fileBuffer.length > MAX_FILE_SIZE) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'File too large. Maximum size is 10MB.' })
    }
  }

  // Validate project exists
  const { data: project } = await supabase
    .from('projects')
    .select('id, org_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Project not found' })
    }
  }

  // Generate unique filename
  const ext = filename.split('.').pop()
  const uniqueFilename = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  // Optimize image if possible
  let finalBuffer = fileBuffer
  let finalMimeType = mimeType

  if (mimeType?.startsWith('image/') && mimeType !== 'image/gif') {
    try {
      // Dynamic import sharp if available
      const sharp = await import('sharp').then(m => m.default).catch(() => null)
      
      if (sharp) {
        finalBuffer = await sharp(fileBuffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer()
        finalMimeType = 'image/webp'
      }
    } catch (e) {
      console.log('Image optimization skipped:', e.message)
      // Continue with original buffer
    }
  }

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(uniqueFilename, finalBuffer, {
      contentType: finalMimeType,
      cacheControl: '31536000', // 1 year cache
      upsert: false
    })

  if (uploadError) {
    // If bucket doesn't exist, try to create it
    if (uploadError.message?.includes('not found')) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE
      })
      
      // Retry upload
      const { error: retryError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueFilename, finalBuffer, {
          contentType: finalMimeType,
          cacheControl: '31536000',
          upsert: false
        })
      
      if (retryError) throw retryError
    } else {
      throw uploadError
    }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(uniqueFilename)

  // Determine media type
  const mediaType = mimeType?.startsWith('video/') ? 'video' : 'image'

  // Save to database
  const { data: mediaRecord, error: dbError } = await supabase
    .from('engage_media')
    .insert({
      project_id: projectId,
      org_id: project.org_id,
      name: filename,
      url: publicUrl,
      storage_path: uniqueFilename,
      type: mediaType,
      mime_type: finalMimeType,
      size: finalBuffer.length,
      original_size: size || fileBuffer.length
    })
    .select()
    .single()

  if (dbError) {
    // Clean up uploaded file if DB insert fails
    await supabase.storage.from(BUCKET_NAME).remove([uniqueFilename])
    throw dbError
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      mediaId: mediaRecord.id,
      url: publicUrl,
      type: mediaType,
      size: finalBuffer.length,
      optimized: finalBuffer.length < fileBuffer.length
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE MEDIA
// ═══════════════════════════════════════════════════════════════════════════════

async function deleteMedia(event, supabase) {
  const { mediaId } = event.queryStringParameters || {}

  if (!mediaId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing mediaId' })
    }
  }

  // Get media record
  const { data: media, error: fetchError } = await supabase
    .from('engage_media')
    .select('*')
    .eq('id', mediaId)
    .single()

  if (fetchError || !media) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Media not found' })
    }
  }

  // Delete from storage
  if (media.storage_path) {
    await supabase.storage.from(BUCKET_NAME).remove([media.storage_path])
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('engage_media')
    .delete()
    .eq('id', mediaId)

  if (deleteError) throw deleteError

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true })
  }
}
