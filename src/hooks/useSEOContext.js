// src/hooks/useSEOContext.js
// Unified context hook for SEO module components
// Eliminates prop drilling and ensures consistent projectId access
import { useMemo } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import useAuthStore from '@/lib/auth-store'

/**
 * Provides consistent SEO context to all child components
 * Use this instead of passing projectId/site as props
 * 
 * @returns {Object} SEO context with:
 *   - projectId: string | null - The current site's UUID
 *   - site: object | null - Full site object with all fields
 *   - domain: string | null - The site's domain
 *   - isReady: boolean - Whether site data is loaded and available
 *   - isLoading: boolean - Whether site data is currently loading
 *   - error: string | null - Any error message
 *   - orgId: string | null - Current organization ID
 *   - orgDomain: string | null - Organization's domain (for GSC)
 */
export function useSEOContext() {
  const { currentOrg } = useAuthStore()
  const { 
    currentProject, 
    projectsLoading, 
    projectsError 
  } = useSeoStore()

  return useMemo(() => ({
    // Core identifiers
    projectId: currentProject?.id ?? null,
    site: currentProject,
    domain: currentProject?.domain ?? null,
    
    // Status flags
    isReady: !!currentProject?.id,
    isLoading: projectsLoading,
    error: projectsError,
    
    // Org context (for GSC which uses org domain)
    orgId: currentOrg?.id ?? null,
    orgDomain: currentOrg?.domain ?? null,
    
    // Setup status - support both old (gsc_access_token) and new (gscConnected) format
    setupCompleted: currentProject?.setup_completed === true,
    hasGscConnected: !!currentProject?.gscConnected || !!currentProject?.gsc_access_token,
    
    // Derived values
    sitemapUrl: currentProject?.sitemap_url ?? (currentProject?.domain ? `https://${currentProject.domain}/sitemap.xml` : null),
  }), [currentProject, projectsLoading, projectsError, currentOrg])
}

/**
 * Hook to get SEO setup status
 * Determines which view to show (wizard, resume, or dashboard)
 */
export function useSEOSetupStatus() {
  const { site, isLoading, orgDomain, orgId } = useSEOContext()
  const { siteKnowledge, siteKnowledgeLoading } = useSeoStore()

  return useMemo(() => {
    // Still loading
    if (isLoading || siteKnowledgeLoading) {
      return { status: 'loading', ready: false }
    }

    // No org domain configured
    if (!orgDomain) {
      return { status: 'no-domain', ready: false }
    }

    // No SEO site exists yet
    if (!site) {
      return { status: 'needs-setup', ready: false }
    }

    // Site exists but setup not completed
    if (!site.setup_completed) {
      // Check if any progress has been made
      const hasPages = (site.pages_indexed || 0) > 0 || (site.pages_not_indexed || 0) > 0
      const hasBrain = siteKnowledge?.training_status === 'completed'
      
      if (hasPages || hasBrain) {
        return { status: 'incomplete', ready: false, progress: { hasPages, hasBrain } }
      }
      
      return { status: 'needs-setup', ready: false }
    }

    // Fully set up and ready
    return { status: 'ready', ready: true }
  }, [site, isLoading, siteKnowledgeLoading, orgDomain, orgId, siteKnowledge])
}

/**
 * Hook to get GSC connection status
 */
export function useGSCStatus() {
  const { site, orgDomain } = useSEOContext()
  const { gscOverview, gscLoading, gscError } = useSeoStore()

  return useMemo(() => {
    if (gscLoading) return { status: 'checking', connected: false }
    if (gscError) return { status: 'error', connected: false, error: gscError }
    if (!site?.gsc_access_token) return { status: 'not-connected', connected: false }
    if (gscOverview?.metrics) return { status: 'connected', connected: true, lastSync: site.gsc_last_sync_at }
    return { status: 'unknown', connected: false }
  }, [site, gscOverview, gscLoading, gscError])
}

export default useSEOContext
