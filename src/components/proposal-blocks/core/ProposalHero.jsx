/**
 * ProposalHero - Immersive opening section
 * 
 * Sets the tone for the proposal with Uptrade branding,
 * client info, and urgency triggers for high conversion.
 */

import { cn } from '@/lib/utils'
import { Calendar, Building2, FileText, Clock, Zap, AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'

// Calculate countdown to expiration
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, expired: false })
  
  useEffect(() => {
    if (!targetDate) return
    
    const calculateTime = () => {
      const now = new Date()
      const target = new Date(targetDate)
      const diff = target - now
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, expired: true })
        return
      }
      
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        expired: false
      })
    }
    
    calculateTime()
    const interval = setInterval(calculateTime, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [targetDate])
  
  return timeLeft
}

export function ProposalHero({
  title,
  subtitle,
  clientName,
  clientCompany,
  proposalDate,
  validUntil,
  proposalNumber,
  heroImage,
  urgencyMessage,
  limitedSlots,
  className = ''
}) {
  const countdown = useCountdown(validUntil)
  
  const formatDate = (date) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Show urgency banner if less than 7 days left
  const showUrgency = countdown.days <= 7 && countdown.days > 0 && !countdown.expired

  return (
    <section 
      className={cn(
        'relative min-h-[70vh] flex items-center justify-center overflow-hidden',
        className
      )}
    >
      {/* Background */}
      {heroImage ? (
        <>
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--brand-green)]/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--brand-teal)]/20 rounded-full blur-3xl" />
          </div>
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px'
            }}
          />
        </div>
      )}
      
      {/* Uptrade Media Logo - Top Left */}
      <div className="absolute top-6 left-6 z-20">
        <img 
          src="/uptrade_media_logo_white.png" 
          alt="Uptrade Media" 
          className="h-10 sm:h-12 w-auto drop-shadow-lg"
        />
      </div>

      {/* Urgency Banner - Top Right */}
      {(showUrgency || limitedSlots) && (
        <div className="absolute top-6 right-6 z-20">
          <div className="flex flex-col items-end gap-2">
            {showUrgency && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                bg-orange-500/90 text-white text-sm font-semibold animate-pulse">
                <Clock className="w-4 h-4" />
                <span>
                  {countdown.days > 0 
                    ? `${countdown.days} day${countdown.days > 1 ? 's' : ''} left`
                    : `${countdown.hours} hours left`
                  }
                </span>
              </div>
            )}
            {limitedSlots && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                bg-red-500/90 text-white text-sm font-semibold">
                <Zap className="w-4 h-4" />
                <span>{limitedSlots}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expired Banner */}
      {countdown.expired && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-red-600 text-white py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">This proposal has expired. Contact us to discuss updated pricing.</span>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 py-24 text-center">
        {/* Client badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8
          bg-white/10 backdrop-blur-sm border border-white/20 text-white/90">
          <Building2 className="w-4 h-4" />
          <span className="text-sm font-medium">
            Prepared exclusively for {clientCompany || clientName}
          </span>
        </div>
        
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          {title}
        </h1>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-xl sm:text-2xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Urgency Message */}
        {urgencyMessage && (
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl mb-10
            bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-200">
            <Zap className="w-5 h-5 text-orange-400" />
            <span className="font-medium">{urgencyMessage}</span>
          </div>
        )}
        
        {/* Meta strip */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
          {proposalDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(proposalDate)}</span>
            </div>
          )}
          
          {validUntil && !countdown.expired && (
            <div className={cn(
              "flex items-center gap-2",
              showUrgency && "text-orange-300"
            )}>
              <Clock className="w-4 h-4" />
              <span>Valid until {formatDate(validUntil)}</span>
            </div>
          )}
          
          {proposalNumber && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="font-mono">#{proposalNumber}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  )
}
