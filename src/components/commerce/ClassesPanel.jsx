// src/components/commerce/ClassesPanel.jsx
// Classes panel - schedules, capacity, recurring sessions

import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap,
  Plus,
  ChevronRight,
  Clock,
  Calendar,
  Users,
  Repeat,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, setHours, setMinutes } from 'date-fns'

// Mock data for demo
const mockClasses = [
  { id: '1', name: 'Morning HIIT Bootcamp', duration: 45, capacity: 20, price: 15, recurring: true },
  { id: '2', name: 'Yoga Flow', duration: 60, capacity: 15, price: 12, recurring: true },
  { id: '3', name: 'Strength Training 101', duration: 50, capacity: 12, price: 18, recurring: true },
  { id: '4', name: 'Meditation Workshop', duration: 30, capacity: 25, price: 10, recurring: false },
]

const mockUpcoming = [
  { 
    id: '1', 
    class: 'Morning HIIT Bootcamp', 
    date: setMinutes(setHours(addDays(new Date(), 0), 6), 30),
    capacity: 20,
    enrolled: 18,
    location: 'Main Studio'
  },
  { 
    id: '2', 
    class: 'Yoga Flow', 
    date: setMinutes(setHours(addDays(new Date(), 0), 9), 0),
    capacity: 15,
    enrolled: 12,
    location: 'Studio B'
  },
  { 
    id: '3', 
    class: 'Strength Training 101', 
    date: setMinutes(setHours(addDays(new Date(), 0), 17), 30),
    capacity: 12,
    enrolled: 10,
    location: 'Weight Room'
  },
  { 
    id: '4', 
    class: 'Morning HIIT Bootcamp', 
    date: setMinutes(setHours(addDays(new Date(), 1), 6), 30),
    capacity: 20,
    enrolled: 15,
    location: 'Main Studio'
  },
]

export function ClassesPanel({ 
  classes = [], 
  upcomingSessions = [],
  stats = {},
  showMockData = true,
  compact = false,
  brandColors = {},
  className 
}) {
  const navigate = useNavigate()
  
  const displayClasses = classes.length > 0 ? classes : (showMockData ? mockClasses : [])
  const displayUpcoming = upcomingSessions.length > 0 ? upcomingSessions : (showMockData ? mockUpcoming : [])
  const displayStats = Object.keys(stats).length > 0 ? stats : (showMockData ? {
    totalClasses: 8,
    activeClasses: 6,
    todaySessions: 5,
    weekAttendees: 156,
  } : {})

  const primary = brandColors.primary || '#4bbf39'
  const rgba = brandColors.rgba || { primary10: 'rgba(75, 191, 57, 0.1)', primary20: 'rgba(75, 191, 57, 0.2)' }

  if (compact) {
    return (
      <Card className={cn("border-l-4", className)} style={{ borderLeftColor: primary }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: rgba.primary10, color: primary }}
              >
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Classes</p>
                <p className="text-sm text-muted-foreground">{displayStats.todaySessions || 0} sessions today</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('/commerce/offerings?type=class')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {displayUpcoming.length > 0 && (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Next:</span>{' '}
              <span className="font-medium">{displayUpcoming[0].class}</span>
              <span className="text-muted-foreground"> at {format(displayUpcoming[0].date, 'h:mm a')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-l-4", className)} style={{ borderLeftColor: primary }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: rgba.primary10, color: primary }}
            >
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Classes</CardTitle>
              <CardDescription>Scheduled group sessions</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/commerce/offerings/new?type=class')}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Classes" value={displayStats.totalClasses || 0} />
          <StatBox label="Today" value={displayStats.todaySessions || 0} />
          <StatBox label="Week" value={displayStats.weekAttendees || 0} />
          <StatBox label="Recurring" value={displayStats.recurringClasses || 6} />
        </div>

        {/* Today's Schedule */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Today's Schedule</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/commerce/schedule">Full Schedule</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {displayUpcoming.slice(0, 4).map(session => {
              const fillPercent = Math.round((session.enrolled / session.capacity) * 100)
              const isAlmostFull = fillPercent >= 80
              
              return (
                <div 
                  key={session.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/commerce/sessions/${session.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {format(session.date, 'h:mm a')}
                      </Badge>
                      <span className="text-sm font-medium">{session.class}</span>
                    </div>
                    {isAlmostFull && (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        Almost Full
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{session.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      <span>{session.enrolled}/{session.capacity}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${fillPercent}%`,
                            backgroundColor: isAlmostFull ? '#f59e0b' : primary
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
                No classes scheduled today
              </div>
            )}
          </div>
        </div>

        {/* Class List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Your Classes</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/commerce/offerings?type=class">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {displayClasses.slice(0, 4).map(cls => (
              <div 
                key={cls.id}
                className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/commerce/offerings/${cls.id}`)}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {cls.recurring && <Repeat className="h-3 w-3" style={{ color: primary }} />}
                  <p className="text-sm font-medium truncate">{cls.name}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{cls.duration} min</span>
                  <span>•</span>
                  <Users className="h-3 w-3" />
                  <span>Max {cls.capacity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Management */}
        <Button variant="outline" className="w-full justify-between" asChild>
          <Link to="/commerce/schedule/manage">
            Manage Class Schedule
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
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

export default ClassesPanel
