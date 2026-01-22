/**
 * @uptrade/site-kit/commerce - UpcomingEvents
 * 
 * Displays a list of upcoming events with date, title, and registration buttons.
 */

'use client'

import React, { useEffect, useState } from 'react'
import type { UpcomingEventsProps, CommerceOffering } from './types'
import { EventTile } from './EventTile'
import { fetchUpcomingEvents } from './api'

export function UpcomingEvents({
  events: propEvents,
  limit = 3,
  category,
  variant = 'standard',
  layout = 'vertical',
  showViewAll = true,
  viewAllUrl = '/events',
  viewAllText = 'View All Events',
  emptyMessage = 'No upcoming events.',
  title,
  onRegister,
  onCtaClick,
  className = '',
  titleClassName = '',
  eventClassName = '',
}: UpcomingEventsProps) {
  const [events, setEvents] = useState<CommerceOffering[]>(propEvents || [])
  const [loading, setLoading] = useState(!propEvents)
  
  useEffect(() => {
    if (propEvents) {
      setEvents(propEvents)
      return
    }
    
    async function load() {
      setLoading(true)
      try {
        const data = await fetchUpcomingEvents({ limit, category })
        setEvents(data)
      } catch (e) {
        console.error('Failed to load events:', e)
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [propEvents, limit, category])
  
  if (loading) {
    return (
      <div className={`site-kit-upcoming-events ${className}`}>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          Loading events...
        </div>
      </div>
    )
  }
  
  if (events.length === 0) {
    return (
      <div className={`site-kit-upcoming-events ${className}`}>
        {title && (
          <h2 className={`site-kit-upcoming-events-title ${titleClassName}`} style={{
            margin: '0 0 1rem',
            fontSize: '1.5rem',
            fontWeight: 600,
          }}>
            {title}
          </h2>
        )}
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          {emptyMessage}
        </div>
      </div>
    )
  }
  
  const layoutStyles = layout === 'horizontal' ? {
    display: 'flex',
    gap: '1rem',
    overflowX: 'auto' as const,
  } : {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  }
  
  return (
    <div className={`site-kit-upcoming-events ${className}`}>
      {title && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h2 className={`site-kit-upcoming-events-title ${titleClassName}`} style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 600,
          }}>
            {title}
          </h2>
          
          {showViewAll && events.length >= limit && (
            <a
              href={viewAllUrl}
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {viewAllText} →
            </a>
          )}
        </div>
      )}
      
      <div style={layoutStyles}>
        {events.map(event => (
          <div 
            key={event.id} 
            className={eventClassName}
            style={layout === 'horizontal' ? { minWidth: '280px', flex: '0 0 auto' } : undefined}
          >
            <EventTile
              event={event}
              variant={variant}
              onRegister={onRegister}
              onCtaClick={onCtaClick}
            />
          </div>
        ))}
      </div>
      
      {showViewAll && events.length >= limit && !title && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a
            href={viewAllUrl}
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#f3f4f6',
              color: '#333',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {viewAllText}
          </a>
        </div>
      )}
    </div>
  )
}

export default UpcomingEvents
