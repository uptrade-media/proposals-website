/**
 * Images API functions
 * 
 * All functions use Portal API with API key authentication.
 * Never makes direct Supabase calls.
 */

import type { ManagedImageData, ImageFile } from './ManagedImage'

export interface ImageApiConfig {
  apiUrl: string
  apiKey: string
}

/**
 * Fetch a managed image for a specific slot
 */
export async function fetchManagedImage(
  config: ImageApiConfig,
  slotId: string,
  pagePath?: string,
): Promise<{ image: ManagedImageData | null; is_placeholder: boolean }> {
  const params = new URLSearchParams()
  if (pagePath) params.set('page_path', pagePath)

  const res = await fetch(
    `${config.apiUrl}/public/images/slot/${encodeURIComponent(slotId)}?${params}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`)
  }

  return res.json()
}

/**
 * Fetch all managed images for the project
 */
export async function fetchManagedImages(
  config: ImageApiConfig,
  options?: {
    pagePath?: string
    category?: string
    includePlaceholders?: boolean
  },
): Promise<{ images: ManagedImageData[] }> {
  const params = new URLSearchParams()
  if (options?.pagePath) params.set('page_path', options.pagePath)
  if (options?.category) params.set('category', options.category)
  if (options?.includePlaceholders) params.set('include_placeholders', 'true')

  const res = await fetch(
    `${config.apiUrl}/public/images?${params}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch images: ${res.status}`)
  }

  return res.json()
}

/**
 * List available image files in the project
 */
export async function listImageFiles(
  config: ImageApiConfig,
  options?: {
    folder?: string
    search?: string
  },
): Promise<{ files: ImageFile[]; folders: string[] }> {
  const params = new URLSearchParams()
  if (options?.folder) params.set('folder', options.folder)
  if (options?.search) params.set('search', options.search)

  const res = await fetch(
    `${config.apiUrl}/public/images/files?${params}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to list files: ${res.status}`)
  }

  return res.json()
}

/**
 * Upload a new image
 */
export async function uploadImage(
  config: ImageApiConfig,
  file: File,
  options?: {
    slotId?: string
    pagePath?: string
    folder?: string
    altText?: string
  },
): Promise<{ file: ImageFile; image?: ManagedImageData }> {
  const formData = new FormData()
  formData.append('file', file)
  if (options?.slotId) formData.append('slot_id', options.slotId)
  if (options?.pagePath) formData.append('page_path', options.pagePath)
  if (options?.folder) formData.append('folder', options.folder)
  if (options?.altText) formData.append('alt_text', options.altText)

  const res = await fetch(`${config.apiUrl}/public/images/upload`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Failed to upload image: ${res.status}`)
  }

  return res.json()
}

/**
 * Assign an existing file to an image slot
 */
export async function assignImageToSlot(
  config: ImageApiConfig,
  slotId: string,
  options: {
    fileId?: string
    externalUrl?: string
    pagePath?: string
    altText?: string
    title?: string
    caption?: string
    focalPointX?: number
    focalPointY?: number
    aspectRatio?: string
  },
): Promise<{ image: ManagedImageData }> {
  const res = await fetch(
    `${config.apiUrl}/public/images/slot/${encodeURIComponent(slotId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
      body: JSON.stringify({
        page_path: options.pagePath,
        file_id: options.fileId,
        external_url: options.externalUrl,
        alt_text: options.altText,
        title: options.title,
        caption: options.caption,
        focal_point_x: options.focalPointX,
        focal_point_y: options.focalPointY,
        aspect_ratio: options.aspectRatio,
      }),
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to assign image: ${res.status}`)
  }

  return res.json()
}

/**
 * Clear an image from a slot (keeps the file)
 */
export async function clearImageSlot(
  config: ImageApiConfig,
  slotId: string,
  pagePath?: string,
): Promise<{ success: boolean }> {
  const params = new URLSearchParams()
  if (pagePath) params.set('page_path', pagePath)

  const res = await fetch(
    `${config.apiUrl}/public/images/slot/${encodeURIComponent(slotId)}?${params}`,
    {
      method: 'DELETE',
      headers: {
        'x-api-key': config.apiKey,
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to clear slot: ${res.status}`)
  }

  return res.json()
}
