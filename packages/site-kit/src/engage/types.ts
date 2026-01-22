/**
 * @uptrade/site-kit/engage - Type definitions
 */

// ============================================
// Widget Types
// ============================================

export type WidgetType = 'popup' | 'nudge' | 'bar' | 'chat'

export interface EngageElement {
  id: string
  project_id: string
  name: string
  type: WidgetType
  config: WidgetConfig
  targeting: TargetingRules
  trigger: TriggerConfig
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}

// ============================================
// Config Types
// ============================================

export interface WidgetConfig {
  /** Visual style */
  theme?: 'light' | 'dark' | 'custom'
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  
  /** Content */
  title?: string
  message?: string
  imageUrl?: string
  
  /** CTA */
  ctaText?: string
  ctaUrl?: string
  ctaAction?: 'link' | 'close' | 'form' | 'chat'
  
  /** Form (if ctaAction is 'form') */
  formId?: string
  
  /** Styling */
  backgroundColor?: string
  textColor?: string
  ctaBackgroundColor?: string
  ctaTextColor?: string
  borderRadius?: number
  
  /** Behavior */
  closable?: boolean
  showOverlay?: boolean
  overlayOpacity?: number
}

// ============================================
// Targeting Types
// ============================================

export interface TargetingRules {
  /** Page targeting */
  pages?: {
    include?: string[]  // Paths to include (supports wildcards)
    exclude?: string[]  // Paths to exclude
  }
  
  /** Device targeting */
  devices?: ('desktop' | 'mobile' | 'tablet')[]
  
  /** Visitor targeting */
  visitor?: {
    type?: 'new' | 'returning' | 'all'
    minSessions?: number
    maxSessions?: number
  }
  
  /** Source targeting */
  source?: {
    utm_source?: string[]
    utm_medium?: string[]
    utm_campaign?: string[]
    referrer?: string[]
  }
  
  /** Time targeting */
  schedule?: {
    startDate?: string
    endDate?: string
    daysOfWeek?: number[]  // 0-6, Sunday-Saturday
    startTime?: string     // HH:MM
    endTime?: string       // HH:MM
    timezone?: string
  }
}

// ============================================
// Trigger Types
// ============================================

export interface TriggerConfig {
  type: 'immediate' | 'delay' | 'scroll' | 'exit-intent' | 'click' | 'custom'
  
  /** Delay in seconds (for 'delay' type) */
  delay?: number
  
  /** Scroll percentage (for 'scroll' type) */
  scrollPercentage?: number
  
  /** CSS selector (for 'click' type) */
  clickSelector?: string
  
  /** Custom event name (for 'custom' type) */
  customEvent?: string
  
  /** Frequency capping */
  frequency?: {
    type: 'always' | 'once' | 'once-per-session' | 'every-n-days'
    days?: number  // For 'every-n-days'
  }
}

// ============================================
// Chat Types
// ============================================

export interface ChatConfig {
  /** Widget position */
  position: 'bottom-right' | 'bottom-left'
  
  /** Widget appearance */
  buttonIcon?: 'chat' | 'help' | 'custom'
  buttonColor?: string
  buttonText?: string  // Text next to button
  
  /** Welcome message */
  welcomeMessage?: string
  
  /** Operating hours */
  operatingHours?: {
    enabled: boolean
    timezone: string
    hours: {
      [day: number]: { start: string; end: string } | null
    }
  }
  
  /** AI vs Live Chat */
  mode: 'ai' | 'live' | 'hybrid'
  
  /** AI settings (if mode is 'ai' or 'hybrid') */
  aiSettings?: {
    skillId?: string  // Echo skill to use
    handoffToLive?: boolean
    handoffKeywords?: string[]
  }
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'agent' | 'system'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface ChatConversation {
  id: string
  project_id: string
  visitor_id: string
  status: 'active' | 'pending' | 'resolved' | 'closed'
  assigned_to?: string
  last_message_at: string
  created_at: string
}

// ============================================
// Provider Types
// ============================================

export interface EngageConfig {
  projectId: string
  
  /** Widget position */
  position?: 'bottom-right' | 'bottom-left'
  
  /** Z-index for widgets */
  zIndex?: number
  
  /** Enable chat */
  chatEnabled?: boolean
  
  /** Debug mode */
  debug?: boolean
}

// ============================================
// Analytics Types
// ============================================

export interface EngageAnalytics {
  element_id: string
  event_type: 'impression' | 'click' | 'close' | 'submit' | 'dismiss'
  session_id: string
  metadata?: Record<string, unknown>
  created_at: string
}
