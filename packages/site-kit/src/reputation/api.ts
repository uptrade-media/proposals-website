/**
 * @uptrade/site-kit/reputation - API Functions
 * 
 * Fetch reviews and stats from Portal API public endpoint
 */

import type { Review, ReviewStats } from './types'

interface FetchReviewsOptions {
  service?: string
  limit?: number
  featured?: boolean
}

function getApiConfig() {
  const apiUrl = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
    : 'https://api.uptrademedia.com'
  const projectId = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_PROJECT_ID__
    : undefined
  return { apiUrl, projectId }
}

export async function fetchReviews(options: FetchReviewsOptions = {}): Promise<Review[]> {
  const { apiUrl, projectId } = getApiConfig()
  
  if (!projectId) {
    console.warn('[Reputation] No project ID configured')
    return []
  }
  
  try {
    const params = new URLSearchParams()
    if (options.service) params.append('service', options.service)
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.featured) params.append('featured', 'true')
    
    const url = `${apiUrl}/public/reviews/${projectId}${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('[Reputation] Error fetching reviews:', response.statusText)
      return []
    }
    
    const data = await response.json()
    return data.reviews || []
  } catch (error) {
    console.error('[Reputation] Error fetching reviews:', error)
    return []
  }
}

export async function fetchReviewStats(): Promise<ReviewStats | null> {
  const { apiUrl, projectId } = getApiConfig()
  
  if (!projectId) {
    console.warn('[Reputation] No project ID configured')
    return null
  }
  
  try {
    const response = await fetch(`${apiUrl}/public/reviews/${projectId}/stats`)
    
    if (!response.ok) {
      console.error('[Reputation] Error fetching stats:', response.statusText)
      return null
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('[Reputation] Error fetching stats:', error)
    return null
  }
}
