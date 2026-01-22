// src/pages/analytics/AnalyticsModule.jsx
// Analytics Module Router - handles all /analytics/* routes
// Renders the AnalyticsDashboard with sidebar navigation and multiple views

import { lazy, Suspense, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import UptradeLoading from '@/components/UptradeLoading'
import useAuthStore from '@/lib/auth-store'
import useAnalyticsStore from '@/lib/analytics-store'
import useSiteAnalyticsStore from '@/lib/site-analytics-store'
import { seoApi } from '@/lib/portal-api'

// Lazy load the main dashboard
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'))

// Wrapper to initialize data before rendering
function AnalyticsModuleInner({ children }) {
  const { currentProject } = useAuthStore()
  const { reset, buildHierarchy } = useAnalyticsStore()
  const { topPages, setProjectId } = useSiteAnalyticsStore()

  useEffect(() => {
    if (currentProject?.id) {
      setProjectId(currentProject.id)
      
      // Fetch canonical pages from seo_pages (populated by SitemapSync)
      seoApi.listPages(currentProject.id, { limit: 200 }).then(response => {
        const seoPages = response?.data?.data || response?.data || []
        
        if (seoPages.length > 0) {
          // Transform seo_pages to format expected by buildHierarchy
          const pagesForHierarchy = seoPages.map(page => ({
            path: page.path || page.url || '/',
            name: page.title || page.path || '/',
            views: 0,
            sessions: 0,
          }))
          
          buildHierarchy(pagesForHierarchy)
        } else if (topPages && topPages.length > 0) {
          // Fallback to analytics topPages
          buildHierarchy(topPages)
        }
      }).catch(err => {
        console.warn('[Analytics] Error fetching seo_pages:', err)
        if (topPages && topPages.length > 0) {
          buildHierarchy(topPages)
        }
      })
    }
    
    // Cleanup on project change
    return () => {
      reset()
    }
  }, [currentProject?.id, setProjectId, buildHierarchy, reset, topPages])

  return children
}

export default function AnalyticsModule() {
  return (
    <MainLayout>
      <AnalyticsModuleInner>
        <Suspense fallback={<UptradeLoading />}>
          <AnalyticsDashboard />
        </Suspense>
      </AnalyticsModuleInner>
    </MainLayout>
  )
}
