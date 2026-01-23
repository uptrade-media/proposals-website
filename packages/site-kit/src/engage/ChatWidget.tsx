/**
 * @uptrade/site-kit/engage - Chat Widget
 * 
 * AI-powered chat widget with expandable popup interface
 * Connects to Signal API for Echo AI responses
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { ChatConfig } from './types'

interface ChatWidgetProps {
  projectId: string
  config?: Partial<ChatConfig>
  signalApiUrl?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function getApiConfig() {
  const signalUrl = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_SIGNAL_URL__ || 'https://signal.uptrademedia.com'
    : 'https://signal.uptrademedia.com'
  const apiKey = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_KEY__
    : undefined
  return { signalUrl, apiKey }
}

export function ChatWidget({ projectId, config, signalApiUrl }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const position = config?.position || 'bottom-right'
  const buttonColor = config?.buttonColor || '#00afab'
  const welcomeMessage = config?.welcomeMessage || "Hi! How can I help you today?"

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev)
    if (!isOpen && messages.length === 0) {
      // Show welcome message on first open
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }])
    }
  }, [isOpen, messages.length, welcomeMessage])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setShowWelcome(false)

    try {
      const { signalUrl, apiKey } = getApiConfig()
      // Use Portal API URL (not Signal) - Portal proxies to Signal
      const apiUrl = typeof window !== 'undefined' 
        ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
        : 'https://api.uptrademedia.com'
      
      // Call Portal API which proxies to Signal Echo
      const response = await fetch(`${apiUrl}/api/public/engage/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-api-key': apiKey }),
        },
        body: JSON.stringify({
          message: userMessage.content,
          projectId: projectId,
          context: {
            pageUrl: typeof window !== 'undefined' ? window.location.href : '',
            pageTitle: typeof document !== 'undefined' ? document.title : '',
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || data.message || "I'm sorry, I couldn't process that request.",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('[ChatWidget] Error:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, projectId, signalApiUrl])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }, [handleSubmit])

  // Chat bubble button
  const ChatButton = (
    <button
      onClick={handleToggle}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      style={{
        position: 'fixed',
        [position === 'bottom-left' ? 'left' : 'right']: 20,
        bottom: 20,
        width: 60,
        height: 60,
        borderRadius: '50%',
        backgroundColor: buttonColor,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        zIndex: 9999,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)'
      }}
    >
      {isOpen ? (
        // Close icon (X)
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        // Chat icon
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  )

  // Chat popup window
  const ChatPopup = isOpen && (
    <div
      style={{
        position: 'fixed',
        [position === 'bottom-left' ? 'left' : 'right']: 20,
        bottom: 90,
        width: 380,
        maxWidth: 'calc(100vw - 40px)',
        height: 500,
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9998,
        animation: 'chatSlideUp 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          background: `linear-gradient(135deg, ${buttonColor}, ${adjustColor(buttonColor, -20)})`,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Chat with us</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>We typically reply instantly</div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: '#f8f9fa',
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: message.role === 'user' 
                  ? '16px 16px 4px 16px' 
                  : '16px 16px 16px 4px',
                backgroundColor: message.role === 'user' ? buttonColor : '#ffffff',
                color: message.role === 'user' ? 'white' : '#1a1a1a',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '16px 16px 16px 4px',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                display: 'flex',
                gap: 4,
              }}
            >
              <span style={{ animation: 'chatDot 1.4s infinite ease-in-out', animationDelay: '0s' }}>●</span>
              <span style={{ animation: 'chatDot 1.4s infinite ease-in-out', animationDelay: '0.2s' }}>●</span>
              <span style={{ animation: 'chatDot 1.4s infinite ease-in-out', animationDelay: '0.4s' }}>●</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ padding: 12, borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 24,
              border: '1px solid #e5e7eb',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = buttonColor}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: inputValue.trim() && !isLoading ? buttonColor : '#e5e7eb',
              color: 'white',
              cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>

      {/* CSS animations */}
      <style>{`
        @keyframes chatSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes chatDot {
          0%, 80%, 100% {
            opacity: 0.3;
          }
          40% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )

  return (
    <>
      {ChatPopup}
      {ChatButton}
    </>
  )
}

// Helper to darken/lighten a hex color
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}
