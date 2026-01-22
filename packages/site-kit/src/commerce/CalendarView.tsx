/**
 * @uptrade/site-kit/commerce - CalendarView
 * 
 * Monthly calendar view for displaying events.
 */

'use client'

import React, { useEffect, useState, useMemo } from 'react'
import type { CommerceOffering, CommerceSchedule } from './types'
import { fetchUpcomingEvents } from './api'
import { formatTime } from './utils'

export interface CalendarViewProps {
  /** Pre-loaded events (optional - will fetch if not provided) */
  events?: CommerceOffering[]
  /** Initial month to display (defaults to current) */
  initialDate?: Date
  /** Category filter */
  category?: string
  /** Callback when event is clicked */
  onEventClick?: (event: CommerceOffering, schedule: CommerceSchedule) => void
  /** Callback when day is clicked */
  onDayClick?: (date: Date, events: EventOnDay[]) => void
  /** Show navigation arrows */
  showNavigation?: boolean
  /** Show month/year header */
  showHeader?: boolean
  /** First day of week (0 = Sunday, 1 = Monday) */
  weekStartsOn?: 0 | 1
  /** Minimum date to show */
  minDate?: Date
  /** Maximum date to show */
  maxDate?: Date
  /** Custom class names */
  className?: string
  headerClassName?: string
  dayClassName?: string
  eventClassName?: string
  todayClassName?: string
}

export interface EventOnDay {
  event: CommerceOffering
  schedule: CommerceSchedule
}

