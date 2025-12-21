// src/components/echo/EchoMessageBubble.jsx
// Message bubble component with Echo-specific styling and features

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Copy, Check, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import EchoAvatar from './EchoAvatar'

export function EchoMessageBubble({ 
  message, 
  isOwn = false, 
  showSender = false,
  onSuggestionClick,
  onAction,
  className 
}) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(null)
  
  const isEcho = message.is_echo_response || message.sender?.is_ai
  const metadata = message.echo_metadata || {}
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleFeedback = (type) => {
    setFeedback(type)
    // Could store feedback in database
  }

  return (
    <div className={cn(
      'flex gap-3',
      isOwn ? 'flex-row-reverse' : 'flex-row',
      className
    )}>
      {/* Avatar */}
      {!isOwn && (
        isEcho ? (
          <EchoAvatar size="sm" showStatus={false} />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
            {message.sender?.name?.charAt(0) || '?'}
          </div>
        )
      )}
      
      <div className={cn(
        'flex flex-col max-w-[75%]',
        isOwn ? 'items-end' : 'items-start'
      )}>
        {/* Sender name for group threads */}
        {showSender && !isOwn && (
          <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-muted-foreground">
            <span>{message.sender?.name || 'Unknown'}</span>
            {isEcho && (
              <>
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  AI
                </Badge>
              </>
            )}
          </div>
        )}
        
        {/* Message content */}
        <div className={cn(
          'rounded-2xl px-4 py-2.5',
          isOwn 
            ? 'bg-emerald-600 text-white' 
            : isEcho 
              ? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700' 
              : 'bg-gray-100 dark:bg-gray-800'
        )}>
          {/* Markdown content */}
          <div className={cn(
            'prose prose-sm max-w-none',
            isOwn && 'prose-invert',
            isEcho && 'prose-emerald'
          )}>
            <ReactMarkdown
              components={{
                // Style links
                a: ({ node, ...props }) => (
                  <a 
                    {...props} 
                    className="text-emerald-600 hover:text-emerald-700 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
                // Style code blocks
                code: ({ node, inline, ...props }) => (
                  inline 
                    ? <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm" {...props} />
                    : <code className="block bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm overflow-x-auto" {...props} />
                ),
                // Keep paragraphs compact
                p: ({ node, ...props }) => (
                  <p className="mb-2 last:mb-0" {...props} />
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* Echo action buttons */}
          {isEcho && metadata.actions?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {metadata.actions.map((action, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onAction?.(action)}
                >
                  {action.icon && <action.icon className="w-3 h-3 mr-1" />}
                  {action.label}
                  {action.external && <ExternalLink className="w-3 h-3 ml-1" />}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {/* Quick reply suggestions */}
        {isEcho && metadata.suggestions?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {metadata.suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick?.(suggestion)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full',
                  'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  'transition-colors duration-150'
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        {/* Message actions (Echo only) */}
        {isEcho && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => handleFeedback('up')}
              className={cn(
                'p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded',
                feedback === 'up' && 'text-emerald-500'
              )}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback('down')}
              className={cn(
                'p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded',
                feedback === 'down' && 'text-red-500'
              )}
              title="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}

// Format timestamp for display
function formatTime(dateString) {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  if (diffHours < 48) return 'Yesterday'
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default EchoMessageBubble
