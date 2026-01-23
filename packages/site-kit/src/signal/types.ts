/**
 * @uptrade/site-kit/signal - Types
 * 
 * Type definitions for Signal integration
 */

// ============================================
// Configuration Types
// ============================================

export interface SignalConfig {
  /** Config version (for cache invalidation) */
  version: string
  
  /** Whether Signal is enabled for this project */
  enabled: boolean
  
  /** Engage element overrides */
  engage?: {
    popups?: Record<string, EngageOverride>
    nudges?: Record<string, EngageOverride>
    banners?: Record<string, EngageOverride>
    chat?: ChatOverride
  }
  
  /** SEO overrides */
  seo?: {
    meta?: Record<string, MetaOverride>
    redirects?: RedirectRule[]
  }
  
  /** Commerce overrides */
  commerce?: {
    pricing?: Record<string, PriceOverride>
    upsells?: Record<string, UpsellConfig>
  }
  
  /** Active experiments */
  experiments: ExperimentConfig[]
  
  /** Updated timestamp */
  updated_at: string
}

export interface EngageOverride {
  /** Whether the element is enabled */
  enabled?: boolean
  
  /** Timing override in ms */
  timing?: number
  
  /** Content overrides */
  content?: {
    headline?: string
    body?: string
    cta?: string
    image?: string
  }
  
  /** Targeting overrides */
  targeting?: {
    pages?: string[]
    devices?: ('desktop' | 'mobile' | 'tablet')[]
    segments?: string[]
  }
}

export interface ChatOverride {
  /** Whether chat is enabled */
  enabled?: boolean
  
  /** Auto-open delay in ms */
  auto_open_delay?: number
  
  /** Welcome message override */
  welcome_message?: string
  
  /** Offline message */
  offline_message?: string
}

export interface MetaOverride {
  /** Title tag override */
  title?: string
  
  /** Meta description override */
  description?: string
  
  /** OG image override */
  og_image?: string
}

export interface RedirectRule {
  /** Source path (supports wildcards) */
  from: string
  
  /** Destination path */
  to: string
  
  /** Redirect type */
  type: 301 | 302
  
  /** Whether the rule is active */
  active: boolean
}

export interface PriceOverride {
  /** Offering ID */
  offering_id: string
  
  /** New price in cents */
  price: number
  
  /** Compare-at price for sales */
  compare_at_price?: number
  
  /** Reason for override */
  reason: string
}

export interface UpsellConfig {
  /** Primary offering ID */
  offering_id: string
  
  /** Upsell offering IDs */
  upsell_ids: string[]
  
  /** Display location */
  location: 'cart' | 'checkout' | 'product_page'
}

// ============================================
// Experiment Types
// ============================================

export interface ExperimentConfig {
  /** Unique experiment ID */
  id: string
  
  /** Human-readable name */
  name: string
  
  /** Experiment status */
  status: 'draft' | 'running' | 'paused' | 'completed'
  
  /** Variants with weights */
  variants: ExperimentVariant[]
  
  /** Target pages/segments */
  target?: {
    pages?: string[]
    segments?: string[]
    devices?: ('desktop' | 'mobile' | 'tablet')[]
  }
  
  /** Goal definition */
  goal: {
    outcome_type: string
    min_confidence: number
  }
  
  /** Traffic allocation (0-1) */
  traffic_allocation: number
  
  /** Winner if determined */
  winner_variant?: string
}

export interface ExperimentVariant {
  /** Unique variant key */
  key: string
  
  /** Display name */
  name: string
  
  /** Traffic weight (0-1) */
  weight: number
  
  /** Variant description */
  description?: string
}

export interface ExperimentAssignment {
  /** Experiment ID */
  experiment_id: string
  
  /** Assigned variant key */
  variant_key: string
  
  /** Assignment expiration */
  expires: number
  
  /** Assigned timestamp */
  assigned_at: string
}

// ============================================
// Event Types
// ============================================

export interface SignalEvent {
  /** Event type (page_view, click, form_submit, etc.) */
  event_type: string
  
  /** Specific event name */
  event_name: string
  
  /** Event data payload */
  event_data: Record<string, unknown>
  
  /** Page context */
  page_url: string
  page_path: string
  referrer: string
  
  /** Device info */
  device_type: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
  viewport_width: number
  viewport_height: number
  
  /** Engagement metrics */
  time_on_page: number
  scroll_depth: number
  click_count: number
  
  /** Active experiments */
  experiments: Array<{
    experiment_id: string
    variant_key: string
  }>
  
  /** Attribution */
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  
  /** Timestamp */
  timestamp: string
}

export interface SignalOutcome {
  /** Outcome type (form_submit, purchase, signup, etc.) */
  outcome_type: string
  
  /** Monetary value if applicable */
  value?: number
  
  /** Related entity ID */
  entity_id?: string
  
  /** Active experiment IDs */
  experiments: string[]
  
  /** Additional context */
  metadata?: Record<string, unknown>
}

// ============================================
// Page Data Types
// ============================================

export interface SignalPageData {
  /** URL path */
  path: string
  
  /** Canonical URL */
  canonical: string | null
  
  /** Title tag */
  title: string
  
  /** Meta description */
  meta_description: string | null
  
  /** Robots directive */
  robots: string | null
  
  /** H1 content */
  h1: string | null
  h1_count: number
  
  /** H2 headings */
  h2s: string[]
  
  /** Content length */
  word_count: number
  
  /** Image stats */
  images_total: number
  images_without_alt: number
  
  /** Link stats */
  internal_links: number
  external_links: number
  
  /** Schema types present */
  schema_types: string[]
  
  /** Core Web Vitals */
  lcp?: number
  fid?: number
  cls?: number
  ttfb?: number
}

// ============================================
// Context Types
// ============================================

export interface SignalContextValue {
  /** Current config */
  config: SignalConfig | null
  
  /** Whether Signal is loading */
  loading: boolean
  
  /** Error if any */
  error: Error | null
  
  /** Track a custom event */
  trackEvent: (event: Partial<SignalEvent>) => void
  
  /** Report an outcome/conversion */
  trackOutcome: (outcome: SignalOutcome) => void
  
  /** Get experiment assignment */
  getExperiment: (experimentId: string) => ExperimentAssignment | null
  
  /** Force refresh config */
  refreshConfig: () => Promise<void>
}

export interface SignalBridgeProps {
  /** Enable Signal integration */
  enabled?: boolean
  
  /** Enable real-time config updates via SSE */
  realtime?: boolean
  
  /** Enable A/B experiment participation */
  experiments?: boolean
  
  /** Enable rich behavioral tracking */
  behaviorTracking?: boolean
  
  /** Children */
  children: React.ReactNode
}
