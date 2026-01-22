/**
 * @uptrade/site-kit/commerce - EventsWidget
 * 
 * Comprehensive events widget with calendar/list toggle and integrated booking.
 * Plug-and-play component for displaying commerce events.
 * 
 * @example
 * ```tsx
 * // Basic usage - automatically fetches events
 * <EventsWidget />
 * 
 * // With calendar view as default
 * <EventsWidget defaultView="calendar" />
 * 
 * // Custom styling
 * <EventsWidget
 *   className="my-events-section"
 *   title="Upcoming Events"
 *   showViewToggle={true}
 *   onRegistrationSuccess={(result) => console.log('Registered!', result)}
 * />
 * ```
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { CommerceOffering, CommerceSchedule, CheckoutResult } from './types'
import { CalendarView } from './CalendarView'
import { EventModal } from './EventModal'
import { useEventModal } from './useEventModal'
import { formatDate, formatTime, formatPrice } from './utils'

export type EventsViewMode = 'list' | 'calendar'

export interface EventsWidgetProps {
  /** Pre-loaded events (optional - will fetch if not provided) */
  events?: CommerceOffering[]
  /** Initial view mode */
  defaultView?: EventsViewMode
  /** Show view toggle buttons */
  showViewToggle?: boolean
  /** Section title */
  title?: string
  /** Subtitle or description */
  subtitle?: string
  /** Category filter */
  category?: string
  /** Maximum events to show in list view */
  limit?: number
  /** Show "View All" link */
  showViewAll?: boolean
  /** URL for "View All" link */
  viewAllUrl?: string
  /** Text for "View All" link */
  viewAllText?: string
  /** Message when no events */
  emptyMessage?: string
  /** Show empty state with icon */
  showEmptyIcon?: boolean
  
  // Registration options
  /** Collect phone number in registration */
  collectPhone?: boolean
  /** Additional form fields */
  additionalFields?: AdditionalField[]
  
  // Callbacks
  /** Called when registration/checkout succeeds */
  onRegistrationSuccess?: (result: CheckoutResult) => void
  /** Called when registration/checkout fails */
  onRegistrationError?: (error: string) => void
  /** Called when event is clicked (before modal opens) */
  onEventClick?: (event: CommerceOffering, schedule: CommerceSchedule) => void
  
  // Styling
  className?: string
  headerClassName?: string
  toggleClassName?: string
  listClassName?: string
  calendarClassName?: string
  eventCardClassName?: string
  modalClassName?: string
}

export interface AdditionalField {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'number'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
}

// Icons
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
)

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
)

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
)

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
)

