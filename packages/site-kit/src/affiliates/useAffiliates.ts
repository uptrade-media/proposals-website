/**
 * @uptrade/site-kit/affiliates - useAffiliates Hook
 * 
 * React hook for fetching and displaying affiliates on client sites.
 */

'use client'

import { useState, useEffect } from 'react'
import type { AffiliateWithOffers } from './types'
import { fetchAffiliates, getTrackingUrl } from './api'

export interface UseAffiliatesResult {
  affiliates: AffiliateWithOffers[]
  isLoading: boolean
  error: string | null
  getTrackingUrl: (affiliateId: string, offerId: string) => string
}

/**
 * Hook to fetch affiliates for display on client sites
 * 
 * @example
 * ```tsx
 * function AffiliatesSection() {
 *   const { affiliates, isLoading } = useAffiliates()
 *   
 *   if (isLoading) return <div>Loading...</div>
 *   
 *   return (
 *     <div className="grid grid-cols-3 gap-4">
 *       {affiliates.map(affiliate => (
 *         <AffiliateCard key={affiliate.id} affiliate={affiliate} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useAffiliates(): UseAffiliatesResult {
  const [affiliates, setAffiliates] = useState<AffiliateWithOffers[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchAffiliates()
        setAffiliates(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load affiliates')
      } finally {
        setIsLoading(false)
      }
    }
    
    load()
  }, [])

  return {
    affiliates,
    isLoading,
    error,
    getTrackingUrl,
  }
}
