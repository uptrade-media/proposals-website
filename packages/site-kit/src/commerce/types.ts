/**
 * @uptrade/site-kit/commerce - Commerce Types
 * 
 * Types for products, services, classes, events, and checkout flows.
 */

// ============================================
// Offering Types
// ============================================

export type OfferingType = 'product' | 'service' | 'class' | 'event' | 'subscription'

export type OfferingStatus = 'draft' | 'active' | 'archived' | 'sold_out'

export type PriceType = 'fixed' | 'variable' | 'quote' | 'free'

export interface CommerceOffering {
  id: string
  project_id: string
  type: OfferingType
  status: OfferingStatus
  
  // Basic info
  name: string
  slug: string
  description?: string
  short_description?: string
  long_description?: string
  
  // Media
  featured_image_url?: string
  gallery_images?: string[]
  
  // Pricing
  price_type: PriceType
  price?: number
  compare_at_price?: number
  currency: string
  price_is_public: boolean
  
  // Recurring (subscriptions)
  billing_period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  
  // Inventory (products)
  track_inventory?: boolean
  inventory_count?: number
  allow_backorder?: boolean
  
  // Scheduling (classes/events)
  duration_minutes?: number
  capacity?: number
  location?: string
  is_virtual?: boolean
  virtual_meeting_url?: string
  
  // Booking (services)
  requires_booking?: boolean
  booking_lead_time_hours?: number
  
  // Organization
  category?: CommerceCategory
  category_id?: string
  tags?: string[]
  
  // SEO
  seo_title?: string
  seo_description?: string
  
  // Features
  features?: string[]
  specifications?: Record<string, string>
  
  // Schedules (for classes/events)
  schedules?: CommerceSchedule[]
  next_schedule?: CommerceSchedule
  
  // Variants (for products)
  variants?: CommerceVariant[]
  
  created_at: string
  updated_at?: string
}

export interface CommerceCategory {
  id: string
  name: string
  slug: string
  description?: string
  image_url?: string
  parent_id?: string
}

export interface CommerceVariant {
  id: string
  offering_id: string
  name: string
  sku?: string
  price?: number
  inventory_count?: number
  options?: Record<string, string>
  image_url?: string
  is_default?: boolean
}

export interface CommerceSchedule {
  id: string
  offering_id: string
  starts_at: string
  ends_at: string
  timezone: string
  capacity?: number
  spots_remaining?: number
  status: 'scheduled' | 'cancelled' | 'completed'
  is_recurring?: boolean
}

// ============================================
// Cart & Checkout
// ============================================

export interface CartItem {
  offering: CommerceOffering
  variant?: CommerceVariant
  schedule?: CommerceSchedule
  quantity: number
  unit_price: number
  total_price: number
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  discount_code?: string
}

export interface CheckoutCustomer {
  name: string
  email: string
  phone?: string
}

export interface CheckoutResult {
  success: boolean
  sale_id?: string
  payment_url?: string
  checkout_url?: string
  confirmation_number?: string
  error?: string
}

// ============================================
// Component Props
// ============================================

export interface OfferingCardProps {
  offering: CommerceOffering
  variant?: 'card' | 'horizontal' | 'minimal'
  showImage?: boolean
  showPrice?: boolean
  showDescription?: boolean
  showCta?: boolean
  ctaText?: string
  onCtaClick?: (offering: CommerceOffering) => void
  onSelect?: (offering: CommerceOffering) => void
  className?: string
  imageClassName?: string
  titleClassName?: string
  priceClassName?: string
  descriptionClassName?: string
  ctaClassName?: string
}

export interface OfferingListProps {
  projectId: string
  type?: OfferingType | OfferingType[]
  category?: string
  limit?: number
  layout?: 'grid' | 'list' | 'carousel'
  showFilters?: boolean
  onSelect?: (offering: CommerceOffering) => void
  className?: string
  cardClassName?: string
  emptyMessage?: string
}

export interface OfferingDetailProps {
  projectId: string
  slug: string
  showBooking?: boolean
  showCheckout?: boolean
  onAddToCart?: (offering: CommerceOffering, variant?: CommerceVariant) => void
  className?: string
}

export interface EventTileProps {
  event: CommerceOffering
  schedule?: CommerceSchedule
  showRegistration?: boolean
  compact?: boolean
  onRegister?: (event: CommerceOffering, schedule: CommerceSchedule) => void
  className?: string
}

export interface UpcomingEventsProps {
  projectId: string
  limit?: number
  showPast?: boolean
  layout?: 'list' | 'grid' | 'calendar'
  onSelect?: (event: CommerceOffering, schedule: CommerceSchedule) => void
  className?: string
}

export interface ProductEmbedProps {
  projectId: string
  /** Specific product slug, or 'latest' for most recent */
  slug?: string | 'latest'
  /** Category to filter by (used with 'latest') */
  category?: string
  showBuyButton?: boolean
  className?: string
}

export interface EventEmbedProps {
  projectId: string
  /** Specific event slug, or 'next' for upcoming */
  slug?: string | 'next'
  /** Category to filter by */
  category?: string
  showRegistration?: boolean
  compact?: boolean
  className?: string
}

export interface CheckoutFormProps {
  projectId: string
  offering: CommerceOffering
  variant?: CommerceVariant
  schedule?: CommerceSchedule
  quantity?: number
  onSuccess?: (result: CheckoutResult) => void
  onError?: (error: string) => void
  className?: string
}

export interface RegistrationFormProps {
  projectId: string
  event: CommerceOffering
  schedule: CommerceSchedule
  onSuccess?: (result: CheckoutResult) => void
  onError?: (error: string) => void
  className?: string
}

// ============================================
// API Types
// ============================================

export interface CommerceApiConfig {
  projectId: string
  apiUrl?: string
  getAuthToken?: () => Promise<string> | string
}

export interface FetchOfferingsOptions {
  type?: OfferingType | OfferingType[]
  category?: string
  status?: OfferingStatus
  limit?: number
  offset?: number
  orderBy?: 'name' | 'price' | 'created_at' | 'sort_order'
  order?: 'asc' | 'desc'
  includeSchedules?: boolean
}

export interface FetchEventsOptions {
  upcoming?: boolean
  past?: boolean
  limit?: number
  offset?: number
  category?: string
}
