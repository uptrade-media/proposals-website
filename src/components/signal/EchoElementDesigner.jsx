// src/components/signal/EchoElementDesigner.jsx
// Conversational UI for designing Engage elements via Echo

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Sparkles,
  Loader2,
  CheckCircle2,
  X,
  ExternalLink,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

export default function EchoElementDesigner({ projectId, onClose, onElementCreated }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'll help you design an on-brand popup, banner, or slide-in. What would you like to create?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [designedElement, setDesignedElement] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    
    // Add user message
    const newMessages = [
      ...messages,
      { role: 'user', content: userMessage, timestamp: new Date() }
    ]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Send to Echo endpoint
      const res = await api.post('/.netlify/functions/echo-chat', {
        message: userMessage,
        context: {
          mode: 'designer',
          projectId
        }
      })

      const assistantMessage = {
        role: 'assistant',
        content: res.data.message,
        timestamp: new Date(),
        elementId: res.data.elementId
      }

      // Check if Echo used designEngageElement tool
      if (res.data.elementId) {
        // Element was created!
        setDesignedElement({
          id: res.data.elementId,
          preview: extractPreviewFromMessage(res.data.message)
        })
      }

      setMessages([...newMessages, assistantMessage])
    } catch (error) {
      console.error('Echo error:', error)
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          error: true
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePublish = () => {
    if (designedElement && onElementCreated) {
      onElementCreated(designedElement.id)
    }
  }

  const handleEditInEngage = () => {
    if (designedElement) {
      window.location.href = `/engage?element=${designedElement.id}`
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Design with Echo
          </DialogTitle>
          <DialogDescription>
            Tell Echo what you want to create, and I'll design it for you
          </DialogDescription>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[70%] rounded-lg px-4 py-2',
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : msg.error
                      ? 'bg-red-50 border border-red-200 text-red-900'
                      : 'bg-gray-100 text-gray-900'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.elementId && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPreview(true)}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Preview
                      </Button>
                    </div>
                  )}
                  <span className="text-xs opacity-70 mt-1 block">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                    You
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Element Created Success */}
        {designedElement && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between">
              <span><strong>Element created!</strong> Saved as draft in Engage module.</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleEditInEngage}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" onClick={handlePublish}>
                  Publish
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Input */}
        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              designedElement
                ? 'Ask for changes or create another element...'
                : 'E.g., "Create a holiday sale popup with 20% off"'
            }
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Example Prompts */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInput('Create a holiday sale popup with 20% off')}
            >
              Holiday Sale
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInput('Make an exit-intent popup offering a free consultation')}
            >
              Free Consultation
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInput('Design an email capture banner for the top of the page')}
            >
              Email Capture
            </Button>
          </div>
        )}

        {/* Preview Dialog */}
        {showPreview && designedElement && (
          <PreviewDialog
            element={designedElement}
            onClose={() => setShowPreview(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// Extract preview info from Echo's response message
function extractPreviewFromMessage(message) {
  const headlineMatch = message.match(/Headline: (.+)/i)
  const ctaMatch = message.match(/CTA: (.+)/i)
  
  return {
    headline: headlineMatch?.[1] || 'Preview',
    cta: ctaMatch?.[1] || 'Get Started'
  }
}

// Preview Dialog
function PreviewDialog({ element, onClose }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Element Preview</DialogTitle>
        </DialogHeader>
        <div className="py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-6 text-center">
            <h3 className="text-2xl font-bold mb-3">{element.preview.headline}</h3>
            <p className="text-gray-600 mb-4">Supporting text will appear here</p>
            <Button className="w-full">{element.preview.cta}</Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          This is a simplified preview. Actual design will match your brand theme.
        </p>
      </DialogContent>
    </Dialog>
  )
}
