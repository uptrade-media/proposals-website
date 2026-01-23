// src/components/sync/SyncConnections.jsx
// Calendar connections management for Sync module
// Connect Google Calendar, Outlook, etc.

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

// ============================================================================
// CALENDAR PROVIDERS
// ============================================================================

const CALENDAR_PROVIDERS = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Sync with Google Calendar for automatic availability',
    icon: '/icons/google-calendar.svg',
    color: '#4285f4',
    available: true
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Connect your Outlook or Office 365 calendar',
    icon: '/icons/outlook.svg', 
    color: '#0078d4',
    available: true
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    description: 'Sync with iCloud Calendar',
    icon: '/icons/apple-calendar.svg',
    color: '#ff3b30',
    available: false
  },
  {
    id: 'caldav',
    name: 'CalDAV',
    description: 'Connect any CalDAV-compatible calendar',
    icon: '/icons/caldav.svg',
    color: '#6b7280',
    available: false
  }
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SyncConnections({ connections, onRefresh }) {
  const [syncing, setSyncing] = useState(null)
  
  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      case 'syncing':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }
  
  // Trigger manual sync
  const handleSync = async (connectionId) => {
    setSyncing(connectionId)
    // TODO: Call sync API
    await new Promise(resolve => setTimeout(resolve, 2000))
    setSyncing(null)
    onRefresh?.()
  }

  return (
    <div className="space-y-6">
      {/* Connected Calendars */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Connected Calendars</h2>
            <p className="text-sm text-muted-foreground">
              Sync your calendars for automatic availability
            </p>
          </div>
        </div>
        
        {connections.length > 0 ? (
          <div className="space-y-3">
            {connections.map((connection, index) => {
              const provider = CALENDAR_PROVIDERS.find(p => p.id === connection.provider) || {
                name: connection.provider,
                color: '#6b7280'
              }
              const isSyncing = syncing === connection.id
              
              return (
                <motion.div
                  key={connection.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${provider.color}20` }}
                        >
                          <Calendar 
                            className="h-5 w-5" 
                            style={{ color: provider.color }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{provider.name}</span>
                            {getStatusBadge(connection.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {connection.email || connection.calendar_name}
                          </p>
                          {connection.last_synced && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last synced: {new Date(connection.last_synced).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 mr-4">
                          <span className="text-xs text-muted-foreground">Auto-sync</span>
                          <Switch checked={connection.auto_sync} />
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSync(connection.id)}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                        </Button>
                        
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Calendar className="h-8 w-8 text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">No calendars connected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Connect a calendar to automatically sync your availability
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Available Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Add Calendar</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {CALENDAR_PROVIDERS.map((provider) => {
            const isConnected = connections.some(c => c.provider === provider.id)
            
            return (
              <Card 
                key={provider.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  !provider.available && "opacity-60 cursor-not-allowed"
                )}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${provider.color}20` }}
                    >
                      <Calendar 
                        className="h-5 w-5" 
                        style={{ color: provider.color }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.name}</span>
                        {!provider.available && (
                          <Badge variant="secondary" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                        {isConnected && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs">
                            Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                  
                  {provider.available && !isConnected && (
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Connect
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
