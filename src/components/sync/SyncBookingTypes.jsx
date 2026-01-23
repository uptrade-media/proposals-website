// src/components/sync/SyncBookingTypes.jsx
// Booking types management for Sync module
// Create and manage different booking link types

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Link2,
  Plus,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  Clock,
  Video,
  Phone,
  MapPin,
  Users,
  MoreHorizontal,
  CheckCircle,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SyncBookingTypes({ bookingTypes, onRefresh }) {
  const [copiedId, setCopiedId] = useState(null)
  
  // Copy booking link
  const copyLink = (bookingType) => {
    const link = `${window.location.origin}/book/${bookingType.slug}`
    navigator.clipboard.writeText(link)
    setCopiedId(bookingType.id)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }
  
  // Get location icon
  const getLocationIcon = (type) => {
    switch (type) {
      case 'video': return Video
      case 'phone': return Phone
      case 'in-person': return MapPin
      default: return Globe
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Booking Types</h2>
          <p className="text-sm text-muted-foreground">
            Create different meeting types for clients to book
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1.5" />
          New Booking Type
        </Button>
      </div>
      
      {/* Booking Types Grid */}
      {bookingTypes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookingTypes.map((type, index) => {
            const LocationIcon = getLocationIcon(type.location_type)
            const isCopied = copiedId === type.id
            
            return (
              <motion.div
                key={type.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-10 rounded-full"
                          style={{ backgroundColor: type.color || '#3b82f6' }}
                        />
                        <div>
                          <CardTitle className="text-base">{type.name}</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {type.duration_minutes} minutes
                          </CardDescription>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyLink(type)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Description */}
                    {type.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {type.description}
                      </p>
                    )}
                    
                    {/* Details */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {type.duration_minutes} min
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <LocationIcon className="h-3 w-3 mr-1" />
                        {type.location_type || 'Video'}
                      </Badge>
                      {type.max_bookings_per_day && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {type.max_bookings_per_day}/day max
                        </Badge>
                      )}
                    </div>
                    
                    {/* Status & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch checked={type.is_active} />
                        <span className="text-xs text-muted-foreground">
                          {type.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyLink(type)}
                        className="text-xs"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3 w-3 mr-1" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      ) : (
        // Empty State
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Link2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No booking types yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Create booking types to let clients schedule meetings with you
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Booking Type
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
