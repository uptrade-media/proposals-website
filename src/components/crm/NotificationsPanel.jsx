// src/components/crm/NotificationsPanel.jsx
// Smart notifications bell with dropdown panel

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Clock, User, FileText, Phone, Mail, TrendingUp, AlertCircle, Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

const NOTIFICATION_ICONS = {
  website_visit: User,
  hot_lead_callback: TrendingUp,
  overdue_followup: Clock,
  proposal_engagement: FileText,
  proposal_stale: AlertCircle,
  score_spike: TrendingUp
}

const NOTIFICATION_COLORS = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-400'
}

function NotificationItem({ notification, onMarkRead, onAction, onViewContact }) {
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell
  const priorityColor = NOTIFICATION_COLORS[notification.priority] || NOTIFICATION_COLORS.normal
  
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
  
  return (
    <div 
      className={cn(
        "p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors",
        !notification.read_at && "bg-blue-50/50"
      )}
      onClick={() => {
        onMarkRead(notification.id)
        if (notification.contact) {
          onViewContact(notification.contact)
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-full flex-shrink-0", priorityColor)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900 truncate">
              {notification.title}
            </span>
            {notification.priority === 'urgent' && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                URGENT
              </Badge>
            )}
          </div>
          
          {notification.message && (
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-gray-400">{timeAgo}</span>
            
            {notification.contact?.company && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-[10px] text-gray-500 truncate">
                  {notification.contact.company}
                </span>
              </>
            )}
          </div>
        </div>
        
        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
      </div>
    </div>
  )
}

export default function NotificationsPanel({ onViewContact }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [counts, setCounts] = useState({ total: 0, byType: {} })
  const [isLoading, setIsLoading] = useState(false)
  const panelRef = useRef(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/.netlify/functions/crm-notifications', {
        params: { unreadOnly: 'true', limit: '20' }
      })
      setNotifications(res.data.notifications || [])
      setCounts(res.data.counts || { total: 0, byType: {} })
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
    
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Mark notification as read
  const handleMarkRead = async (notificationId) => {
    try {
      await api.post('/.netlify/functions/crm-notifications', {
        action: 'markRead',
        notificationId
      })
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      )
      setCounts(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.post('/.netlify/functions/crm-notifications', {
        action: 'markRead',
        markAll: true
      })
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
      )
      setCounts({ total: 0, byType: {} })
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {counts.total > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
            {counts.total > 9 ? '9+' : counts.total}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {counts.total > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {counts.total} unread
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {counts.total > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleMarkAllRead}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="max-h-[400px]">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No new notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onViewContact={onViewContact}
                />
              ))
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <Button
                variant="ghost"
                className="w-full text-xs h-8 text-gray-600"
                onClick={() => {
                  // Could navigate to a full notifications page
                  fetchNotifications()
                }}
              >
                Refresh
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
