// src/components/signal/shared/EchoInput.jsx
// Universal AI-Assisted Input Component
// Any text input can invoke Echo for AI assistance

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  Loader2,
  X,
  Brain,
  ChevronDown,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { echoApi } from '@/lib/signal-api'

/**
 * EchoInput - Universal AI-Assisted Input
 * 
 * Features:
 * - Standard input/textarea functionality
 * - Echo button to get AI suggestions
 * - Streaming suggestions panel
 * - Replace, append, or suggest modes
 * 
 * @example
 * <EchoInput
 *   value={companyDescription}
 *   onChange={setCompanyDescription}
 *   placeholder="Describe your company..."
 *   echoContext="business identity - company description"
 *   echoPrompt="Help me write a compelling company description"
 *   multiline
 * />
 */

export default function EchoInput({
  // Standard input props
  value = '',
  onChange,
  placeholder = '',
  multiline = false,
  disabled = false,
  className,
  
  // Echo configuration
  echoEnabled = true,
  echoContext = '',         // What this field is for
  echoPrompt = '',          // Custom prompt for Echo
  echoSuggestions = false,  // Show inline suggestions as you type
  
  // Streaming config
  streamMode = 'suggest',   // 'replace' | 'append' | 'suggest'
  
  // Callbacks
  onEchoStart,
  onEchoComplete,
  onEchoError,
  
  // Rest of props
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)
  
  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && 
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleEchoClick = async () => {
    if (isLoading) return
    
    setIsOpen(true)
    setIsLoading(true)
    setSuggestion('')
    onEchoStart?.()
    
    try {
      const prompt = echoPrompt || `Help me with this field: ${echoContext}`
      const context = value ? `Current content: "${value}"` : 'The field is currently empty.'
      
      // Call Echo API
      const response = await echoApi.sendMessage({
        message: `${prompt}\n\n${context}\n\nProvide a concise, helpful suggestion.`,
        skill: 'content'
      })
      
      setSuggestion(response.message || response.content || '')
      onEchoComplete?.(response.message || response.content || '')
    } catch (error) {
      console.error('Echo error:', error)
      setSuggestion('Sorry, I couldn\'t generate a suggestion. Please try again.')
      onEchoError?.(error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRegenerate = () => {
    handleEchoClick()
  }
  
  const handleApply = () => {
    if (streamMode === 'replace') {
      onChange(suggestion)
    } else if (streamMode === 'append') {
      onChange(value + (value ? ' ' : '') + suggestion)
    } else {
      onChange(suggestion)
    }
    setIsOpen(false)
    setSuggestion('')
  }
  
  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const InputComponent = multiline ? Textarea : Input
  
  return (
    <div className="relative">
      <div className="relative">
        <InputComponent
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            echoEnabled && "pr-12",
            className
          )}
          {...props}
        />
        
        {echoEnabled && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleEchoClick}
            disabled={isLoading}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8",
              "hover:bg-emerald-500/10 hover:text-emerald-500",
              isLoading && "animate-pulse"
            )}
            title="Get AI suggestion"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            ) : (
              <Sparkles className="h-4 w-4 text-[var(--text-muted)] hover:text-emerald-500 transition-colors" />
            )}
          </Button>
        )}
      </div>
      
      {/* Echo Suggestion Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 p-4 rounded-lg border border-emerald-500/30 bg-[var(--surface-secondary)] shadow-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-gradient-to-r from-emerald-500/20 to-teal-500/20">
                  <Brain className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">Echo Suggestion</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="min-h-[60px] mb-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              ) : suggestion ? (
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{suggestion}</p>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Click the sparkle icon to get a suggestion...</p>
              )}
            </div>
            
            {/* Actions */}
            {suggestion && !isLoading && (
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-primary)]">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    className="h-7 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  {streamMode === 'append' ? 'Append' : 'Use This'}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * EchoTextarea - Convenience wrapper for multiline EchoInput
 */
export function EchoTextarea(props) {
  return <EchoInput multiline {...props} />
}

/**
 * useEcho - Hook to invoke Echo from any component
 */
export function useEcho() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const generate = async (prompt, options = {}) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await echoApi.sendMessage({
        message: prompt,
        skill: options.skill || 'content',
        ...options
      })
      
      return response.message || response.content || ''
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }
  
  return { generate, isLoading, error }
}