export function EventsWidget({
  events: propEvents,
  defaultView = 'list',
  showViewToggle = true,
  title,
  subtitle,
  category,
  limit = 10,
  showViewAll = false,
  viewAllUrl = '/events',
  viewAllText = 'View All Events',
  emptyMessage = 'No upcoming events scheduled.',
  showEmptyIcon = true,
  collectPhone = false,
  additionalFields = [],
  onRegistrationSuccess,
  onRegistrationError,
  onEventClick,
  className = '',
  headerClassName = '',
  toggleClassName = '',
  listClassName = '',
  calendarClassName = '',
  eventCardClassName = '',
  modalClassName = '',
}: EventsWidgetProps) {
  const [viewMode, setViewMode] = useState<EventsViewMode>(defaultView)
  const [events, setEvents] = useState<CommerceOffering[]>(propEvents || [])
  const [loading, setLoading] = useState(!propEvents)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const { event, schedule, isOpen, openModal, closeModal } = useEventModal()
  
  // Fetch events from API
  useEffect(() => {
    if (propEvents) {
      setEvents(propEvents)
      return
    }
    
    async function loadEvents() {
      const apiUrl = getApiUrl()
      const apiKey = getApiKey()
      
      // Wait for API key to be available (set by SiteKitProvider)
      // If not available after a short delay, retry up to 3 times
      if (!apiKey) {
        if (retryCount < 3) {
          setTimeout(() => setRetryCount(c => c + 1), 100)
          return
        }
        console.warn('[EventsWidget] No API key configured. Make sure SiteKitProvider is wrapping your app.')
        setError(null) // Don't show error, just show empty state
        setEvents([])
        setLoading(false)
        return
      }
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`${apiUrl}/api/public/commerce/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            type: 'event',
            category,
            limit: limit * 2, // Fetch extra for calendar view
          }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }
        
        const data = await response.json()
        setEvents(data.events || [])
      } catch (err) {
        console.error('Error loading events:', err)
        setError('Unable to load events. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    
    loadEvents()
  }, [propEvents, category, limit, retryCount])
  
  const handleEventClick = useCallback((clickedEvent: CommerceOffering, clickedSchedule: CommerceSchedule) => {
    onEventClick?.(clickedEvent, clickedSchedule)
    openModal(clickedEvent, clickedSchedule)
  }, [onEventClick, openModal])
  
  const handleSuccess = useCallback((result: CheckoutResult) => {
    onRegistrationSuccess?.(result)
  }, [onRegistrationSuccess])
  
  const handleError = useCallback((err: string) => {
    onRegistrationError?.(err)
  }, [onRegistrationError])
  
  // Loading state
  if (loading) {
    return (
      <div className={`site-kit-events-widget ${className}`}>
        {(title || subtitle) && (
          <div className={`site-kit-events-header ${headerClassName}`} style={{ marginBottom: '1.5rem' }}>
            {title && <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{title}</h2>}
            {subtitle && <p style={{ margin: '0.5rem 0 0', color: '#666' }}>{subtitle}</p>}
          </div>
        )}
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#666' }}>
          <div style={{
            width: '40px',
            height: '40px',
            margin: '0 auto 1rem',
            border: '3px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'site-kit-spin 1s linear infinite',
          }} />
          <p>Loading events...</p>
        </div>
        <style>{`
          @keyframes site-kit-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className={`site-kit-events-widget ${className}`}>
        {(title || subtitle) && (
          <div className={`site-kit-events-header ${headerClassName}`} style={{ marginBottom: '1.5rem' }}>
            {title && <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{title}</h2>}
            {subtitle && <p style={{ margin: '0.5rem 0 0', color: '#666' }}>{subtitle}</p>}
          </div>
        )}
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#dc2626' }}>
          <p>{error}</p>
        </div>
      </div>
    )
  }
  
  // Empty state
  if (events.length === 0) {
    return (
      <div className={`site-kit-events-widget ${className}`}>
        {(title || subtitle) && (
          <div className={`site-kit-events-header ${headerClassName}`} style={{ marginBottom: '1.5rem' }}>
            {title && <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{title}</h2>}
            {subtitle && <p style={{ margin: '0.5rem 0 0', color: '#666' }}>{subtitle}</p>}
          </div>
        )}
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#666' }}>
          {showEmptyIcon && (
            <svg
              style={{ width: '64px', height: '64px', margin: '0 auto 1rem', color: '#d1d5db' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: 0 }}>{emptyMessage}</p>
        </div>
      </div>
    )
  }
  
  // Limit events for list view
  const displayEvents = viewMode === 'list' ? events.slice(0, limit) : events
  
  return (
    <div className={`site-kit-events-widget ${className}`}>
      {/* Header */}
      {(title || subtitle || showViewToggle) && (
        <div 
          className={`site-kit-events-header ${headerClassName}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            {title && <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{title}</h2>}
            {subtitle && <p style={{ margin: '0.5rem 0 0', color: '#666' }}>{subtitle}</p>}
          </div>
          
          {showViewToggle && (
            <div 
              className={`site-kit-events-toggle ${toggleClassName}`}
              style={{
                display: 'flex',
                gap: '0.25rem',
                background: '#f3f4f6',
                padding: '0.25rem',
                borderRadius: '0.5rem',
              }}
            >
              <button
                onClick={() => setViewMode('list')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  background: viewMode === 'list' ? '#fff' : 'transparent',
                  color: viewMode === 'list' ? '#1f2937' : '#6b7280',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 150ms',
                }}
              >
                <ListIcon />
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  background: viewMode === 'calendar' ? '#fff' : 'transparent',
                  color: viewMode === 'calendar' ? '#1f2937' : '#6b7280',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'calendar' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 150ms',
                }}
              >
                <CalendarIcon />
                Calendar
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Content */}
      {viewMode === 'list' ? (
        <div className={`site-kit-events-list ${listClassName}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayEvents.map(eventItem => {
              const nextSchedule = eventItem.next_schedule || eventItem.schedules?.[0]
              const isFree = !eventItem.price || eventItem.price === 0
              
              return (
                <div
                  key={eventItem.id}
                  className={`site-kit-event-card ${eventCardClassName}`}
                  onClick={() => nextSchedule && handleEventClick(eventItem, nextSchedule)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1.25rem',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    cursor: nextSchedule ? 'pointer' : 'default',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    if (nextSchedule) {
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
                        {eventItem.name}
                      </h3>
                      {eventItem.short_description && (
                        <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>
                          {eventItem.short_description}
                        </p>
                      )}
                    </div>
                    
                    {eventItem.price_is_public && (
                      <div style={{
                        padding: '0.375rem 0.75rem',
                        background: isFree ? '#dcfce7' : '#dbeafe',
                        color: isFree ? '#166534' : '#1e40af',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {isFree ? 'Free' : formatPrice(eventItem.price ?? 0, eventItem.currency)}
                      </div>
                    )}
                  </div>
                  
                  {nextSchedule && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <CalendarIcon />
                        {formatDate(nextSchedule.starts_at)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <ClockIcon />
                        {formatTime(nextSchedule.starts_at)}
                      </span>
                      {eventItem.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <LocationIcon />
                          {eventItem.location}
                        </span>
                      )}
                      {nextSchedule.spots_remaining !== null && nextSchedule.spots_remaining !== undefined && (
                        <span style={{
                          color: nextSchedule.spots_remaining < 5 ? '#dc2626' : '#6b7280',
                          fontWeight: nextSchedule.spots_remaining < 5 ? 500 : 400,
                        }}>
                          {nextSchedule.spots_remaining === 0 
                            ? 'Sold Out' 
                            : `${nextSchedule.spots_remaining} spots left`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {showViewAll && events.length > limit && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <a
                href={viewAllUrl}
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#1f2937',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  transition: 'all 150ms',
                }}
              >
                {viewAllText}
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className={`site-kit-events-calendar ${calendarClassName}`}>
          <CalendarView
            events={events}
            onEventClick={handleEventClick}
            showNavigation={true}
            showHeader={true}
          />
        </div>
      )}
      
      {/* Registration Modal */}
      <EventModal
        event={event}
        schedule={schedule}
        isOpen={isOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
        onError={handleError}
        collectPhone={collectPhone}
        additionalFields={additionalFields}
        className={modalClassName}
      />
    </div>
  )
}

// ============================================
// Helpers
// ============================================

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
  }
  return 'https://api.uptrademedia.com'
}

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    return (window as any).__SITE_KIT_API_KEY__ || ''
  }
  return ''
}

export default EventsWidget
