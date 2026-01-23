/**
 * ManagedImage - Portal-managed image component
 * 
 * Features:
 * - Fetches images from Portal API via API key (never direct Supabase)
 * - Dev mode: Click to open image picker modal
 * - Supports responsive variants
 * - Automatic focal point handling
 * - Placeholder state for empty slots
 * 
 * @example
 * ```tsx
 * <ManagedImage 
 *   slotId="hero-background"
 *   alt="Hero background image"
 *   className="w-full h-96 object-cover"
 * />
 * ```
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteKit } from '../SiteKitProvider'

export interface ManagedImageData {
  id: string
  slot_id: string
  page_path: string | null
  file_id: string | null
  external_url: string | null
  alt_text: string | null
  title: string | null
  caption: string | null
  focal_point_x: number
  focal_point_y: number
  aspect_ratio: string | null
  public_url?: string
  is_placeholder: boolean
}

export interface ImageFile {
  id: string
  filename: string
  storage_path: string
  mime_type: string
  file_size: number
  folder_path: string | null
  public_url?: string
}

export interface ManagedImageProps {
  /** Unique slot identifier (e.g., 'hero-background', 'about-team-1') */
  slotId: string
  /** Page path for page-specific slots (defaults to current path) */
  pagePath?: string
  /** Fallback alt text if not set in Portal */
  alt?: string
  /** CSS class names */
  className?: string
  /** Image width */
  width?: number | string
  /** Image height */
  height?: number | string
  /** CSS object-fit property */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** Fallback image URL when no image assigned */
  fallback?: string
  /** Custom placeholder component */
  placeholder?: React.ReactNode
  /** Called when image loads */
  onLoad?: () => void
  /** Called on error */
  onError?: (error: Error) => void
  /** Priority loading (Next.js Image optimization) */
  priority?: boolean
  /** Additional styles */
  style?: React.CSSProperties
  /** Enable dev picker even outside dev mode */
  forceDevMode?: boolean
}

// Check if we're in dev mode
const isDevMode = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.search.includes('uptrade_dev=true')
  )
}

