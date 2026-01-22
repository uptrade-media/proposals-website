/**
 * @uptrade/site-kit/affiliates - Module Entry Point
 * 
 * Exports all affiliate tracking components and utilities.
 */

// Types
export type { 
  Affiliate, 
  AffiliateOffer, 
  AffiliateWithOffers, 
  FetchAffiliatesOptions 
} from './types'

// API Functions
export { fetchAffiliates, getTrackingUrl } from './api'

// React Hook
export { useAffiliates } from './useAffiliates'
export type { UseAffiliatesResult } from './useAffiliates'

// Components
export { AffiliatesWidget, AffiliateCard } from './AffiliatesWidget'
export type { AffiliatesWidgetProps, AffiliateCardProps } from './AffiliatesWidget'
