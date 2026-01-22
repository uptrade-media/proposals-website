import { useEffect, useRef } from 'react'
import ProposalView from './ProposalView'
import { proposalsApi } from '@/lib/portal-api'

/**
 * ProposalTemplate - Wrapper for public/client proposal views
 * Uses ProposalView for rendering, adds analytics tracking for public views
 */
const ProposalTemplate = ({ proposal, proposalId, proposalSlug, isPublicView = false, onBack }) => {
  // Analytics tracking refs (only for public views)
  const startTimeRef = useRef(Date.now())
  const maxScrollDepthRef = useRef(0)
  const sectionsViewedRef = useRef(new Set())
  const lastScrollTrackRef = useRef(0)
  const timeTrackIntervalRef = useRef(null)

  // Track analytics event
  const trackEvent = async (eventType, metadata = {}) => {
    if (!isPublicView || !proposal?.id) return
    
    try {
      await proposalsApi.trackView(proposal.id)
    } catch (err) {
      // Silently fail - analytics shouldn't break the user experience
      console.warn('Failed to track event:', err)
    }
  }

  // Track time spent periodically
  useEffect(() => {
    if (!isPublicView || !proposal?.id) return

    // Track time spent every 30 seconds
    timeTrackIntervalRef.current = setInterval(() => {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
      trackEvent('time_spent', { duration: timeSpent, cumulative: true })
    }, 30000)

    // Cleanup and send final time on unmount
    return () => {
      if (timeTrackIntervalRef.current) {
        clearInterval(timeTrackIntervalRef.current)
      }
      const finalTimeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (finalTimeSpent > 5) {
        trackEvent('time_spent', { duration: finalTimeSpent, final: true })
      }
    }
  }, [isPublicView, proposal?.id])

  // Track scroll depth
  useEffect(() => {
    if (!isPublicView || !proposal?.id) return

    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = Math.round((scrollTop / docHeight) * 100)
      
      if (scrollPercent > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = scrollPercent
        
        const milestones = [25, 50, 75, 90, 100]
        const now = Date.now()
        
        for (const milestone of milestones) {
          if (scrollPercent >= milestone && lastScrollTrackRef.current < milestone) {
            if (now - lastScrollTrackRef.current > 2000) {
              trackEvent('scroll', { scrollDepth: milestone, maxDepth: maxScrollDepthRef.current })
              lastScrollTrackRef.current = milestone
            }
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isPublicView, proposal?.id])

  // Track section visibility with Intersection Observer
  useEffect(() => {
    if (!isPublicView || !proposal?.id) return

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section')
            if (sectionId && !sectionsViewedRef.current.has(sectionId)) {
              sectionsViewedRef.current.add(sectionId)
              trackEvent('section_view', { section: sectionId })
            }
          }
        })
      },
      { threshold: 0.3 }
    )

    const sections = document.querySelectorAll('[data-section]')
    sections.forEach((section) => sectionObserver.observe(section))

    return () => sectionObserver.disconnect()
  }, [isPublicView, proposal?.id])

  // Track PDF download
  const handleExportPDF = () => {
    if (isPublicView) {
      trackEvent('click', { action: 'pdf_download' })
    }
  }

  return (
    <ProposalView 
      proposal={proposal}
      isPublicView={isPublicView}
      onBack={onBack}
      onExportPDF={handleExportPDF}
    />
  )
}

export default ProposalTemplate
