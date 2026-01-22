/**
 * @uptrade/site-kit/commerce - EventTile
 * 
 * Compact tile for displaying an event with date, title, and registration button.
 * Great for embedding on homepages or sidebars.
 */

'use client'

import React, { useState } from 'react'
import type { EventTileProps, CommerceOffering } from './types'
import { formatDate, formatTime, getRelativeTimeUntil, getSpotsRemaining, isEventSoldOut } from './utils'
import { registerForEvent, createCheckoutSession } from './api'

export function EventTile({
  event,
  variant = 'standard',
  showDate = true,
  showTime = true,
  showLocation = true,
  showCapacity = true,
  showPrice = true,
  showCta = true,
  ctaText,
  onRegister,
  onCtaClick,
  className = '',
  dateClassName = '',
  titleClassName = '',
  ctaClassName = '',
}: EventTileProps) {
  const [loading, setLoading] = useState(false)
  
  const schedule = event.schedules?.[0] || (event as any).next_schedule
  const soldOut = schedule ? isEventSoldOut(schedule.capacity, schedule.current_registrations) : false
  const spotsRemaining = schedule ? getSpotsRemaining(schedule.capacity, schedule.current_registrations) : null
  
  const defaultCtaText = event.price && event.price > 0 ? 'Get Tickets' : 'Register Free'
  
  const handleClick = async () => {
    if (onCtaClick) {
      onCtaClick(event)
      return
    }
    
    // If no schedule, go to event page
    if (!schedule) {
      window.location.href = `/events/${event.slug}`
      return
    }
    
    // If custom onRegister handler
    if (onRegister) {
      onRegister(event, schedule.id)
      return
    }
    
    // Default: create checkout session for paid, or go to registration page
    setLoading(true)
    try {
      if (event.price && event.price > 0) {
        const result = await createCheckoutSession(event.id, { scheduleId: schedule.id })
        if (result.payment_url) {
          window.location.href = result.payment_url
        }
      } else {
        // Free event - go to registration page
        window.location.href = `/events/${event.slug}/register`
      }
    } catch (e) {
      console.error('Registration error:', e)
    } finally {
      setLoading(false)
    }
  }
  
  if (variant === 'compact') {
    return (
      <div className={`site-kit-event-tile-compact ${className}`} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}>
        {showDate && schedule && (
          <div className={`site-kit-event-date ${dateClassName}`} style={{
            minWidth: '48px',
            textAlign: 'center',
            padding: '0.5rem',
            background: '#f3f4f6',
            borderRadius: '6px',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase' }}>
              {new Date(schedule.starts_at).toLocaleDateString('en-US', { month: 'short' })}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111' }}>
              {new Date(schedule.starts_at).getDate()}
            </div>
          </div>
        )}
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 className={`site-kit-event-title ${titleClassName}`} style={{
            margin: 0,
            fontSize: '0.875rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {event.name}
          </h4>
          {showTime && schedule && (
            <div style={{ fontSize: '0.75rem', color: '#666' }}>
              {formatTime(schedule.starts_at)}
              {showLocation && event.location && ` • ${event.location}`}
            </div>
          )}
        </div>
        
        {showCta && (
          <button
            onClick={handleClick}
            disabled={soldOut || loading}
            className={`site-kit-event-cta ${ctaClassName}`}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: 'none',
              background: soldOut ? '#e5e7eb' : '#2563eb',
              color: soldOut ? '#666' : 'white',
              cursor: soldOut ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {soldOut ? 'Sold Out' : (loading ? '...' : (ctaText || defaultCtaText))}
          </button>
        )}
      </div>
    )
  }
  
  // Standard variant
  return (
    <div className={`site-kit-event-tile ${className}`} style={{
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {event.featured_image_url && (
        <img
          src={event.featured_image_url}
          alt={event.name}
          style={{
            width: '100%',
            height: '140px',
            objectFit: 'cover',
          }}
        />
      )}
      
      <div style={{ padding: '1rem' }}>
        {showDate && schedule && (
          <div className={`site-kit-event-date ${dateClassName}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
          }}>
            <span style={{
              background: '#dbeafe',
              color: '#1d4ed8',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              {getRelativeTimeUntil(schedule.starts_at)}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>
              {formatDate(schedule.starts_at)}
            </span>
          </div>
        )}
        
        <h3 className={`site-kit-event-title ${titleClassName}`} style={{
          margin: '0 0 0.5rem',
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#111',
        }}>
          {event.name}
        </h3>
        
        {showLocation && event.location && (
          <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
            📍 {event.location}
          </div>
        )}
        
        {showTime && schedule && (
          <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.75rem' }}>
            🕐 {formatTime(schedule.starts_at)}
            {schedule.ends_at && ` - ${formatTime(schedule.ends_at)}`}
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '0.75rem',
        }}>
          <div>
            {showPrice && event.price_is_public && event.price != null && (
              <span style={{ fontWeight: 600, color: '#111' }}>
                {event.price === 0 ? 'Free' : `$${event.price}`}
              </span>
            )}
            {showCapacity && spotsRemaining !== null && spotsRemaining <= 10 && !soldOut && (
              <span style={{ 
                fontSize: '0.75rem', 
                color: '#dc2626',
                marginLeft: '0.5rem',
              }}>
                Only {spotsRemaining} spots left!
              </span>
            )}
          </div>
          
          {showCta && (
            <button
              onClick={handleClick}
              disabled={soldOut || loading}
              className={`site-kit-event-cta ${ctaClassName}`}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: soldOut ? '#e5e7eb' : '#2563eb',
                color: soldOut ? '#666' : 'white',
                cursor: soldOut ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              {soldOut ? 'Sold Out' : (loading ? 'Loading...' : (ctaText || defaultCtaText))}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventTile
