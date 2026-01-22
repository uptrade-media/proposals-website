/**
 * CRMEmailHub - Email Inbox & Hub within CRM
 * 
 * Features:
 * - Gmail inbox sync and display
 * - Compose new emails
 * - Thread view with contact linking
 * - Gmail connection status and setup
 */
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Send,
  Inbox,
  Star,
  Archive,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User,
  Clock,
  ChevronRight,
  Paperclip,
  MailOpen,
  Reply,
  Forward,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import useAuthStore from '@/lib/auth-store'
import { emailApi } from '@/lib/portal-api'
import { GmailConnectCard } from '../email/GmailConnectCard'
import EmailComposeDialog from './EmailComposeDialog'

// Format relative time for email list
function formatEmailTime(date) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Email thread item component
function EmailThreadItem({ thread, isSelected, onClick, brandColors }) {
  const latestMessage = thread.messages?.[thread.messages.length - 1]
  const isUnread = !thread.read
  const hasAttachments = thread.hasAttachments
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 border-b cursor-pointer transition-colors hover:bg-muted/50",
        isSelected && "bg-primary/5 border-l-2",
        isUnread && "bg-muted/30"
      )}
      style={isSelected ? { borderLeftColor: brandColors.primary } : {}}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: brandColors.rgba?.primary10 || '#f0f0f0' }}
        >
          <User className="h-4 w-4" style={{ color: brandColors.primary }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              "text-sm truncate",
              isUnread ? "font-semibold" : "font-medium"
            )}>
              {thread.from?.name || thread.from?.email || 'Unknown'}
            </p>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatEmailTime(thread.date)}
            </span>
          </div>
          <p className={cn(
            "text-sm truncate",
            isUnread ? "font-medium" : "text-muted-foreground"
          )}>
            {thread.subject || '(No subject)'}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {thread.snippet}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {thread.labels?.includes('STARRED') && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            )}
            {hasAttachments && (
              <Paperclip className="h-3 w-3 text-muted-foreground" />
            )}
            {thread.linkedContact && (
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                {thread.linkedContact.name || thread.linkedContact.email}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Thread detail view
function ThreadDetailView({ thread, brandColors, onReply, onClose }) {
  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Select an email to view</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Thread Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-lg">{thread.subject || '(No subject)'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {thread.from?.name || thread.from?.email}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {formatEmailTime(thread.date)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReply}>
                  <Reply className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reply</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Forward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Forward</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Star className="h-4 w-4 mr-2" />
                  Star
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Thread Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {thread.messages?.length > 0 ? (
            <div className="space-y-4">
              {thread.messages.map((message, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="py-3 px-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: brandColors.rgba?.primary10 }}
                        >
                          <User className="h-4 w-4" style={{ color: brandColors.primary }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{message.from?.name || message.from?.email}</p>
                          <p className="text-xs text-muted-foreground">
                            to {message.to?.map(t => t.name || t.email).join(', ')}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatEmailTime(message.date)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: message.body || message.snippet }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: thread.body || thread.snippet }}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default function CRMEmailHub({ brandColors }) {
  const { currentProject } = useAuthStore()
  
  // State
  const [gmailStatus, setGmailStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [threads, setThreads] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFolder, setActiveFolder] = useState('inbox')
  const [showCompose, setShowCompose] = useState(false)
  
  // Fetch Gmail status
  const fetchGmailStatus = useCallback(async () => {
    if (!currentProject?.id) return
    
    try {
      const response = await emailApi.getGmailStatus(currentProject.id)
      const status = response.data || response
      setGmailStatus(status)
    } catch (err) {
      console.error('Failed to get Gmail status:', err)
      setGmailStatus({ connected: false })
    }
  }, [currentProject?.id])
  
  // Fetch threads
  const fetchThreads = useCallback(async () => {
    if (!currentProject?.id || !gmailStatus?.connected) return
    
    setIsRefreshing(true)
    try {
      // TODO: Implement actual inbox fetch from Portal API
      // For now, show empty state
      setThreads([])
    } catch (err) {
      console.error('Failed to fetch threads:', err)
      toast.error('Failed to load emails')
    } finally {
      setIsRefreshing(false)
    }
  }, [currentProject?.id, gmailStatus?.connected])
  
  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await fetchGmailStatus()
      setIsLoading(false)
    }
    load()
  }, [fetchGmailStatus])
  
  // Fetch threads when connected
  useEffect(() => {
    if (gmailStatus?.connected) {
      fetchThreads()
    }
  }, [gmailStatus?.connected, fetchThreads])
  
  // Filter threads
  const filteredThreads = threads.filter(thread => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        thread.subject?.toLowerCase().includes(query) ||
        thread.from?.email?.toLowerCase().includes(query) ||
        thread.from?.name?.toLowerCase().includes(query) ||
        thread.snippet?.toLowerCase().includes(query)
      )
    }
    return true
  })
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: brandColors.primary }} />
          <p className="text-sm text-muted-foreground">Loading email...</p>
        </div>
      </div>
    )
  }
  
  // Show connect prompt if Gmail not connected
  if (!gmailStatus?.connected) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <GmailConnectCard 
            onStatusChange={(status) => {
              setGmailStatus(status)
              if (status.connected) {
                fetchThreads()
              }
            }}
          />
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Email List Sidebar */}
      <div className="w-80 border-r flex flex-col bg-muted/30">
        {/* Toolbar */}
        <div className="p-3 border-b flex items-center gap-2">
          <Button 
            size="sm"
            className="gap-1.5"
            style={{ backgroundColor: brandColors.primary, color: 'white' }}
            onClick={() => setShowCompose(true)}
          >
            <Plus className="h-4 w-4" />
            Compose
          </Button>
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={fetchThreads}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
        
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Folder Tabs */}
        <div className="px-3 pt-2 border-b">
          <div className="flex gap-1">
            {[
              { id: 'inbox', label: 'Inbox', icon: Inbox },
              { id: 'sent', label: 'Sent', icon: Send },
              { id: 'starred', label: 'Starred', icon: Star },
            ].map((folder) => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-md transition-colors",
                  activeFolder === folder.id
                    ? "bg-background border border-b-0 font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <folder.icon className="h-3.5 w-3.5" />
                {folder.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Thread List */}
        <ScrollArea className="flex-1">
          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: brandColors.rgba?.primary10 }}
              >
                <Inbox className="h-6 w-6" style={{ color: brandColors.primary }} />
              </div>
              <p className="font-medium mb-1">No emails yet</p>
              <p className="text-sm text-muted-foreground text-center">
                Your synced Gmail inbox will appear here
              </p>
              <Button 
                size="sm" 
                className="mt-4"
                onClick={() => setShowCompose(true)}
                style={{ backgroundColor: brandColors.primary, color: 'white' }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Compose Email
              </Button>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <EmailThreadItem
                key={thread.id}
                thread={thread}
                isSelected={selectedThread?.id === thread.id}
                onClick={() => setSelectedThread(thread)}
                brandColors={brandColors}
              />
            ))
          )}
        </ScrollArea>
        
        {/* Gmail Status */}
        <div className="p-3 border-t bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">
                Connected: {gmailStatus.email}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Thread Detail */}
      <ThreadDetailView
        thread={selectedThread}
        brandColors={brandColors}
        onReply={() => setShowCompose(true)}
        onClose={() => setSelectedThread(null)}
      />
      
      {/* Compose Dialog */}
      <EmailComposeDialog
        open={showCompose}
        onOpenChange={setShowCompose}
        projectId={currentProject?.id}
        contact={selectedThread?.linkedContact}
        defaultSubject={selectedThread ? `Re: ${selectedThread.subject}` : ''}
      />
    </div>
  )
}
