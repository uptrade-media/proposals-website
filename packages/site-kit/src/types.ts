/**
 * @uptrade/site-kit - Shared types across all modules
 * 
 * Site-kit ONLY calls Portal API - never Supabase directly.
 * All data access goes through api.uptrademedia.com with API key auth.
 */

// ============================================
// Core Configuration
// ============================================

export interface SiteKitConfig {
  /** 
   * Portal API URL (defaults to https://api.uptrademedia.com)
   */
  apiUrl?: string
  
  /** 
   * Project API key for all API calls
   * Required - identifies the project and provides access
   */
  apiKey: string
  
  /** Analytics module configuration */
  analytics?: {
    enabled: boolean
    trackPageViews?: boolean
    trackWebVitals?: boolean
    trackScrollDepth?: boolean
    trackClicks?: boolean
    sessionDuration?: number // minutes
    excludePaths?: string[]
  }
  
  /** Engage widget configuration */
  engage?: {
    enabled: boolean
    position?: 'bottom-right' | 'bottom-left'
    zIndex?: number
    chatEnabled?: boolean
  }
  
  /** Forms configuration */
  forms?: {
    enabled: boolean
    honeypotField?: string
  }
  
  /** Debug mode - logs to console */
  debug?: boolean
}

// ============================================
// Common
// ============================================

export interface BaseEntity {
  id: string
  created_at: string
  updated_at?: string
}

export interface ProjectScoped {
  project_id: string
}

// ============================================
// Re-export module types
// ============================================

export * from './seo/types'
export * from './analytics/types'
export * from './engage/types'
export * from './forms/types'
export * from './blog/types'
