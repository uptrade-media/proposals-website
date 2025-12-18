// netlify/functions/routes/files.js
// ═══════════════════════════════════════════════════════════════════════════════
// Files Routes - Upload, download, Netlify Blobs
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'
import { getStore } from '@netlify/blobs'

export async function handle(ctx) {
  const { method, segments, supabase, query, body, contact, orgId } = ctx
  const [, resource, id, action] = segments
  
  switch (resource) {
    case 'upload':
      if (method === 'POST') return await uploadFile(ctx)
      break
    case 'download':
      if (method === 'GET') return await downloadFile(ctx, id)
      break
    case 'list':
      if (method === 'GET') return await listFiles(ctx)
      break
    default:
      if (id) {
        if (action === 'download') return await downloadFile(ctx, id)
        if (method === 'GET') return await getFile(ctx, id)
        if (method === 'DELETE') return await deleteFile(ctx, id)
        if (method === 'PUT' || method === 'PATCH') return await updateFile(ctx, id)
      } else if (method === 'GET') {
        return await listFiles(ctx)
      } else if (method === 'POST') {
        return await uploadFile(ctx)
      }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function uploadFile(ctx) {
  const { body, supabase, contact, orgId, event } = ctx
  
  // Check content type for multipart
  const contentType = event.headers['content-type'] || ''
  
  if (contentType.includes('multipart/form-data')) {
    return await handleMultipartUpload(ctx)
  }
  
  // Base64 upload
  const { filename, content, category = 'general', projectId, contactId } = body
  
  if (!filename || !content) {
    return response(400, { error: 'filename and content (base64) are required' })
  }
  
  // Validate file size (10MB limit)
  const buffer = Buffer.from(content, 'base64')
  const MAX_SIZE = 10 * 1024 * 1024
  
  if (buffer.length > MAX_SIZE) {
    return response(413, { error: 'File too large. Maximum size is 10MB' })
  }
  
  // Detect MIME type from extension
  const mimeType = getMimeType(filename)
  
  // Validate file type
  const ALLOWED_TYPES = [
    'image/', 'application/pdf', 'application/zip',
    'application/msword', 'application/vnd.openxmlformats',
    'text/', 'application/json'
  ]
  
  if (!ALLOWED_TYPES.some(t => mimeType.startsWith(t))) {
    return response(415, { error: 'File type not allowed' })
  }
  
  // Sanitize filename
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const blobPath = `${category}/${orgId}/${Date.now()}-${safeFilename}`
  
  try {
    // Store in Netlify Blobs
    const store = getStore('uploads')
    await store.set(blobPath, buffer, {
      metadata: {
        originalName: filename,
        mimeType,
        uploadedBy: contact.id,
        orgId
      }
    })
    
    // Save metadata to database
    const { data: file, error } = await supabase
      .from('files')
      .insert({
        filename: safeFilename,
        original_name: filename,
        blob_path: blobPath,
        mime_type: mimeType,
        size: buffer.length,
        category,
        project_id: projectId,
        contact_id: contactId || contact.id,
        org_id: orgId,
        uploaded_by: contact.id
      })
      .select()
      .single()
    
    if (error) {
      // Cleanup blob if DB fails
      await store.delete(blobPath)
      return response(500, { error: error.message })
    }
    
    return response(201, { file })
  } catch (err) {
    return response(500, { error: 'Failed to upload file: ' + err.message })
  }
}

async function handleMultipartUpload(ctx) {
  // For multipart, we'd need to parse the body differently
  // This is a placeholder - actual implementation would use a library like busboy
  return response(501, { error: 'Multipart upload not yet implemented. Use base64 encoding.' })
}

async function listFiles(ctx) {
  const { supabase, query, orgId, contact } = ctx
  const { category, projectId, contactId, limit = 50 } = query
  
  let q = supabase
    .from('files')
    .select('*, uploaded_by_user:contacts!uploaded_by(id, name, avatar)')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (orgId) q = q.eq('org_id', orgId)
  if (category) q = q.eq('category', category)
  if (projectId) q = q.eq('project_id', projectId)
  if (contactId) q = q.eq('contact_id', contactId)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { files: data })
}

async function getFile(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('files')
    .select('*, uploaded_by_user:contacts!uploaded_by(id, name)')
    .eq('id', id)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { file: data })
}

async function downloadFile(ctx, id) {
  const { supabase } = ctx
  
  // Get file metadata
  const { data: file, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !file) {
    return response(404, { error: 'File not found' })
  }
  
  try {
    const store = getStore('uploads')
    const blob = await store.get(file.blob_path, { type: 'arrayBuffer' })
    
    if (!blob) {
      return response(404, { error: 'File content not found' })
    }
    
    // Update download count
    await supabase
      .from('files')
      .update({ 
        download_count: (file.download_count || 0) + 1,
        last_downloaded_at: new Date().toISOString()
      })
      .eq('id', id)
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.original_name || file.filename}"`,
        'Content-Length': file.size?.toString()
      },
      body: Buffer.from(blob).toString('base64'),
      isBase64Encoded: true
    }
  } catch (err) {
    return response(500, { error: 'Failed to download file: ' + err.message })
  }
}

async function updateFile(ctx, id) {
  const { supabase, body } = ctx
  
  // Only allow updating metadata, not the file content
  const { filename, category, projectId } = body
  
  const { data, error } = await supabase
    .from('files')
    .update({ 
      filename,
      category,
      project_id: projectId,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { file: data })
}

async function deleteFile(ctx, id) {
  const { supabase } = ctx
  
  // Get file to find blob path
  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('blob_path')
    .eq('id', id)
    .single()
  
  if (fetchError || !file) {
    return response(404, { error: 'File not found' })
  }
  
  // Delete from Blobs
  try {
    const store = getStore('uploads')
    await store.delete(file.blob_path)
  } catch (err) {
    console.error('Failed to delete blob:', err)
    // Continue anyway to delete DB record
  }
  
  // Delete from database
  const { error } = await supabase.from('files').delete().eq('id', id)
  if (error) return response(500, { error: error.message })
  
  return response(200, { success: true })
}

function getMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes = {
    // Images
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    txt: 'text/plain', csv: 'text/csv', json: 'application/json',
    html: 'text/html', css: 'text/css', js: 'text/javascript',
    // Archives
    zip: 'application/zip', rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed', gz: 'application/gzip'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
