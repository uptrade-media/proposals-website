// src/hooks/useSEOChangeHistory.js
// Hook for fetching and managing SEO change history
import { useState, useCallback, useEffect } from 'react'
import { seoApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'

/**
 * Hook for managing SEO change history data
 * 
 * @param {Object} options
 * @param {string} options.pageId - Optional page ID to filter by
 * @param {string} options.source - Filter by source: 'all' | 'ai' | 'manual'
 * @param {boolean} options.withImpact - Only show changes with measured impact
 * @param {number} options.limit - Number of records to fetch
 * @returns {Object} { changes, summary, isLoading, error, refetch, createChange, revertChange }
 */
export function useSEOChangeHistory({
  pageId = null,
  source = null,
  withImpact = false,
  limit = 50
} = {}) {
  const [changes, setChanges] = useState([])
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id

  const fetchChanges = useCallback(async (append = false) => {
    if (!projectId) {
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const params = {
        limit,
        offset: append ? offset : 0
      }
      
      if (pageId) params.page_id = pageId
      if (source && source !== 'all') {
        if (source === 'ai') {
          params.source = 'ai_suggestion'
        } else {
          params.source = source
        }
      }
      if (withImpact) params.with_impact = true
      
      const [historyRes, summaryRes] = await Promise.all([
        seoApi.getChangeHistory(projectId, params),
        !append ? seoApi.getChangeHistorySummary(projectId) : Promise.resolve(null)
      ])
      
      const newChanges = historyRes.data || []
      
      if (append) {
        setChanges(prev => [...prev, ...newChanges])
      } else {
        setChanges(newChanges)
      }
      
      setHasMore(newChanges.length === limit)
      setOffset(prev => append ? prev + newChanges.length : newChanges.length)
      
      if (summaryRes) {
        setSummary(summaryRes.data)
      }
    } catch (err) {
      console.error('Failed to fetch change history:', err)
      setError(err.message || 'Failed to load change history')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, pageId, source, withImpact, limit, offset])
  
  // Initial fetch
  useEffect(() => {
    fetchChanges()
  }, [projectId, pageId, source, withImpact])
  
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchChanges(true)
    }
  }, [hasMore, isLoading, fetchChanges])
  
  const refetch = useCallback(() => {
    setOffset(0)
    fetchChanges()
  }, [fetchChanges])
  
  /**
   * Create a new change history record
   */
  const createChange = useCallback(async (data) => {
    if (!projectId) return null
    
    try {
      const res = await seoApi.createChangeHistory(projectId, data)
      
      // Prepend new change to list
      setChanges(prev => [res.data, ...prev])
      
      toast.success('Change recorded')
      return res.data
    } catch (err) {
      console.error('Failed to create change history:', err)
      toast.error('Failed to record change')
      throw err
    }
  }, [projectId])
  
  /**
   * Revert a change
   */
  const revertChange = useCallback(async (changeId) => {
    if (!projectId) return null
    
    try {
      const res = await seoApi.revertChange(projectId, changeId)
      
      // Update the reverted change in the list
      setChanges(prev => prev.map(c => 
        c.id === changeId 
          ? { ...c, status: 'reverted', reverted_at: new Date().toISOString() }
          : c
      ))
      
      // Add the reversal record
      if (res.data) {
        setChanges(prev => [res.data, ...prev])
      }
      
      toast.success('Change reverted')
      return res.data
    } catch (err) {
      console.error('Failed to revert change:', err)
      toast.error('Failed to revert change')
      throw err
    }
  }, [projectId])
  
  /**
   * Update a change record
   */
  const updateChange = useCallback(async (changeId, data) => {
    if (!projectId) return null
    
    try {
      const res = await seoApi.updateChangeHistory(projectId, changeId, data)
      
      setChanges(prev => prev.map(c => 
        c.id === changeId ? { ...c, ...res.data } : c
      ))
      
      return res.data
    } catch (err) {
      console.error('Failed to update change history:', err)
      toast.error('Failed to update change')
      throw err
    }
  }, [projectId])
  
  return {
    changes,
    summary,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
    createChange,
    revertChange,
    updateChange
  }
}

export default useSEOChangeHistory
