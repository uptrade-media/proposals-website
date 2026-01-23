/**
 * @uptrade/site-kit - Main Entry Point
 * 
 * Unified package for all Uptrade client-side integrations.
 * All API calls go through Portal API with API key auth - never Supabase directly.
 * 
 * @example
 * ```tsx
 * import { SiteKitProvider } from '@uptrade/site-kit'
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <SiteKitProvider
 *       apiUrl="https://api.uptrademedia.com"
 *       apiKey={process.env.NEXT_PUBLIC_UPTRADE_API_KEY}
 *       analytics={{ enabled: true }}
 *       engage={{ enabled: true }}
 *     >
 *       {children}
 *     </SiteKitProvider>
 *   )
 * }
 * ```
 */

// Main Provider
export { SiteKitProvider, useSiteKit } from './SiteKitProvider'
export type { SiteKitConfig } from './types'

// Re-export module types for convenience
export type { ManagedMetadataResult, ManagedSchemaProps, ManagedFAQData } from './seo/types'
export type { AnalyticsConfig, AnalyticsEvent, PageView } from './analytics/types'
export type { EngageElement, WidgetConfig, ChatConfig } from './engage/types'
export type { ManagedFormConfig, FormSubmission, FormField } from './forms/types'
export type { BlogPost as BlogPostType, BlogAuthor, BlogCategory } from './blog/types'
export type { 
  CommerceOffering, 
  CommerceCategory, 
  CommerceVariant, 
  CommerceSchedule,
  OfferingType,
  Cart,
  CartItem,
} from './commerce/types'

// Commerce module exports
export {
  // Components
  OfferingCard,
  OfferingList,
  EventTile,
  UpcomingEvents,
  ProductEmbed,
  EventEmbed,
  CheckoutForm,
  RegistrationForm,
  CalendarView,
  EventModal,
  EventCalendar,
  // Hooks
  useEventModal,
  // API functions
  fetchOfferings,
  fetchOffering,
  fetchProducts,
  fetchServices,
  fetchUpcomingEvents,
  fetchNextEvent,
  createCheckoutSession,
  registerForEvent,
  // Utils
  formatPrice,
  formatDate,
  formatDateTime,
  getOfferingUrl,
} from './commerce'

// Affiliates module exports
export {
  // Components
  AffiliatesWidget,
  AffiliateCard,
  // Hooks
  useAffiliates,
  // API functions
  fetchAffiliates,
  getTrackingUrl,
} from './affiliates'
export type {
  Affiliate,
  AffiliateOffer,
  AffiliateWithOffers,
  AffiliatesWidgetProps,
  AffiliateCardProps,
  UseAffiliatesResult,
} from './affiliates'

// Redirects module exports
export {
  handleManagedRedirects,
  fetchRedirectRules,
  generateNextRedirects,
  clearRedirectCache,
} from './redirects'
export type { RedirectRule, RedirectConfig } from './redirects'

// Images module exports
export {
  ManagedImage,
  fetchManagedImage,
  fetchManagedImages,
  listImageFiles,
  uploadImage,
  assignImageToSlot,
  clearImageSlot,
} from './images'
export type { 
  ManagedImageProps, 
  ManagedImageData, 
  ImageFile,
  ImageApiConfig,
} from './images'

// Note: Pages are auto-discovered via site-kit page views
// No manual registration needed - SEO metadata is extracted and sent on every page load

// Signal AI module exports
export {
  SignalBridge,
  useSignal,
  useSignalConfig,
  useSignalEvent,
  useSignalOutcome,
  useSignalExperiment,
  SignalExperiment,
  useExperimentVariant,
  ExperimentConversion,
} from './signal'
export type {
  SignalConfig,
  SignalEvent,
  SignalOutcome,
  SignalContextValue,
  SignalBridgeProps,
  ExperimentConfig,
  ExperimentVariant,
  ExperimentAssignment,
  EngageOverride,
  MetaOverride,
  PriceOverride,
} from './signal'

// Setup module exports
export { SetupWizard } from './setup/SetupWizard'
export { SetupAssistant } from './setup/SetupAssistant'

