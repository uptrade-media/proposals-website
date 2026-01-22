/**
 * @uptrade/site-kit/commerce - EventEmbed
 * 
 * Embeddable widget for displaying an event on a homepage or landing page.
 * Great for featuring the next upcoming event.
 */

'use client'

import React, { useEffect, useState } from 'react'
import type { EventEmbedProps, CommerceOffering } from './types'
import { EventTile } from './EventTile'
import { fetchOffering, fetchNextEvent } from './api'

export function EventEmbed({
  event: propEvent,
  slug,
  mode = 'next', // 'specific', 'next'
  category,
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
}: EventEmbedProps) {
  const [event, setEvent] = useState<CommerceOffering | null>(propEvent || null)
  const [loading, setLoading] = useState(!propEvent && (!!slug || mode === 'next'))
  
  useEffect(() => {
    if (propEvent) {
      setEvent(propEvent)
      return
    }
    
    async function load() {
      setLoading(true)
      try {
        let data: CommerceOffering | null = null
        
        if (mode === 'specific' && slug) {
          data = await fetchOffering(slug)
        } else if (mode === 'next') {
          data = await fetchNextEvent(category)
        }
        
        setEvent(data)
      } catch (e) {
        console.error('Failed to load event:', e)
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [propEvent, slug, mode, category])
  
  if (loading) {
    return (
      <div className={`site-kit-event-embed ${className}`} style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#f9fafb',
        borderRadius: '12px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          margin: '0 auto',
          border: '3px solid #e5e7eb',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }
  
  if (!event) {
    return null // Silent fail - don't show anything if no event
  }
  
  return (
    <div className={`site-kit-event-embed ${className}`}>
      <EventTile
        event={event}
        variant={variant}
        showDate={showDate}
        showTime={showTime}
        showLocation={showLocation}
        showCapacity={showCapacity}
        showPrice={showPrice}
        showCta={showCta}
        ctaText={ctaText}
        onRegister={onRegister}
        onCtaClick={onCtaClick}
      />
    </div>
  )
}

export default EventEmbed
