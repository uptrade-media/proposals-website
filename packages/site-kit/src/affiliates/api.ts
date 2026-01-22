/**
 * @uptrade/site-kit/affiliates - Affiliates API
 * 
 * API functions for fetching affiliate data for client sites.
 * All data goes through Portal API with API key auth - never Supabase directly.
 */

import type { Affiliate, AffiliateWithOffers, FetchAffiliatesOptions } from './types'

// ============================================
// API Config Helpers
// ============================================

function getApiConfig() {
  const apiUrl = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
    : 'https://api.uptrademedia.com'
  const apiKey = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_KEY__ || ''
    : ''
  return { apiUrl, apiKey }
}

async function apiGet<T>(endpoint: string): Promise<T | null> {
  const { apiUrl, apiKey } = getApiConfig()
  
  if (!apiKey) {
    console.error('[Affiliates] No API key configured')
    return null
  }
  
  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    })
    
    if (!response.ok) {
      console.error(`[Affiliates] API error: ${response.statusText}`)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('[Affiliates] Network error:', error)
    return null
  }
}

// ============================================
// Fetch Affiliates
// ============================================

/**
 * Fetch all active affiliates for the project
 * 
 * @example
 * ```ts
 * const affiliates = await fetchAffiliates()
 * ```
 */
export async function fetchAffiliates(
  options: FetchAffiliatesOptions = {}
): Promise<AffiliateWithOffers[]> {
  const result = await apiGet<{ affiliates: AffiliateWithOffers[] }>(
    '/api/public/affiliates'
  )
  
  return result?.affiliates || []
}

/**
 * Build a tracking URL for an affiliate offer
 * When clicked, this redirects through our tracking endpoint and then to the destination
 * 
 * @example
 * ```ts
 * const trackingUrl = getTrackingUrl(affiliate.id, offer.id)
 * // Returns: https://api.uptrademedia.com/a/{affiliateId}/{offerId}
 * ```
 */
export function getTrackingUrl(affiliateId: string, offerId: string): string {
  const { apiUrl } = getApiConfig()
  return `${apiUrl}/a/${affiliateId}/${offerId}`
}