interface DayData {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: EventOnDay[]
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function CalendarView({
  events: propEvents,
  initialDate,
  category,
  onEventClick,
  onDayClick,
  showNavigation = true,
  showHeader = true,
  weekStartsOn = 0,
  minDate,
  maxDate,
  className = '',
  headerClassName = '',
  dayClassName = '',
  eventClassName = '',
  todayClassName = '',
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [events, setEvents] = useState<CommerceOffering[]>(propEvents || [])
  const [loading, setLoading] = useState(!propEvents)
  
  // Fetch events if not provided
  useEffect(() => {
    if (propEvents) {
      setEvents(propEvents)
      return
    }
    
    async function load() {
      setLoading(true)
      try {
        // Fetch events for a reasonable range (6 months)
        const data = await fetchUpcomingEvents({ limit: 100, category })
        setEvents(data)
      } catch (e) {
        console.error('Failed to load events:', e)
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [propEvents, category])
  
  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    // Start from the first day of the week containing the first of the month
    const startDate = new Date(firstDay)
    const dayOfWeek = startDate.getDay()
    const daysToSubtract = (dayOfWeek - weekStartsOn + 7) % 7
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    // End on the last day of the week containing the last of the month
    const endDate = new Date(lastDay)
    const endDayOfWeek = endDate.getDay()
    const daysToAdd = (6 - endDayOfWeek + weekStartsOn) % 7
    endDate.setDate(endDate.getDate() + daysToAdd)
    
    // Build event lookup by date
    const eventsByDate = new Map<string, EventOnDay[]>()
    
    events.forEach(event => {
      const schedules = event.schedules || []
      schedules.forEach(schedule => {
        const scheduleDate = new Date(schedule.starts_at)
        const dateKey = `${scheduleDate.getFullYear()}-${scheduleDate.getMonth()}-${scheduleDate.getDate()}`
        
        if (!eventsByDate.has(dateKey)) {
          eventsByDate.set(dateKey, [])
        }
        eventsByDate.get(dateKey)!.push({ event, schedule })
      })
    })
    
    // Generate days
    const days: DayData[] = []
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    
    const current = new Date(startDate)
    while (current <= endDate) {
      const dateKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: dateKey === todayKey,
        events: eventsByDate.get(dateKey) || [],
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [currentDate, events, weekStartsOn])
  
  // Navigation
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    if (!minDate || newDate >= minDate) {
      setCurrentDate(newDate)
    }
  }
  
  const goToNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    if (!maxDate || newDate <= maxDate) {
      setCurrentDate(newDate)
    }
  }
  
  const goToToday = () => {
    setCurrentDate(new Date())
  }
  
  // Day headers adjusted for week start
  const dayHeaders = weekStartsOn === 1
    ? [...DAYS_SHORT.slice(1), DAYS_SHORT[0]]
    : DAYS_SHORT
  
  const handleEventClick = (e: React.MouseEvent, event: CommerceOffering, schedule: CommerceSchedule) => {
    e.stopPropagation()
    if (onEventClick) {
      onEventClick(event, schedule)
    } else {
      window.location.href = `/events/${event.slug}`
    }
  }
  
  const handleDayClick = (day: DayData) => {
    if (onDayClick) {
      onDayClick(day.date, day.events)
    }
  }
  
  return (
    <div className={`site-kit-calendar ${className}`} style={{
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      {showHeader && (
        <div 
          className={`site-kit-calendar-header ${headerClassName}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {showNavigation && (
            <button
              onClick={goToPreviousMonth}
              style={{
                padding: '0.5rem',
                border: 'none',
                background: '#f3f4f6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1.25rem',
                lineHeight: 1,
              }}
              aria-label="Previous month"
            >
              ←
            </button>
          )}
          
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            {showNavigation && (
              <button
                onClick={goToToday}
                style={{
                  marginTop: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  border: 'none',
                  background: 'transparent',
                  color: '#2563eb',
                  cursor: 'pointer',
                }}
              >
                Today
              </button>
            )}
          </div>
          
          {showNavigation && (
            <button
              onClick={goToNextMonth}
              style={{
                padding: '0.5rem',
                border: 'none',
                background: '#f3f4f6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1.25rem',
                lineHeight: 1,
              }}
              aria-label="Next month"
            >
              →
            </button>
          )}
        </div>
      )}
      
      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: '1px solid #e5e7eb',
      }}>
        {dayHeaders.map(day => (
          <div
            key={day}
            style={{
              padding: '0.75rem 0.5rem',
              textAlign: 'center',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#666',
              textTransform: 'uppercase',
            }}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
      }}>
        {calendarDays.map((day, index) => (
          <div
            key={index}
            onClick={() => handleDayClick(day)}
            className={`site-kit-calendar-day ${dayClassName} ${day.isToday ? `site-kit-calendar-today ${todayClassName}` : ''}`}
            style={{
              minHeight: '100px',
              padding: '0.5rem',
              borderRight: (index + 1) % 7 !== 0 ? '1px solid #e5e7eb' : 'none',
              borderBottom: '1px solid #e5e7eb',
              background: day.isCurrentMonth ? 'white' : '#f9fafb',
              cursor: day.events.length > 0 || onDayClick ? 'pointer' : 'default',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '0.25rem',
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                fontSize: '0.875rem',
                fontWeight: day.isToday ? 600 : 400,
                color: day.isToday ? 'white' : (day.isCurrentMonth ? '#111' : '#9ca3af'),
                background: day.isToday ? '#2563eb' : 'transparent',
              }}>
                {day.date.getDate()}
              </span>
            </div>
            
            {/* Events */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {day.events.slice(0, 3).map((item, eventIndex) => (
                <button
                  key={`${item.event.id}-${item.schedule.id}`}
                  onClick={(e) => handleEventClick(e, item.event, item.schedule)}
                  className={`site-kit-calendar-event ${eventClassName}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '2px 4px',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: '3px',
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                  title={`${item.event.name} - ${formatTime(item.schedule.starts_at)}`}
                >
                  {item.event.name}
                </button>
              ))}
              {day.events.length > 3 && (
                <span style={{
                  fontSize: '0.65rem',
                  color: '#666',
                  textAlign: 'center',
                }}>
                  +{day.events.length - 3} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.8)',
        }}>
          Loading...
        </div>
      )}
    </div>
  )
}

export default CalendarView
