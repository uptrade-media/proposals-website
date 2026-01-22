/**
 * @uptrade/site-kit/commerce - OfferingCard
 * 
 * Displays a single product, service, event, or class with image, title, price, and CTA.
 */

'use client'

import React from 'react'
import type { OfferingCardProps } from './types'
import { formatPrice, formatDate } from './utils'

export function OfferingCard({
  offering,
  variant = 'card',
  showImage = true,
  showPrice = true,
  showDescription = true,
  showCta = true,
  ctaText,
  onCtaClick,
  className = '',
  imageClassName = '',
  titleClassName = '',
  priceClassName = '',
  descriptionClassName = '',
  ctaClassName = '',
}: OfferingCardProps) {
  const isEvent = offering.type === 'event' || offering.type === 'class'
  const nextSchedule = offering.schedules?.[0] || (offering as any).next_schedule
  
  // Default CTA text based on type
  const defaultCtaText = {
    product: 'Buy Now',
    service: 'Book Now',
    class: 'Register',
    event: 'Get Tickets',
    subscription: 'Subscribe',
  }[offering.type] || 'View Details'
  
  const handleClick = () => {
    if (onCtaClick) {
      onCtaClick(offering)
    } else if (typeof window !== 'undefined') {
      // Default: navigate to offering page
      const basePath = offering.type === 'event' ? '/events' : 
                       offering.type === 'product' ? '/shop' : 
                       '/services'
      window.location.href = `${basePath}/${offering.slug}`
    }
  }
  
  if (variant === 'minimal') {
    return (
      <div className={`site-kit-offering-minimal ${className}`}>
        <h3 className={`site-kit-offering-title ${titleClassName}`}>
          {offering.name}
        </h3>
        {showPrice && offering.price_is_public && offering.price != null && (
          <span className={`site-kit-offering-price ${priceClassName}`}>
            {formatPrice(offering.price, offering.currency)}
          </span>
        )}
        {showCta && (
          <button
            onClick={handleClick}
            className={`site-kit-offering-cta ${ctaClassName}`}
          >
            {ctaText || defaultCtaText}
          </button>
        )}
      </div>
    )
  }
  
  if (variant === 'horizontal') {
    return (
      <div className={`site-kit-offering-horizontal ${className}`} style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
      }}>
        {showImage && offering.featured_image_url && (
          <img
            src={offering.featured_image_url}
            alt={offering.name}
            className={`site-kit-offering-image ${imageClassName}`}
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <h3 className={`site-kit-offering-title ${titleClassName}`} style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 600,
          }}>
            {offering.name}
          </h3>
          
          {isEvent && nextSchedule && (
            <div className="site-kit-offering-date" style={{ 
              color: '#666',
              fontSize: '0.875rem',
              marginTop: '0.25rem',
            }}>
              {formatDate(nextSchedule.starts_at)}
              {offering.location && ` • ${offering.location}`}
            </div>
          )}
          
          {showDescription && offering.short_description && (
            <p className={`site-kit-offering-description ${descriptionClassName}`} style={{
              color: '#666',
              margin: '0.5rem 0',
              fontSize: '0.875rem',
            }}>
              {offering.short_description}
            </p>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            {showPrice && offering.price_is_public && offering.price != null && (
              <span className={`site-kit-offering-price ${priceClassName}`} style={{
                fontWeight: 600,
                color: '#333',
              }}>
                {formatPrice(offering.price, offering.currency)}
                {offering.compare_at_price && (
                  <span style={{ 
                    textDecoration: 'line-through', 
                    color: '#999',
                    marginLeft: '0.5rem',
                    fontWeight: 400,
                  }}>
                    {formatPrice(offering.compare_at_price, offering.currency)}
                  </span>
                )}
              </span>
            )}
            
            {showCta && (
              <button
                onClick={handleClick}
                className={`site-kit-offering-cta ${ctaClassName}`}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {ctaText || defaultCtaText}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // Default: card variant
  return (
    <div className={`site-kit-offering-card ${className}`} style={{
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      background: 'white',
    }}>
      {showImage && offering.featured_image_url && (
        <div style={{ position: 'relative' }}>
          <img
            src={offering.featured_image_url}
            alt={offering.name}
            className={`site-kit-offering-image ${imageClassName}`}
            style={{
              width: '100%',
              height: '200px',
              objectFit: 'cover',
            }}
          />
          {offering.compare_at_price && offering.price_is_public && (
            <span style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: '#ef4444',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              Sale
            </span>
          )}
        </div>
      )}
      
      <div style={{ padding: '1rem' }}>
        {isEvent && nextSchedule && (
          <div className="site-kit-offering-date" style={{ 
            color: '#2563eb',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '0.25rem',
          }}>
            {formatDate(nextSchedule.starts_at)}
          </div>
        )}
        
        <h3 className={`site-kit-offering-title ${titleClassName}`} style={{
          margin: 0,
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#111',
        }}>
          {offering.name}
        </h3>
        
        {isEvent && offering.location && (
          <div style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            📍 {offering.location}
          </div>
        )}
        
        {showDescription && offering.short_description && (
          <p className={`site-kit-offering-description ${descriptionClassName}`} style={{
            color: '#666',
            margin: '0.75rem 0',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}>
            {offering.short_description}
          </p>
        )}
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginTop: '1rem',
        }}>
          {showPrice && offering.price_is_public && offering.price != null ? (
            <div className={`site-kit-offering-price ${priceClassName}`}>
              <span style={{ fontWeight: 600, fontSize: '1.25rem', color: '#111' }}>
                {formatPrice(offering.price, offering.currency)}
              </span>
              {offering.compare_at_price && (
                <span style={{ 
                  textDecoration: 'line-through', 
                  color: '#999',
                  marginLeft: '0.5rem',
                  fontSize: '0.875rem',
                }}>
                  {formatPrice(offering.compare_at_price, offering.currency)}
                </span>
              )}
            </div>
          ) : (
            <div /> // spacer
          )}
          
          {showCta && (
            <button
              onClick={handleClick}
              className={`site-kit-offering-cta ${ctaClassName}`}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                background: '#2563eb',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              {ctaText || defaultCtaText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OfferingCard
