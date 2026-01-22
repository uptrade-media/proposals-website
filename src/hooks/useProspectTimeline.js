/**
 * useProspectTimeline - Hook for fetching and managing prospect timeline
 * Integrates with CRM store for unified timeline and attribution data
 */
import { useEffect, useCallback } from 'react'
import { useCrmStore } from '@/lib/crm-store'

export function useProspectTimeline(prospectId, options = {}) {
  const {
    autoFetch = true,
    includeAttribution = true
  } = options
  
  const {
    timeline,
    timelineLoading,
    timelineError,
    timelineHasMore,
    attribution,
    attributionLoading,
    fetchTimeline,
    loadMoreTimeline,
    fetchAttribution,
    clearTimeline
  } = useCrmStore()
  
  // Initial fetch when prospect changes
  useEffect(() => {
    if (autoFetch && prospectId) {
      clearTimeline()
      fetchTimeline(prospectId)
      
      if (includeAttribution) {
        fetchAttribution(prospectId)
      }
    }
    
    return () => {
      clearTimeline()
    }
  }, [prospectId, autoFetch, includeAttribution])
  
  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (prospectId && !timelineLoading && timelineHasMore) {
      loadMoreTimeline(prospectId)
    }
  }, [prospectId, timelineLoading, timelineHasMore])
  
  // Refresh timeline
  const refresh = useCallback(() => {
    if (prospectId) {
      clearTimeline()
      fetchTimeline(prospectId)
      if (includeAttribution) {
        fetchAttribution(prospectId)
      }
    }
  }, [prospectId, includeAttribution])
  
  return {
    events: timeline,
    isLoading: timelineLoading,
    error: timelineError,
    hasMore: timelineHasMore,
    onLoadMore: handleLoadMore,
    attribution,
    isLoadingAttribution: attributionLoading,
    refresh
  }
}

export default useProspectTimeline
