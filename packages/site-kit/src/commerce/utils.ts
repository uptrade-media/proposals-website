/**
 * @uptrade/site-kit/commerce - Utility functions
 */

export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatDateRange(startDate: string, endDate?: string): string {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null
  
  const startFormatted = formatDateTime(startDate)
  
  if (!end) return startFormatted
  
  // Same day
  if (start.toDateString() === end.toDateString()) {
    return `${startFormatted} - ${formatTime(endDate!)}`
  }
  
  return `${startFormatted} - ${formatDateTime(endDate!)}`
}

export function getRelativeTimeUntil(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'Past'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return `In ${diffDays} days`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `In ${weeks} week${weeks > 1 ? 's' : ''}`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `In ${months} month${months > 1 ? 's' : ''}`
  }
  return formatDate(dateString)
}

export function getSpotsRemaining(
  capacity: number | null | undefined,
  registrations: number = 0
): number | null {
  if (capacity == null) return null
  return Math.max(0, capacity - registrations)
}

export function isEventSoldOut(
  capacity: number | null | undefined,
  registrations: number = 0
): boolean {
  const remaining = getSpotsRemaining(capacity, registrations)
  return remaining !== null && remaining <= 0
}

export function getOfferingUrl(
  slug: string, 
  type: string,
  basePaths?: {
    product?: string
    service?: string
    event?: string
    class?: string
  }
): string {
  const defaults = {
    product: '/shop',
    service: '/services',
    event: '/events',
    class: '/classes',
  }
  const paths = { ...defaults, ...basePaths }
  const base = paths[type as keyof typeof paths] || '/offerings'
  return `${base}/${slug}`
}