export function ManagedImage({
  slotId,
  pagePath,
  alt,
  className = '',
  width,
  height,
  objectFit = 'cover',
  fallback,
  placeholder,
  onLoad,
  onError,
  priority,
  style,
  forceDevMode,
}: ManagedImageProps) {
  const context = useSiteKit()
  const [imageData, setImageData] = useState<ManagedImageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [devMode] = useState(() => forceDevMode || isDevMode())

  // Get current page path if not provided
  const currentPath = pagePath ?? (typeof window !== 'undefined' ? window.location.pathname : '/')

  // Fetch image data from Portal API
  const fetchImage = useCallback(async () => {
    if (!context?.apiKey || !context?.apiUrl) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({ page_path: currentPath })
      const res = await fetch(
        `${context.apiUrl}/public/images/slot/${encodeURIComponent(slotId)}?${params}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': context.apiKey,
          },
        }
      )

      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status}`)
      }

      const data = await res.json()
      setImageData(data.image)
      setError(null)
    } catch (err) {
      console.error('[ManagedImage] Fetch error:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
      onError?.(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [context?.apiKey, context?.apiUrl, slotId, currentPath, onError])

  useEffect(() => {
    fetchImage()
  }, [fetchImage])

  // Calculate object-position from focal point
  const objectPosition = imageData
    ? `${imageData.focal_point_x}% ${imageData.focal_point_y}%`
    : '50% 50%'

  // Get the image URL
  const imageUrl = imageData?.public_url || imageData?.external_url || fallback

  // Handle click in dev mode
  const handleClick = (e: React.MouseEvent) => {
    if (devMode) {
      e.preventDefault()
      e.stopPropagation()
      setShowPicker(true)
    }
  }

  // Render placeholder state
  if (loading) {
    return (
      <div
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{
          width: width ?? '100%',
          height: height ?? 200,
          ...style,
        }}
      />
    )
  }

  // No image assigned - show placeholder or dev picker hint
  if (!imageUrl) {
    if (placeholder) {
      return <>{placeholder}</>
    }

    return (
      <div
        onClick={handleClick}
        className={`
          bg-gray-100 border-2 border-dashed border-gray-300 
          flex items-center justify-center text-gray-400
          ${devMode ? 'cursor-pointer hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50' : ''}
          ${className}
        `}
        style={{
          width: width ?? '100%',
          height: height ?? 200,
          ...style,
        }}
        title={devMode ? `Click to add image for slot: ${slotId}` : undefined}
      >
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {devMode && (
            <p className="text-sm font-medium">Click to add image</p>
          )}
          <p className="text-xs mt-1">{slotId}</p>
        </div>

        {showPicker && (
          <ImagePickerModal
            slotId={slotId}
            pagePath={currentPath}
            config={context}
            onClose={() => setShowPicker(false)}
            onSelect={() => {
              setShowPicker(false)
              fetchImage()
            }}
          />
        )}
      </div>
    )
  }

  // Render the image
  return (
    <div className="relative" style={{ width, height }}>
      <img
        src={imageUrl}
        alt={imageData?.alt_text || alt || ''}
        title={imageData?.title || undefined}
        className={className}
        style={{
          objectFit,
          objectPosition,
          width: width ?? '100%',
          height: height ?? 'auto',
          ...style,
        }}
        onLoad={onLoad}
        onError={() => onError?.(new Error('Image failed to load'))}
        loading={priority ? 'eager' : 'lazy'}
        onClick={handleClick}
      />

      {/* Dev mode overlay */}
      {devMode && (
        <div
          className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100"
          onClick={handleClick}
        >
          <div className="bg-white/90 px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium text-gray-700">
            Edit Image
          </div>
        </div>
      )}

      {showPicker && (
        <ImagePickerModal
          slotId={slotId}
          pagePath={currentPath}
          config={context}
          currentImage={imageData}
          onClose={() => setShowPicker(false)}
          onSelect={() => {
            setShowPicker(false)
            fetchImage()
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// IMAGE PICKER MODAL
// ============================================================================

interface ImagePickerModalProps {
  slotId: string
  pagePath: string
  config: any
  currentImage?: ManagedImageData | null
  onClose: () => void
  onSelect: () => void
}

function ImagePickerModal({
  slotId,
  pagePath,
  config,
  currentImage,
  onClose,
  onSelect,
}: ImagePickerModalProps) {
  const [files, setFiles] = useState<ImageFile[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [currentFolder, setCurrentFolder] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [altText, setAltText] = useState(currentImage?.alt_text || '')

  // Fetch available files
  const fetchFiles = useCallback(async () => {
    if (!config?.apiKey || !config?.apiUrl) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (currentFolder) params.set('folder', currentFolder)
      if (search) params.set('search', search)

      const res = await fetch(
        `${config.apiUrl}/public/images/files?${params}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
          },
        }
      )

      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
        setFolders(data.folders || [])
      }
    } catch (err) {
      console.error('[ImagePicker] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [config?.apiKey, config?.apiUrl, currentFolder, search])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // Select an existing file
  const handleSelectFile = async (file: ImageFile) => {
    if (!config?.apiKey || !config?.apiUrl) return

    try {
      const res = await fetch(
        `${config.apiUrl}/public/images/slot/${encodeURIComponent(slotId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
          },
          body: JSON.stringify({
            page_path: pagePath,
            file_id: file.id,
            alt_text: altText || file.filename,
          }),
        }
      )

      if (res.ok) {
        onSelect()
      }
    } catch (err) {
      console.error('[ImagePicker] Select error:', err)
    }
  }

  // Upload new file
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !config?.apiKey || !config?.apiUrl) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('slot_id', slotId)
      formData.append('page_path', pagePath)
      formData.append('folder', currentFolder || 'Website/Images')
      if (altText) formData.append('alt_text', altText)

      const res = await fetch(`${config.apiUrl}/public/images/upload`, {
        method: 'POST',
        headers: {
          'x-api-key': config.apiKey,
        },
        body: formData,
      })

      if (res.ok) {
        onSelect()
      }
    } catch (err) {
      console.error('[ImagePicker] Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  // Clear the slot
  const handleClear = async () => {
    if (!config?.apiKey || !config?.apiUrl) return

    try {
      const params = new URLSearchParams({ page_path: pagePath })
      await fetch(
        `${config.apiUrl}/public/images/slot/${encodeURIComponent(slotId)}?${params}`,
        {
          method: 'DELETE',
          headers: {
            'x-api-key': config.apiKey,
          },
        }
      )
      onSelect()
    } catch (err) {
      console.error('[ImagePicker] Clear error:', err)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Select Image</h2>
            <p className="text-sm text-gray-500">Slot: {slotId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Upload & Search */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search images..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 text-sm font-medium flex items-center gap-2">
              {uploading ? 'Uploading...' : 'Upload New'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {currentImage?.file_id && (
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm"
              >
                Remove
              </button>
            )}
          </div>

          {/* Alt text input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Alt text for image..."
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Folder navigation */}
          {folders.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setCurrentFolder('')}
                className={`px-3 py-1 text-sm rounded-full ${
                  !currentFolder ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {folders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => setCurrentFolder(folder)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    currentFolder === folder ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {folder}
                </button>
              ))}
            </div>
          )}

          {/* File grid */}
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No images found</p>
              <p className="text-sm mt-1">Upload a new image to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className={`
                    aspect-square rounded-lg overflow-hidden border-2 transition-all
                    hover:border-blue-400 hover:shadow-lg
                    ${currentImage?.file_id === file.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}
                  `}
                >
                  <img
                    src={file.public_url}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManagedImage
