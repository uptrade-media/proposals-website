/**
 * @uptrade/site-kit/engage - Engage Widget
 * 
 * Loads and renders engagement widgets (popups, nudges, bars, chat) via Portal API
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import type { EngageElement } from './types'
import { ChatWidget } from './ChatWidget'

interface EngageWidgetProps {
  apiUrl?: string
  apiKey?: string
  position?: 'bottom-right' | 'bottom-left'
  zIndex?: number
  chatEnabled?: boolean
  debug?: boolean
}

function getApiConfig() {
  const apiUrl = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
    : 'https://api.uptrademedia.com'
  const apiKey = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_KEY__
    : undefined
  return { apiUrl, apiKey }
}

export function EngageWidget({
  apiUrl: propApiUrl,
  apiKey: propApiKey,
  position = 'bottom-right',
  zIndex = 9999,
  chatEnabled = true,
  debug = false,
}: EngageWidgetProps) {
  const pathname = usePathname()
  const [elements, setElements] = useState<EngageElement[]>([])
  const [activeElements, setActiveElements] = useState<string[]>([])
  const [dismissedElements, setDismissedElements] = useState<Set<string>>(new Set())
  
  // Load elements from API
  useEffect(() => {
    async function loadElements() {
      const { apiUrl: globalApiUrl, apiKey: globalApiKey } = getApiConfig()
      const apiUrl = propApiUrl || globalApiUrl
      const apiKey = propApiKey || globalApiKey
      
      if (!apiKey) {
        if (debug) console.warn('[Engage] No API key configured')
        return
      }
      
      try {
        const response = await fetch(`${apiUrl}/api/public/engage/elements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({}),
        })
        
        if (!response.ok) {
          if (debug) console.error('[Engage] Error loading elements:', response.statusText)
          return
        }
        
        const data = await response.json()
        if (debug) console.log('[Engage] Loaded elements:', data.elements)
        setElements(data.elements || [])
      } catch (error) {
        if (debug) console.error('[Engage] Error loading elements:', error)
      }
    }
    
    loadElements()
  }, [propApiUrl, propApiKey, debug])
  
  // Check targeting and trigger for each element
  useEffect(() => {
    if (!elements.length) return
    
    const checkElement = (element: EngageElement): boolean => {
      // Check if dismissed
      if (dismissedElements.has(element.id)) return false
      
      // Check page targeting
      if (element.targeting?.pages) {
        const { include, exclude } = element.targeting.pages
        
        if (exclude?.some(p => matchPath(pathname, p))) return false
        if (include && !include.some(p => matchPath(pathname, p))) return false
      }
      
      // Check device targeting
      if (element.targeting?.devices) {
        const device = getDeviceType()
        if (!element.targeting.devices.includes(device)) return false
      }
      
      // Check frequency capping
      if (element.trigger?.frequency) {
        const { type, days } = element.trigger.frequency
        const key = `_engage_${element.id}`
        
        if (type === 'once') {
          if (localStorage.getItem(key)) return false
        } else if (type === 'once-per-session') {
          if (sessionStorage.getItem(key)) return false
        } else if (type === 'every-n-days' && days) {
          const lastShown = localStorage.getItem(key)
          if (lastShown) {
            const elapsed = Date.now() - parseInt(lastShown, 10)
            if (elapsed < days * 24 * 60 * 60 * 1000) return false
          }
        }
      }
      
      return true
    }
    
    // Filter elements that pass targeting
    const eligible = elements.filter(checkElement)
    
    if (debug) console.log('[Engage] Eligible elements:', eligible)
    
    // Set up triggers for eligible elements
    eligible.forEach(element => {
      const trigger = element.trigger
      
      if (trigger?.type === 'immediate' || !trigger?.type) {
        setActiveElements(prev => [...prev, element.id])
      } else if (trigger?.type === 'delay' && trigger.delay) {
        setTimeout(() => {
          setActiveElements(prev => [...prev, element.id])
        }, trigger.delay * 1000)
      } else if (trigger?.type === 'exit-intent') {
        const handleMouseLeave = (e: MouseEvent) => {
          if (e.clientY < 10) {
            setActiveElements(prev => [...prev, element.id])
            document.removeEventListener('mouseleave', handleMouseLeave)
          }
        }
        document.addEventListener('mouseleave', handleMouseLeave)
      } else if (trigger?.type === 'scroll' && trigger.scrollPercentage) {
        const handleScroll = () => {
          const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
          if (scrollPercent >= (trigger.scrollPercentage || 50)) {
            setActiveElements(prev => [...prev, element.id])
            window.removeEventListener('scroll', handleScroll)
          }
        }
        window.addEventListener('scroll', handleScroll)
      }
    })
  }, [elements, pathname, dismissedElements, debug])
  
  const handleDismiss = useCallback((elementId: string) => {
    setDismissedElements(prev => new Set([...prev, elementId]))
    setActiveElements(prev => prev.filter(id => id !== elementId))
    
    // Record dismissal in storage
    const element = elements.find(e => e.id === elementId)
    if (element?.trigger?.frequency) {
      const key = `_engage_${elementId}`
      if (element.trigger.frequency.type === 'once-per-session') {
        sessionStorage.setItem(key, 'true')
      } else {
        localStorage.setItem(key, Date.now().toString())
      }
    }
  }, [elements])
  
  // Render active elements + chat widget
  return (
    <>
      {activeElements.map(elementId => {
        const element = elements.find(e => e.id === elementId)
        if (!element) return null
        
        return (
          <EngageElementRenderer
            key={element.id}
            element={element}
            onDismiss={() => handleDismiss(element.id)}
            zIndex={zIndex}
          />
        )
      })}
      
      {/* Chat Widget - always rendered when chatEnabled */}
      {chatEnabled && (
        <ChatWidget
          projectId={propApiKey || ''}
          config={{
            position,
            buttonColor: '#00afab', // Default teal, can be customized later
          }}
        />
      )}
    </>
  )
}

// Helper components
function EngageElementRenderer({ 
  element, 
  onDismiss,
  zIndex,
}: { 
  element: EngageElement
  onDismiss: () => void
  zIndex: number
}) {
  // Simple popup rendering - expand as needed
  if (element.type === 'popup') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex,
        }}
        onClick={onDismiss}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            maxWidth: 500,
            width: '90%',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onDismiss}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
          {element.config?.title && <h2>{element.config.title}</h2>}
          {element.config?.message && <p>{element.config.message}</p>}
        </div>
      </div>
    )
  }
  
  // Bar/banner rendering
  if (element.type === 'bar') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: element.config?.backgroundColor || '#3b82f6',
          color: element.config?.textColor || 'white',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex,
        }}
      >
        <span>{element.config?.message}</span>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
    )
  }
  
  return null
}

// Utilities
function matchPath(pathname: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    return pathname.startsWith(pattern.slice(0, -1))
  }
  return pathname === pattern
}

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}
