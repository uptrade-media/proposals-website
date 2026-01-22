/**
 * ChatBubbleSingle - Individual chat bubble with Liquid Glass design
 * Used by ChatBubbleManager to display multiple concurrent chats
 * 
 * Uses shared components from @/components/messages/shared.jsx
 * for consistency with the full Messages module
 */
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  X,
  Send,
  Minimize2,
  Loader2,
  Phone,
  Video,
  ChevronDown,
  MessageCircle,
  Expand,
  Paperclip,
  FileText,
  Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import ContactAvatar from '@/components/ui/ContactAvatar'
import VideoCall from '@/components/VideoCall'
import { 
  MessageBubble, 
  TypingIndicator, 
  MessageList,
  formatMessageTime 
} from '@/components/messages/shared'
import useMessagesStore from '@/lib/messages-store'
import useAuthStore from '@/lib/auth-store'
import usePageContextStore from '@/lib/page-context-store'
import useFilesStore from '@/lib/files-store'

export default function ChatBubbleSingle({ conversation, onClose, onMinimizeChange, accent, defaultMinimized = false }) {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isVideoCallActive, setIsVideoCallActive] = useState(false)
  const [localUnreadCount, setLocalUnreadCount] = useState(conversation.unreadCount || 0)
  const [selectedFiles, setSelectedFiles] = useState([])
  
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  
  const { user } = useAuthStore()
  const { uploadFile } = useFilesStore()
  const { 
    sendMessage,
    sendToEcho,
    echoTyping,
    echoMessages,
    echoContact,
    streamEchoResponse,
    fetchEchoMessages,
    fetchEchoContact,
      markAsRead
  } = useMessagesStore()

  const isEcho = conversation.is_echo || conversation.is_ai
  const contact = conversation.contact || conversation.recipient

  // Fetch messages for this conversation
  useEffect(() => {
    const loadMessages = async () => {
      if (isEcho) {
        console.log('[ChatBubble] Loading Echo conversation...')
        // Ensure Echo contact is loaded first
        await fetchEchoContact()
        const result = await fetchEchoMessages()
        console.log('[ChatBubble] fetchEchoMessages result:', result)
        if (result.success && result.data) {
          setMessages(result.data)
        }
      } else {
        // Load regular messages - for now just show empty
        setMessages([])
      }
    }
    loadMessages()
  }, [conversation.id, isEcho, fetchEchoContact, fetchEchoMessages])

  // Subscribe to realtime updates
    // Subscription logic removed; relying on MainLayout global subscription

  // Sync local messages with store echoMessages for Echo conversations
  useEffect(() => {
    if (isEcho) {
      console.log('[ChatBubble] Syncing echoMessages:', echoMessages.length)
      setMessages(echoMessages)
    }
  }, [isEcho, echoMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, echoTyping])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 80) + 'px'
    }
  }, [messageText])

  // Mark as read when opened or messages change
  useEffect(() => {
    if (!isMinimized && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      // Skip marking as read for Echo messages (temp IDs) or messages from current user
      const isEchoTempId = lastMessage?.id?.startsWith('echo_') || lastMessage?.id?.startsWith('temp_')
      if (lastMessage && lastMessage.sender_id !== user?.id && !isEchoTempId) {
        markAsRead?.(lastMessage.id)
        setLocalUnreadCount(0)
      }
    }
  }, [messages, isMinimized, markAsRead, user?.id])

  // Handle minimize toggle
  const handleMinimize = (minimized) => {
    setIsMinimized(minimized)
    onMinimizeChange?.(minimized)
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Handle send message
  const handleSend = async () => {
    if ((!messageText.trim() && selectedFiles.length === 0) || isSending) return
    
    setIsSending(true)
    
    try {
      // Upload files first if any
      let attachmentIds = []
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const result = await uploadFile(null, file, 'message-attachment', false)
          if (result.success) {
            attachmentIds.push(result.data.file.id)
          }
        }
      }

      if (isEcho) {
        // Send to Echo with streaming - store handles optimistic updates
        const msg = messageText.trim()
        console.log('[ChatBubble] Sending to Echo:', msg)
        setMessageText('')
        setSelectedFiles([])
        // Get page context for Echo awareness
        const pageContext = usePageContextStore.getState().getContext()
        await streamEchoResponse(msg, { userId: user?.id, pageContext })
        console.log('[ChatBubble] streamEchoResponse completed')
        // Messages are synced from store via echoMessages effect
      } else {
        // Send regular message with attachments
        await sendMessage({
          recipientId: contact?.id,
          subject: 'Chat message',
          content: messageText.trim(),
          attachments: attachmentIds.length > 0 ? attachmentIds : undefined
        })
        setMessageText('')
        setSelectedFiles([])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStartVideoCall = () => {
    setIsVideoCallActive(true)
  }

  const handleEndVideoCall = () => {
    setIsVideoCallActive(false)
  }

  if (isVideoCallActive && contact) {
    return (
      <div className="w-[340px]">
        <VideoCall
          contact={contact}
          currentUser={user}
          onEndCall={handleEndVideoCall}
        />
      </div>
    )
  }

  // Fullscreen overlay mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className={cn(
          "w-full max-w-2xl h-[85vh] mx-4 flex flex-col overflow-hidden",
          "bg-[var(--surface-primary)] backdrop-blur-2xl",
          "border rounded-2xl",
          accent.border,
          "shadow-2xl",
          accent.glow
        )}>
          {/* Fullscreen Header */}
          <div className={cn(
            "relative flex items-center justify-between p-4 border-b border-[var(--glass-border)]/40",
            accent.headerBg
          )}>
            <div className="flex items-center gap-3">
              <ContactAvatar
                contact={isEcho ? { name: 'Echo', is_ai: true, contact_type: 'ai' } : contact}
                type={isEcho ? 'echo' : undefined}
                size="md"
                status={conversation.online || isEcho ? 'online' : 'offline'}
                showBadge
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg text-[var(--text-primary)]">
                    {isEcho ? 'Echo' : contact?.name || 'Unknown'}
                  </span>
                  {accent.label && (
                    <Badge className={cn("text-[10px] px-1.5 py-0 h-4 border-0 font-medium", accent.labelClass)}>
                      {accent.label}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {isEcho ? (
                    <span className="text-emerald-500">Always online</span>
                  ) : conversation.online ? (
                    <span className="text-green-500">Active now</span>
                  ) : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isEcho && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--glass-bg)]"
                    onClick={handleStartVideoCall}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--glass-bg)]"
                    onClick={() => window.location.href = `tel:${contact?.phone}`}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
                onClick={() => setIsFullscreen(false)}
                title="Exit fullscreen"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => { setIsFullscreen(false); onClose(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Fullscreen Messages Area */}
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-3 py-4">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-[var(--text-tertiary)]">
                  {isEcho ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="text-white text-2xl">✨</span>
                      </div>
                      <p className="text-lg font-medium text-[var(--text-primary)]">Hey! I'm Echo</p>
                      <p className="text-sm mt-2 text-[var(--text-tertiary)]">Your AI teammate. Ask me anything!</p>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Say hello to start the conversation</p>
                    </>
                  )}
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={isOwn}
                      showAvatar={idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id}
                      compact={false}
                    />
                  )
                })
              )}
              
              {echoTyping && isEcho && (
                <TypingIndicator names={['Echo']} compact={false} />
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Fullscreen Input Area */}
          <div className="p-4 border-t border-[var(--glass-border)]/30 bg-[var(--glass-bg)]/30">
            {/* File previews */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-[var(--glass-bg)] rounded-lg px-3 py-2 text-sm">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
                    ) : (
                      <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
                    )}
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button 
                      onClick={() => handleRemoveFile(index)}
                      className="text-[var(--text-tertiary)] hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3 items-end">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              {/* Attachment button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-11 rounded-xl p-0 flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5 text-[var(--text-tertiary)]" />
              </Button>
              <Textarea
                ref={textareaRef}
                placeholder={isEcho ? "Ask Echo anything..." : "Type a message..."}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className={cn(
                  "min-h-[44px] max-h-[120px] resize-none rounded-xl px-4 py-3",
                  "bg-[var(--glass-bg-inset)] border-[var(--glass-border)]/50",
                  "placeholder:text-[var(--text-tertiary)]/70",
                  "focus:ring-1",
                  accent.ring
                )}
              />
              <Button
                onClick={handleSend}
                disabled={(!messageText.trim() && selectedFiles.length === 0) || isSending}
                className={cn(
                  "h-11 w-11 rounded-xl p-0 flex-shrink-0 transition-all",
                  "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]",
                  "shadow-md shadow-[var(--brand-primary)]/25",
                  "disabled:opacity-50 disabled:shadow-none"
                )}
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Minimized state - just a circle with avatar
  if (isMinimized) {
    return (
      <div className="relative">
        <button
          onClick={() => handleMinimize(false)}
          className={cn(
            "relative rounded-full transition-all duration-200 overflow-hidden",
            "hover:scale-110 active:scale-95",
            "ring-2",
            accent.ring,
            "shadow-lg",
            accent.glow,
            "w-12 h-12 p-0"
          )}
        >
          <div className="absolute inset-0">
            <ContactAvatar
              contact={isEcho ? { name: 'Echo', is_ai: true, contact_type: 'ai' } : contact}
              type={isEcho ? 'echo' : undefined}
              showBadge={false}
              className="!absolute !inset-0 !w-full !h-full [&>*]:!w-full [&>*]:!h-full [&_img]:!w-full [&_img]:!h-full [&_img]:!object-cover"
            />
          </div>
          
          {/* Close button on hover */}
          <div 
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-[var(--surface-primary)] border border-[var(--glass-border)] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 group z-10"
          >
            <X className="h-2.5 w-2.5 text-[var(--text-tertiary)] group-hover:text-red-500" />
          </div>
        </button>
        
        {/* Unread badge - positioned outside circle */}
        {localUnreadCount > 0 && (
          <Badge className="absolute bottom-0 right-0 h-5 min-w-5 px-1 rounded-full flex items-center justify-center bg-red-500 text-white text-[10px] font-bold border-2 border-[var(--surface-primary)]">
            {localUnreadCount > 9 ? '9+' : localUnreadCount}
          </Badge>
        )}
        
        {/* Online indicator - positioned outside circle */}
        {(conversation.online || isEcho) && (
          <span className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--surface-primary)]",
            isEcho ? "bg-emerald-500" : "bg-green-500"
          )} />
        )}
      </div>
    )
  }

  // Calculate dynamic height based on messages (auto-grow up to max)
  const messageCount = messages.length
  const baseHeight = 380 // minimum height with empty state
  const heightPerMessage = 40 // approximate height per message
  const maxHeight = 550 // maximum height (was expanded state)
  const dynamicHeight = Math.min(maxHeight, Math.max(baseHeight, baseHeight + messageCount * heightPerMessage))

  return (
    <div 
      className={cn(
        "w-[340px] transition-all duration-300 ease-out",
        // Flexbox for proper layout
        "flex flex-col",
        // Liquid glass container
        "bg-[var(--surface-primary)]/90 backdrop-blur-2xl",
        "border rounded-2xl",
        accent.border,
        // Shadow with accent color
        "shadow-2xl",
        accent.glow,
        // Ring effect
        "ring-1 ring-white/10"
      )}
      style={{ height: `${dynamicHeight}px`, maxHeight: `${dynamicHeight}px` }}
    >
      {/* Gradient shimmer overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br pointer-events-none rounded-2xl",
        accent.headerBg
      )} />
      
      {/* Header */}
      <div className={cn(
        "relative flex items-center justify-between p-3 border-b border-[var(--glass-border)]/40 flex-shrink-0",
        accent.headerBg
      )}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="relative">
            <ContactAvatar
              contact={isEcho ? { name: 'Echo', is_ai: true, contact_type: 'ai' } : contact}
              type={isEcho ? 'echo' : undefined}
              size="sm"
              status={conversation.online || isEcho ? 'online' : 'offline'}
              showBadge
            />
            {localUnreadCount > 0 && isMinimized && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full flex items-center justify-center bg-red-500 text-white text-[9px] border border-[var(--surface-primary)]">
                {localUnreadCount}
              </Badge>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                {isEcho ? 'Echo' : contact?.name || 'Unknown'}
              </span>
              {accent.label && (
                <Badge className={cn("text-[8px] px-1 py-0 h-3.5 border-0 font-medium", accent.labelClass)}>
                  {accent.label}
                </Badge>
              )}
            </div>
            {!isMinimized && (
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {isEcho ? (
                  <span className="text-emerald-500">Always online</span>
                ) : conversation.online ? (
                  <span className="text-green-500">Active now</span>
                ) : 'Offline'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Expand to fullscreen overlay */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--glass-bg)]"
            onClick={() => setIsFullscreen(true)}
            title="Expand conversation"
          >
            <Expand className="h-3.5 w-3.5" />
          </Button>
          {!isEcho && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--glass-bg)]"
                onClick={handleStartVideoCall}
              >
                <Video className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--glass-bg)]"
                onClick={() => window.location.href = `tel:${contact?.phone}`}
              >
                <Phone className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
            onClick={() => handleMinimize(true)}
            title="Minimize to bubble"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-3 relative overflow-hidden min-h-0">
        <div className="space-y-2 py-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              {isEcho ? (
                <>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <span className="text-white text-lg">✨</span>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Hey! I'm Echo</p>
                  <p className="text-xs mt-1 text-[var(--text-tertiary)]">Your AI teammate. Ask me anything!</p>
                </>
              ) : (
                <>
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Say hello to start the conversation</p>
                </>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.sender_id === user?.id
              // Debug log for first few messages
              if (idx < 3) {
                console.log('[ChatBubbleSingle] Message bubble:', {
                  msgId: msg.id,
                  senderId: msg.sender_id,
                  userId: user?.id,
                  isOwn,
                  content: msg.content?.substring(0, 30)
                })
              }
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={isOwn}
                  showAvatar={idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id}
                  compact={true}
                />
              )
            })
          )}
          
          {/* Echo typing indicator - using shared component */}
          {echoTyping && isEcho && (
            <TypingIndicator names={['Echo']} compact={true} />
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="relative p-3 border-t border-[var(--glass-border)]/30 bg-[var(--glass-bg)]/30 flex-shrink-0 mt-auto">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            placeholder={isEcho ? "Ask Echo anything..." : "Type a message..."}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className={cn(
              "min-h-[36px] max-h-[80px] resize-none rounded-xl px-3 py-2",
              "bg-[var(--glass-bg-inset)] border-[var(--glass-border)]/50",
              "placeholder:text-[var(--text-tertiary)]/70",
              "focus:ring-1",
              accent.ring
            )}
          />
          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || isSending}
            className={cn(
              "h-9 w-9 rounded-xl p-0 flex-shrink-0 transition-all",
              "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]",
              "shadow-md shadow-[var(--brand-primary)]/25",
              "disabled:opacity-50 disabled:shadow-none"
            )}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
