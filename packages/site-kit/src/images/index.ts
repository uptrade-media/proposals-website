/**
 * @uptrade/site-kit Images Module
 * 
 * Provides managed image components for Portal integration.
 * All API calls go through Portal API with API key auth.
 */

export { ManagedImage } from './ManagedImage'
export type { 
  ManagedImageProps, 
  ManagedImageData, 
  ImageFile 
} from './ManagedImage'

// API functions for programmatic use
export { 
  fetchManagedImage,
  fetchManagedImages,
  listImageFiles,
  uploadImage,
  assignImageToSlot,
  clearImageSlot,
} from './api'
export type { ImageApiConfig } from './api'
