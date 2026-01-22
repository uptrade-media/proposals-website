/**
 * @uptrade/site-kit/analytics - Type definitions
 */

// ============================================
// Page View Types
// ============================================

export interface PageView {
  id: string
  project_id: string
  session_id: string
  path: string
  url: string
  title?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  device_type: 'desktop' | 'mobile' | 'tablet'
  browser?: string
  os?: string
  country?: string
  region?: string
  city?: string
  created_at: string
}

// ============================================
// Event Types
// ============================================

export interface AnalyticsEvent {
  id: string
  project_id: string
  session_id: string
  event_name: string
  event_category?: string
  event_label?: string
  event_value?: number
  properties?: Record<string, unknown>
  path: string
  created_at: string
}

export interface TrackEventOptions {
  /** Event name (e.g., 'button_click', 'form_submit') */
  name: string
  /** Event category (e.g., 'engagement', 'conversion') */
  category?: string
  /** Event label for additional context */
  label?: string
  /** Numeric value associated with event */
  value?: number
  /** Additional custom properties */
  properties?: Record<string, unknown>
}

// ============================================
// Conversion Types
// ============================================

export interface Conversion {
  id: string
  project_id: string
  session_id: string
  conversion_type: string
  value?: number
  currency?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface TrackConversionOptions {
  /** Conversion type (e.g., 'form_submit', 'purchase', 'signup') */
  type: string
  /** Monetary value */
  value?: number
  /** Currency code (e.g., 'USD') */
  currency?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

// ============================================
// Session Types
// ============================================

export interface Session {
  id: string
  project_id: string
  visitor_id: string
  started_at: string
  ended_at?: string
  page_count: number
  event_count: number
  duration_seconds?: number
  is_bounce: boolean
  entry_path: string
  exit_path?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  device_type: 'desktop' | 'mobile' | 'tablet'
  browser?: string
  os?: string
}

// ============================================
// Web Vitals Types
// ============================================

export interface WebVitalsData {
  id: string
  project_id: string
  path: string
  lcp?: number  // Largest Contentful Paint
  fid?: number  // First Input Delay
  cls?: number  // Cumulative Layout Shift
  ttfb?: number // Time to First Byte
  inp?: number  // Interaction to Next Paint
  fcp?: number  // First Contentful Paint
  created_at: string
}

// ============================================
// Provider Types
// ============================================

export interface AnalyticsConfig {
  projectId: string
  
  /** Track page views automatically (default: true) */
  trackPageViews?: boolean
  
  /** Track Web Vitals automatically (default: true) */
  trackWebVitals?: boolean
  
  /** Track scroll depth (default: false) */
  trackScrollDepth?: boolean
  
  /** Session timeout in minutes (default: 30) */
  sessionTimeout?: number
  
  /** Paths to exclude from tracking */
  excludePaths?: string[]
  
  /** Debug mode - logs events to console */
  debug?: boolean
}

export interface AnalyticsContextValue {
  /** Track a custom event */
  trackEvent: (options: TrackEventOptions) => void
  
  /** Track a conversion */
  trackConversion: (options: TrackConversionOptions) => void
  
  /** Get current session ID */
  sessionId: string | null
  
  /** Get current visitor ID */
  visitorId: string | null
}
