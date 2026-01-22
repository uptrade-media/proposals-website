/**
 * @uptrade/site-kit/affiliates - Affiliates Types
 * 
 * TypeScript types for affiliate tracking and display.
 */

export interface Affiliate {
  id: string
  project_id: string
  name: string
  website_url?: string
  logo_url?: string
  status: 'active' | 'paused'
  notes?: string
  created_at: string
}

export interface AffiliateOffer {
  id: string
  affiliate_id: string
  name: string
  destination_url: string
  description?: string
  payout_type: 'flat' | 'percent' | 'none'
  payout_amount?: number
  is_active: boolean
}

export interface AffiliateWithOffers extends Affiliate {
  offers: AffiliateOffer[]
}

export interface FetchAffiliatesOptions {
  status?: 'active' | 'paused'
  includeOffers?: boolean
}
