/**
 * @uptrade/site-kit/reputation - Testimonial Section
 * 
 * Displays client reviews in a rotating carousel
 * Fetches published reviews from Portal API public endpoint
 * 
 * Minimal styling - let site CSS control appearance
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { fetchReviews } from './api'
import type { Review, TestimonialSectionProps } from './types'

export function TestimonialSection({
  title,
  subtitle,
  autoplay = true,
  autoplayInterval = 5000,
  showRating = true,
  maxReviews,
  featuredOnly = false,
  service,
  className = '',
}: TestimonialSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')

  // Load reviews
  useEffect(() => {
    async function loadReviews() {
      setIsLoading(true)
      const data = await fetchReviews({
        service,
        limit: maxReviews,
        featured: featuredOnly,
      })
      setReviews(data)
      setIsLoading(false)
    }
    loadReviews()
  }, [service, maxReviews, featuredOnly])

  // Auto-rotate
  useEffect(() => {
    if (!autoplay || reviews.length <= 1) return

    const interval = setInterval(() => {
      setDirection('next')
      setCurrentIndex((prev) => (prev + 1) % reviews.length)
    }, autoplayInterval)

    return () => clearInterval(interval)
  }, [autoplay, autoplayInterval, reviews.length])

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentIndex ? 'next' : 'prev')
    setCurrentIndex(index)
  }, [currentIndex])

  const nextSlide = useCallback(() => {
    setDirection('next')
    setCurrentIndex((prev) => (prev + 1) % reviews.length)
  }, [reviews.length])

  const prevSlide = useCallback(() => {
    setDirection('prev')
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length)
  }, [reviews.length])

  if (isLoading) {
    return null // Let site handle loading state
  }

  if (!reviews.length) {
    return null
  }

  const currentReview = reviews[currentIndex]

  return (
    <section className={`testimonial-section ${className}`} data-site-kit-testimonials>
      <style>{`
        .testimonial-section {
          position: relative;
          padding: 4rem 1rem;
        }
        
        .testimonial-content {
          position: relative;
          overflow: hidden;
        }
        
        .testimonial-slide {
          animation: ${direction === 'next' ? 'slideInRight' : 'slideInLeft'} 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .testimonial-quote-icon {
          font-size: 4rem;
          line-height: 1;
          text-align: center;
          margin-bottom: 1.5rem;
          opacity: 0.15;
        }
        
        .testimonial-stars {
          display: flex;
          justify-content: center;
          gap: 0.25rem;
          margin-bottom: 1.5rem;
        }
        
        .testimonial-quote {
          text-align: center;
          font-size: 1.25rem;
          line-height: 1.8;
          margin-bottom: 2rem;
        }
        
        .testimonial-author {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        
        .testimonial-avatar {
          width: 4rem;
          height: 4rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        
        .testimonial-name {
          font-weight: 600;
          font-size: 1.125rem;
        }
        
        .testimonial-role {
          font-size: 0.875rem;
          opacity: 0.7;
        }
        
        .testimonial-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 2rem;
        }
        
        .testimonial-nav-button {
          border: none;
          background: none;
          cursor: pointer;
          padding: 0.5rem;
          transition: opacity 0.2s;
          font-size: 1.5rem;
        }
        
        .testimonial-nav-button:hover {
          opacity: 0.7;
        }
        
        .testimonial-nav-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      `}</style>

      <div className="container">
        {title && <h2 className="testimonial-title">{title}</h2>}
        {subtitle && <p className="testimonial-subtitle">{subtitle}</p>}

        <div className="testimonial-content">
          <div className="testimonial-slide" key={currentIndex}>
            {/* Quote Icon - site can style this */}
            <div className="testimonial-quote-icon">&ldquo;</div>

            {/* Stars */}
            {showRating && (
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`star ${i < currentReview.rating ? 'star-filled' : 'star-empty'}`}
                    aria-hidden="true"
                  >
                    ★
                  </span>
                ))}
              </div>
            )}

            {/* Quote Text */}
            <blockquote className="testimonial-quote">
              &ldquo;{currentReview.quote}&rdquo;
            </blockquote>

            {/* Author */}
            <div className="testimonial-author">
              <div className="testimonial-avatar" aria-hidden="true">
                {currentReview.image ? (
                  <img src={currentReview.image} alt="" />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <div className="testimonial-author-info">
                <div className="testimonial-name">{currentReview.name}</div>
                {currentReview.role && (
                  <div className="testimonial-role">{currentReview.role}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        {reviews.length > 1 && (
          <div className="testimonial-nav">
            <button
              onClick={prevSlide}
              className="testimonial-nav-button testimonial-nav-prev"
              aria-label="Previous review"
              disabled={reviews.length <= 1}
            >
              ‹
            </button>

            <button
              onClick={nextSlide}
              className="testimonial-nav-button testimonial-nav-next"
              aria-label="Next review"
              disabled={reviews.length <= 1}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
