/**
 * @uptrade/site-kit/reputation - Type Definitions
 */

export interface Review {
  id: string
  quote: string
  name: string
  role?: string
  rating: number
  image?: string
  date?: string
  platform?: string
  isFeatured?: boolean
  serviceTags?: string[]
}

export interface ReviewStats {
  total_reviews: number
  average_rating: number
  distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

export interface TestimonialSectionProps {
  title?: string
  subtitle?: string
  autoplay?: boolean
  autoplayInterval?: number
  showRating?: boolean
  maxReviews?: number
  featuredOnly?: boolean
  service?: string
  className?: string
}
