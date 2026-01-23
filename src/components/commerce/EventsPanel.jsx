// src/components/commerce/EventsPanel.jsx
// Events panel - dates, tickets, capacity, venues

import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays,
  Plus,
  ChevronRight,
  Clock,
  Ticket,
  Users,
  MapPin,
  Video,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, differenceInDays } from 'date-fns'

// Mock data for demo
const mockEvents = [
  { 
    id: '1', 
    name: 'Summer Fitness Challenge Kickoff', 
    date: addDays(new Date(), 3),
    capacity: 100,
    sold: 67,
    price: 25,
    type: 'in_person'
  },
  { 
    id: '2', 
    name: 'Nutrition Masterclass', 
    date: addDays(new Date(), 7),
    capacity: 50,
    sold: 34,
    price: 35,
    type: 'virtual'
  },
  { 
    id: '3', 
    name: 'Community Workout Day', 
    date: addDays(new Date(), 14),
    capacity: 200,
    sold: 89,
    price: 0,
    type: 'in_person'
  },
]

const mockUpcoming = [
  { 
    id: '1', 
    name: 'Summer Fitness Challenge Kickoff', 
    date: addDays(new Date(), 3),
    capacity: 100,
    sold: 67,
    venue: 'City Park Pavilion',
    type: 'in_person'
  },
  { 
    id: '2', 
    name: 'Nutrition Masterclass', 
    date: addDays(new Date(), 7),
    capacity: 50,
    sold: 34,
    venue: 'Zoom',
    type: 'virtual'
  },
]

export function EventsPanel({ 
  events = [], 
  upcomingEvents = [],
  stats = {},
  showMockData = true,
  compact = false,
  brandColors = {},
  className 
}) {
  const navigate = useNavigate()
  
  const displayEvents = events.length > 0 ? events : (showMockData ? mockEvents : [])
  const displayUpcoming = upcomingEvents.length > 0 ? upcomingEvents : (showMockData ? mockUpcoming : [])
  const displayStats = Object.keys(stats).length > 0 ? stats : (showMockData ? {
    totalEvents: 5,
    upcomingEvents: 3,
    ticketsSold: 190,
    totalRevenue: 4750,
  } : {})

  const secondary = brandColors.secondary || '#39bfb0'
  const rgba = brandColors.rgba || { secondary10: 'rgba(57, 191, 176, 0.1)', secondary20: 'rgba(57, 191, 176, 0.2)' }

  if (compact) {
    return (
      <Card className={cn("border-l-4", className)} style={{ borderLeftColor: secondary }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: rgba.secondary10, color: secondary }}
              >
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Events</p>
                <p className="text-sm text-muted-foreground">{displayStats.upcomingEvents || 0} upcoming</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('/commerce/offerings?type=event')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {displayUpcoming.length > 0 && (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Next:</span>{' '}
              <span className="font-medium">{displayUpcoming[0].name}</span>
              <span className="text-muted-foreground"> in {differenceInDays(displayUpcoming[0].date, new Date())} days</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-l-4", className)} style={{ borderLeftColor: secondary }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: rgba.secondary10, color: secondary }}
            >
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>Ticketed experiences</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/commerce/offerings/new?type=event')}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Events" value={displayStats.totalEvents || 0} />
          <StatBox label="Upcoming" value={displayStats.upcomingEvents || 0} />
          <StatBox label="Sold" value={displayStats.ticketsSold || 0} />
          <StatBox label="Revenue" value={`$${displayStats.totalRevenue || 0}`} />
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Upcoming Events</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/commerce/offerings?type=event">View All</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {displayUpcoming.slice(0, 3).map(event => {
              const daysUntil = differenceInDays(event.date, new Date())
              const fillPercent = Math.round((event.sold / event.capacity) * 100)
              const isAlmostFull = fillPercent >= 80
              
              return (
                <div 
                  key={event.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/commerce/offerings/${event.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{event.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{format(event.date, 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={daysUntil <= 3 ? 'default' : 'outline'}
                      className={daysUntil <= 3 ? 'bg-amber-500' : ''}
                    >
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {event.type === 'virtual' ? (
                        <>
                          <Video className="h-3.5 w-3.5" />
                          <span>Virtual</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{event.venue}</span>
                        </>
                      )}
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        isAlmostFull && "text-amber-600"
                      )}>
                        {event.sold}/{event.capacity}
                      </span>
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${fillPercent}%`,
                            backgroundColor: isAlmostFull ? '#f59e0b' : secondary
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {displayUpcoming.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No upcoming events
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/commerce/events/calendar">
              <CalendarDays className="h-4 w-4 mr-2" />
              Event Calendar
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/commerce/events/attendees">
              <Users className="h-4 w-4 mr-2" />
              Attendees
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="p-2 rounded-lg bg-muted/50 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export default EventsPanel
