/**
 * useSEOAIGeneration Hook
 * 
 * Hook for generating AI-powered SEO content (titles, meta descriptions, etc.)
 * Uses Signal API skills for generation.
 */

import { useState, useCallback } from 'react'
import { skillsApi } from './signal-api'
import { useSignalAccess } from './signal-access'
import useAuthStore from './auth-store'

/**
 * Generate unique IDs for suggestions
 */
const generateId = () => `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

/**
 * Hook for generating AI SEO content
 * 
 * @returns {Object} Generation state and methods
 */
export function useSEOAIGeneration() {
  const { hasAccess } = useSignalAccess()
  const currentProject = useAuthStore(state => state.currentProject)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState(null)
  
  /**
   * Generate title suggestions for a page
   * 
   * @param {Object} params - Generation parameters
   * @param {string} params.pageUrl - URL of the page
   * @param {string} params.currentTitle - Current title tag
   * @param {string} params.h1 - Current H1 heading
   * @param {string} params.metaDescription - Current meta description
   * @param {string[]} params.targetKeywords - Target keywords for the page
   * @param {number} params.count - Number of suggestions to generate (default: 3)
   * @returns {Promise<Array>} Array of title suggestions
   */
  const generateTitles = useCallback(async ({
    pageUrl,
    currentTitle,
    h1,
    metaDescription,
    targetKeywords = [],
    count = 3
  }) => {
    if (!hasAccess) {
      setError('Signal AI access required')
      return []
    }
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const result = await skillsApi.invoke('seo', 'generate-titles', {
        project_id: currentProject?.id,
        page_url: pageUrl,
        current_title: currentTitle,
        h1,
        meta_description: metaDescription,
        target_keywords: targetKeywords,
        count
      })
      
      const newSuggestions = (result.suggestions || []).map((s, i) => ({
        id: generateId(),
        text: s.title || s.text || s,
        reasoning: s.reasoning || s.why || null,
        score: s.score || null
      }))
      
      setSuggestions(newSuggestions)
      return newSuggestions
    } catch (err) {
      console.error('Failed to generate titles:', err)
      setError(err.message || 'Failed to generate titles')
      
      // Return mock suggestions for development/demo
      if (import.meta.env.DEV) {
        const mockSuggestions = [
          {
            id: generateId(),
            text: `${currentTitle ? currentTitle.split('|')[0].trim() : 'Page'} | ${currentProject?.name || 'Brand'}`,
            reasoning: 'Brand-optimized title with consistent format'
          },
          {
            id: generateId(),
            text: `${targetKeywords[0] || 'Topic'}: Expert Guide & Tips (2025)`,
            reasoning: 'Keyword-focused with freshness indicator'
          },
          {
            id: generateId(),
            text: `How to ${h1 || 'Achieve Results'} - Complete Guide`,
            reasoning: 'Action-oriented with clear value proposition'
          }
        ].slice(0, count)
        
        setSuggestions(mockSuggestions)
        return mockSuggestions
      }
      
      return []
    } finally {
      setIsGenerating(false)
    }
  }, [hasAccess, currentProject])
  
  /**
   * Generate meta description suggestions for a page
   * 
   * @param {Object} params - Generation parameters
   * @param {string} params.pageUrl - URL of the page
   * @param {string} params.currentMeta - Current meta description
   * @param {string} params.title - Page title
   * @param {string} params.h1 - Current H1 heading
   * @param {string} params.pageContent - Snippet of page content
   * @param {string[]} params.targetKeywords - Target keywords for the page
   * @param {number} params.count - Number of suggestions to generate (default: 3)
   * @returns {Promise<Array>} Array of meta description suggestions
   */
  const generateMetaDescriptions = useCallback(async ({
    pageUrl,
    currentMeta,
    title,
    h1,
    pageContent,
    targetKeywords = [],
    count = 3
  }) => {
    if (!hasAccess) {
      setError('Signal AI access required')
      return []
    }
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const result = await skillsApi.invoke('seo', 'generate-meta-descriptions', {
        project_id: currentProject?.id,
        page_url: pageUrl,
        current_meta: currentMeta,
        title,
        h1,
        page_content: pageContent?.substring(0, 500), // Limit content length
        target_keywords: targetKeywords,
        count
      })
      
      const newSuggestions = (result.suggestions || []).map((s, i) => ({
        id: generateId(),
        text: s.description || s.text || s,
        reasoning: s.reasoning || s.why || null,
        score: s.score || null
      }))
      
      setSuggestions(newSuggestions)
      return newSuggestions
    } catch (err) {
      console.error('Failed to generate meta descriptions:', err)
      setError(err.message || 'Failed to generate meta descriptions')
      
      // Return mock suggestions for development/demo
      if (import.meta.env.DEV) {
        const mockSuggestions = [
          {
            id: generateId(),
            text: `Discover ${targetKeywords[0] || 'expert insights'} with our comprehensive guide. Learn proven strategies, tips, and best practices to achieve results.`,
            reasoning: 'Keyword-rich with clear value proposition'
          },
          {
            id: generateId(),
            text: `Looking for ${h1 || 'solutions'}? Our expert team breaks down everything you need to know. Get started today with actionable tips.`,
            reasoning: 'Question-based hook with call to action'
          },
          {
            id: generateId(),
            text: `${title || 'Expert Guide'} - Learn from industry experts. We cover key strategies, common mistakes to avoid, and proven methods for success.`,
            reasoning: 'Authority-focused with comprehensive promise'
          }
        ].slice(0, count)
        
        setSuggestions(mockSuggestions)
        return mockSuggestions
      }
      
      return []
    } finally {
      setIsGenerating(false)
    }
  }, [hasAccess, currentProject])
  
  /**
   * Generate H1 heading suggestions for a page
   * 
   * @param {Object} params - Generation parameters
   * @param {string} params.pageUrl - URL of the page
   * @param {string} params.currentH1 - Current H1 heading
   * @param {string} params.title - Page title
   * @param {string[]} params.targetKeywords - Target keywords for the page
   * @param {number} params.count - Number of suggestions to generate (default: 3)
   * @returns {Promise<Array>} Array of H1 suggestions
   */
  const generateH1s = useCallback(async ({
    pageUrl,
    currentH1,
    title,
    targetKeywords = [],
    count = 3
  }) => {
    if (!hasAccess) {
      setError('Signal AI access required')
      return []
    }
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const result = await skillsApi.invoke('seo', 'generate-h1s', {
        project_id: currentProject?.id,
        page_url: pageUrl,
        current_h1: currentH1,
        title,
        target_keywords: targetKeywords,
        count
      })
      
      const newSuggestions = (result.suggestions || []).map((s, i) => ({
        id: generateId(),
        text: s.h1 || s.text || s,
        reasoning: s.reasoning || s.why || null,
        score: s.score || null
      }))
      
      setSuggestions(newSuggestions)
      return newSuggestions
    } catch (err) {
      console.error('Failed to generate H1s:', err)
      setError(err.message || 'Failed to generate H1s')
      
      // Return mock suggestions for development/demo
      if (import.meta.env.DEV) {
        const mockSuggestions = [
          {
            id: generateId(),
            text: `The Complete Guide to ${targetKeywords[0] || 'Success'}`,
            reasoning: 'Comprehensive and keyword-focused'
          },
          {
            id: generateId(),
            text: `${targetKeywords[0] || 'Topic'}: Everything You Need to Know`,
            reasoning: 'Clear and exhaustive scope'
          },
          {
            id: generateId(),
            text: `How to Master ${currentH1 || 'This Topic'} in 2025`,
            reasoning: 'Action-oriented with freshness'
          }
        ].slice(0, count)
        
        setSuggestions(mockSuggestions)
        return mockSuggestions
      }
      
      return []
    } finally {
      setIsGenerating(false)
    }
  }, [hasAccess, currentProject])
  
  /**
   * Clear all suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setError(null)
  }, [])
  
  /**
   * Add more suggestions to existing list (for "Generate More")
   */
  const generateMore = useCallback(async (type, params) => {
    const currentSuggestions = [...suggestions]
    
    let newSuggestions = []
    switch (type) {
      case 'title':
        newSuggestions = await generateTitles(params)
        break
      case 'meta_description':
        newSuggestions = await generateMetaDescriptions(params)
        break
      case 'h1':
        newSuggestions = await generateH1s(params)
        break
    }
    
    // Combine with existing, removing duplicates
    const combined = [...currentSuggestions]
    newSuggestions.forEach(s => {
      if (!combined.find(c => c.text === s.text)) {
        combined.push(s)
      }
    })
    
    setSuggestions(combined)
    return combined
  }, [suggestions, generateTitles, generateMetaDescriptions, generateH1s])
  
  return {
    // State
    isGenerating,
    suggestions,
    error,
    hasAccess,
    
    // Methods
    generateTitles,
    generateMetaDescriptions,
    generateH1s,
    generateMore,
    clearSuggestions
  }
}

export default useSEOAIGeneration
