// src/components/analytics/AnalyticsModuleWrapper.jsx
// Wrapper for embedding Analytics module in MainLayout

import { useEffect, useRef } from 'react'
import useAnalyticsStore from '@/lib/analytics-store'
import useSiteAnalyticsStore from '@/lib/site-analytics-store'
import useAuthStore from '@/lib/auth-store'
import { seoApi } from '@/lib/portal-api'
import AnalyticsDashboard from '@/pages/analytics/AnalyticsDashboard'

export default function AnalyticsModuleWrapper({ onNavigate }) {
  const { currentProject } = useAuthStore()
  const { reset, buildHierarchy, setHierarchyLoading } = useAnalyticsStore()
  const { fetchAllAnalytics, setProjectId } = useSiteAnalyticsStore()
  
  // Use ref to access topPages without triggering re-renders
  const topPagesRef = useRef([])
  const topPages = useSiteAnalyticsStore(state => state.topPages)
  topPagesRef.current = topPages

  useEffect(() => {
    if (currentProject?.id) {
      // Set project ID for analytics filtering
      setProjectId(currentProject.id)
      
      // Fetch all analytics data
      fetchAllAnalytics()
      
      // Fetch canonical pages from seo_pages (populated by SitemapSync)
      // This is the source of truth for what pages exist on the site
      setHierarchyLoading(true)
      seoApi.listPages(currentProject.id, { limit: 200 }).then(response => {
        // API returns { pages: [...], total, page, limit, totalPages }
        const seoPages = response?.data?.pages || []
        
        console.log('[Analytics] SEO Pages received:', seoPages)
        
        if (seoPages.length > 0) {
          // Transform seo_pages to format expected by buildHierarchy
          // Filter out internal pages like /_uptrade/setup
          const pagesForHierarchy = seoPages
            .filter(page => {
              const path = page.path || page.url || '/'
              // Exclude internal uptrade pages
              return !path.includes('_uptrade') && !path.includes('%5Fuptrade')
            })
            .map(page => ({
              path: page.path || page.url || '/',
              name: page.title || page.path || '/',
              views: 0, // Will be enriched by analytics data
              sessions: 0,
            }))
          
          console.log('[Analytics] Pages for hierarchy:', pagesForHierarchy)
          buildHierarchy(pagesForHierarchy)
        } else {
          // Fallback: if no seo_pages, use analytics top pages
          console.log('[Analytics] No seo_pages found, using analytics topPages as fallback')
          const currentTopPages = topPagesRef.current
          if (currentTopPages && currentTopPages.length > 0) {
            buildHierarchy(currentTopPages)
          }
        }
        setHierarchyLoading(false)
      }).catch(err => {
        console.warn('[Analytics] Error fetching seo_pages:', err)
        // Fallback to topPages from analytics
        const currentTopPages = topPagesRef.current
        if (currentTopPages && currentTopPages.length > 0) {
          buildHierarchy(currentTopPages)
        }
        setHierarchyLoading(false)
      })
    }
    
    // Cleanup on project change
    return () => {
      reset()
    }
  }, [currentProject?.id, setProjectId, fetchAllAnalytics, buildHierarchy, reset, setHierarchyLoading])

  return <AnalyticsDashboard onNavigate={onNavigate} />
}
