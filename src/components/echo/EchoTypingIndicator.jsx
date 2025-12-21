// src/components/echo/EchoTypingIndicator.jsx
// "Echo is thinking..." animation for AI responses

import { cn } from '@/lib/utils'
import EchoAvatar from './EchoAvatar'

export function EchoTypingIndicator({ className }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
      className
    )}>
      <EchoAvatar size="sm" showStatus={false} />
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Echo</span>
        <span>is thinking</span>
        
        {/* Animated dots */}
        <span className="flex items-center gap-1">
          <span 
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '600ms' }}
          />
          <span 
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '600ms' }}
          />
          <span 
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '600ms' }}
          />
        </span>
      </div>
    </div>
  )
}

export default EchoTypingIndicator
