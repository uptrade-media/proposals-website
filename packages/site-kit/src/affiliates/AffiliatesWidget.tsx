/**
 * @uptrade/site-kit/affiliates - AffiliatesWidget Component
 * 
 * Unstyled, headless component for displaying affiliates.
 * Client sites can wrap this or use it directly with their own styling.
 */

'use client'

import React from 'react'
import { useAffiliates } from './useAffiliates'
import type { AffiliateWithOffers, AffiliateOffer } from './types'

// ============================================
// Affiliate Card (Unstyled)
// ============================================

export interface AffiliateCardProps {
  affiliate: AffiliateWithOffers
  className?: string
  /** Optional custom render for the logo */
  renderLogo?: (affiliate: AffiliateWithOffers) => React.ReactNode
  /** Show offers as links below the card */
  showOffers?: boolean
}

/**
 * Single affiliate card - unstyled, bring your own CSS
 * 
 * @example
 * ```tsx
 * <AffiliateCard 
 *   affiliate={affiliate}
 *   className="p-4 bg-white rounded-lg shadow"
 *   showOffers
 * />
 * ```
 */
export function AffiliateCard({
  affiliate,
  className = '',
  renderLogo,
  showOffers = false,
}: AffiliateCardProps) {
  const { getTrackingUrl } = useAffiliates()
  
  const defaultLogo = (
    <div data-affiliate-logo className="affiliate-logo">
      {affiliate.logo_url ? (
        <img 
          src={affiliate.logo_url} 
          alt={affiliate.name}
          loading="lazy"
        />
      ) : (
        <span>{affiliate.name.charAt(0)}</span>
      )}
    </div>
  )

  return (
    <div className={className} data-affiliate-card data-affiliate-id={affiliate.id}>
      {/* Logo */}
      {renderLogo ? renderLogo(affiliate) : defaultLogo}
      
      {/* Name */}
      <div data-affiliate-name className="affiliate-name">
        {affiliate.name}
      </div>
      
      {/* Website link */}
      {affiliate.website_url && (
        <a 
          href={affiliate.website_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          data-affiliate-website
          className="affiliate-website"
        >
          Visit Website
        </a>
      )}
      
      {/* Offers */}
      {showOffers && affiliate.offers && affiliate.offers.length > 0 && (
        <div data-affiliate-offers className="affiliate-offers">
          {affiliate.offers.map(offer => (
            <a
              key={offer.id}
              href={getTrackingUrl(affiliate.id, offer.id)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-affiliate-offer
              data-offer-id={offer.id}
              className="affiliate-offer"
            >
              {offer.name}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Affiliates Grid (Unstyled)
// ============================================

export interface AffiliatesWidgetProps {
  className?: string
  /** Custom loading component */
  loadingComponent?: React.ReactNode
  /** Custom empty state component */
  emptyComponent?: React.ReactNode
  /** Custom error component */
  errorComponent?: React.ReactNode
  /** Show offers on each card */
  showOffers?: boolean
  /** Custom render function for each affiliate */
  renderAffiliate?: (affiliate: AffiliateWithOffers) => React.ReactNode
  /** Maximum number to display */
  limit?: number
}

/**
 * Display a grid of affiliates - unstyled, bring your own CSS
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AffiliatesWidget className="grid grid-cols-3 gap-4" />
 * 
 * // With custom rendering
 * <AffiliatesWidget
 *   renderAffiliate={(affiliate) => (
 *     <MyCustomCard key={affiliate.id} data={affiliate} />
 *   )}
 * />
 * ```
 */
export function AffiliatesWidget({
  className = '',
  loadingComponent,
  emptyComponent,
  errorComponent,
  showOffers = false,
  renderAffiliate,
  limit,
}: AffiliatesWidgetProps) {
  const { affiliates, isLoading, error, getTrackingUrl } = useAffiliates()
  
  if (isLoading) {
    return loadingComponent || <div data-affiliates-loading>Loading affiliates...</div>
  }
  
  if (error) {
    return errorComponent || <div data-affiliates-error>{error}</div>
  }
  
  const displayAffiliates = limit ? affiliates.slice(0, limit) : affiliates
  
  if (displayAffiliates.length === 0) {
    return emptyComponent || null
  }
  
  return (
    <div className={className} data-affiliates-widget>
      {displayAffiliates.map(affiliate => 
        renderAffiliate 
          ? renderAffiliate(affiliate)
          : <AffiliateCard 
              key={affiliate.id} 
              affiliate={affiliate} 
              showOffers={showOffers}
            />
      )}
    </div>
  )
}
