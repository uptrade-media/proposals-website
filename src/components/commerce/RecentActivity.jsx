// src/components/commerce/RecentActivity.jsx
// Recent sales, bookings, and activity feed

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Package,
  Briefcase,
  GraduationCap,
  CalendarDays,
  DollarSign,
  Users,
  Star,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const mockActivity = [
  {
    id: '1',
    type: 'sale',
    offeringType: 'product',
    title: 'GWA Logo Hoodie - Black (XL)',
    customer: { name: 'Sarah Johnson', email: 'sarah@example.com', avatar: null },
    amount: 59.99,
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
  },
  {
    id: '2',
    type: 'booking',
    offeringType: 'service',
    title: 'Personal Training Session',
    customer: { name: 'Mike Thompson', email: 'mike@example.com', avatar: null },
    amount: 75.00,
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
  },
  {
    id: '3',
    type: 'registration',
    offeringType: 'class',
    title: 'Morning HIIT Bootcamp',
    customer: { name: 'Emily Chen', email: 'emily@example.com', avatar: null },
    amount: 15.00,
    timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
  },
  {
    id: '4',
    type: 'ticket',
    offeringType: 'event',
    title: 'Summer Fitness Challenge Kickoff',
    customer: { name: 'James Wilson', email: 'james@example.com', avatar: null },
    amount: 25.00,
    quantity: 2,
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
  },
  {
    id: '5',
    type: 'sale',
    offeringType: 'product',
    title: 'Fitness Resistance Bands Set',
    customer: { name: 'Lisa Park', email: 'lisa@example.com', avatar: null },
    amount: 29.99,
    timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
  },
  {
    id: '6',
    type: 'review',
    offeringType: 'service',
    title: 'Nutrition Consultation',
    customer: { name: 'David Kim', email: 'david@example.com', avatar: null },
    rating: 5,
    comment: 'Amazing session! Learned so much about meal planning.',
    timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4 hours ago
  },
]

const typeIcons = {
  product: Package,
  service: Briefcase,
  class: GraduationCap,
  event: CalendarDays,
}

const typeLabels = {
  sale: 'New Order',
  booking: 'Booking',
  registration: 'Registration',
  ticket: 'Ticket Sale',
  review: 'New Review',
}

export function RecentActivity({ 
  activity = [], 
  showMockData = true,
  isLoading = false,
  onRefresh,
  brandColors = {},
  className 
}) {
  const displayActivity = activity.length > 0 ? activity : (showMockData ? mockActivity : [])
  
  const primary = brandColors.primary || '#4bbf39'
  const secondary = brandColors.secondary || '#39bfb0'
  const rgba = brandColors.rgba || { 
    primary10: 'rgba(75, 191, 57, 0.1)', 
    primary20: 'rgba(75, 191, 57, 0.2)',
    secondary10: 'rgba(57, 191, 176, 0.1)'
  }

  const getOfferingColor = (type) => {
    return ['product', 'class'].includes(type) ? primary : secondary
  }

  const getOfferingBgColor = (type) => {
    return ['product', 'class'].includes(type) ? rgba.primary10 : rgba.secondary10
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest sales, bookings, and activity</CardDescription>
          </div>
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivity.map((item) => {
            const Icon = typeIcons[item.offeringType] || Package
            const color = getOfferingColor(item.offeringType)
            const bgColor = getOfferingBgColor(item.offeringType)
            
            return (
              <div key={item.id} className="flex items-start gap-3">
                {/* Icon */}
                <div 
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: bgColor }}
                >
                  {item.type === 'review' ? (
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  ) : (
                    <Icon className="h-4 w-4" style={{ color }} />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {item.customer.name}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Amount or Rating */}
                    {item.type === 'review' ? (
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i}
                            className={cn(
                              "h-3 w-3",
                              i < item.rating ? "text-amber-500 fill-amber-500" : "text-muted"
                            )}
                          />
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="font-mono text-xs">
                        ${item.amount.toFixed(2)}
                        {item.quantity && item.quantity > 1 && (
                          <span className="ml-1 text-muted-foreground">×{item.quantity}</span>
                        )}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Review Comment */}
                  {item.type === 'review' && item.comment && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      "{item.comment}"
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          
          {displayActivity.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default RecentActivity
