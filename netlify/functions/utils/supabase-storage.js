// ========================================
// SUPABASE STORAGE UTILITIES
// Helper functions for file upload/download in Netlify Functions
// ========================================

import { createClient } from '@supabase/supabase-js'

/**
 * Create Supabase client with admin privileges (service role)
 * Use this in Netlify Functions for bypassing RLS when needed
 */
export function createStorageAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Upload file to Supabase Storage
 * 
 * @param {Object} options
 * @param {string} options.bucket - Bucket name (proposals, files, audits, public)
 * @param {string} options.path - File path within bucket (e.g., "contact_id/filename.pdf")
 * @param {Buffer|Blob|File} options.file - File data
 * @param {string} options.contentType - MIME type (e.g., "application/pdf")
 * @param {boolean} options.upsert - Overwrite if exists (default: false)
 * @returns {Promise<{data, error}>}
 */
export async function uploadFile({ bucket, path, file, contentType, upsert = false }) {
  const supabase = createStorageAdmin()

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert,
      cacheControl: '3600' // Cache for 1 hour
    })

  if (error) {
    console.error('Storage upload error:', error)
    return { data: null, error }
  }

  // Get public URL (works for private buckets too with signed URLs)
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return {
    data: {
      path: data.path,
      fullPath: data.fullPath,
      publicUrl: urlData.publicUrl
    },
    error: null
  }
}

/**
 * Download file from Supabase Storage
 * 
 * @param {string} bucket - Bucket name
 * @param {string} path - File path within bucket
 * @returns {Promise<{data: Blob, error}>}
 */
export async function downloadFile(bucket, path) {
  const supabase = createStorageAdmin()

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path)

  if (error) {
    console.error('Storage download error:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Delete file from Supabase Storage
 * 
 * @param {string} bucket - Bucket name
 * @param {string} path - File path within bucket
 * @returns {Promise<{data, error}>}
 */
export async function deleteFile(bucket, path) {
  const supabase = createStorageAdmin()

  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    console.error('Storage delete error:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get signed URL for private file access (expires in 1 hour by default)
 * 
 * @param {string} bucket - Bucket name
 * @param {string} path - File path within bucket
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise<{data: {signedUrl}, error}>}
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const supabase = createStorageAdmin()

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error('Signed URL error:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * List files in a bucket folder
 * 
 * @param {string} bucket - Bucket name
 * @param {string} folder - Folder path (optional)
 * @returns {Promise<{data: Array, error}>}
 */
export async function listFiles(bucket, folder = '') {
  const supabase = createStorageAdmin()

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    })

  if (error) {
    console.error('Storage list error:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Move/rename file in storage
 * 
 * @param {string} bucket - Bucket name
 * @param {string} fromPath - Current file path
 * @param {string} toPath - New file path
 * @returns {Promise<{data, error}>}
 */
export async function moveFile(bucket, fromPath, toPath) {
  const supabase = createStorageAdmin()

  const { data, error } = await supabase.storage
    .from(bucket)
    .move(fromPath, toPath)

  if (error) {
    console.error('Storage move error:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Generate storage path for contact files
 * Format: {contactId}/{category}/{timestamp}-{filename}
 * 
 * @param {string} contactId - Contact UUID
 * @param {string} filename - Original filename
 * @param {string} category - File category (optional)
 * @returns {string} Storage path
 */
export function generateContactFilePath(contactId, filename, category = 'general') {
  const timestamp = Date.now()
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${contactId}/${category}/${timestamp}-${sanitized}`
}

/**
 * Generate storage path for proposal PDFs
 * Format: {contactId}/{proposalSlug}-signed.pdf
 * 
 * @param {string} contactId - Contact UUID
 * @param {string} proposalSlug - Proposal slug
 * @returns {string} Storage path
 */
export function generateProposalPdfPath(contactId, proposalSlug) {
  return `${contactId}/${proposalSlug}-signed.pdf`
}

/**
 * Generate storage path for audit reports
 * Format: {contactId}/{auditId}/report.{ext}
 * 
 * @param {string} contactId - Contact UUID
 * @param {string} auditId - Audit UUID
 * @param {string} extension - File extension (html or pdf)
 * @returns {string} Storage path
 */
export function generateAuditReportPath(contactId, auditId, extension = 'html') {
  return `${contactId}/${auditId}/report.${extension}`
}
