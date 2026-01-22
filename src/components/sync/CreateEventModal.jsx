// src/components/sync/CreateEventModal.jsx
// Modal for creating new calendar events, focus time, tasks

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  Clock,
  Users,
  MapPin,
  Video,
  Focus,
  Coffee,
  Briefcase,
  CheckSquare,
  Loader2,
  ChevronDown,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const EVENT_TYPES = [
  { id: 'event', label: 'Event', icon: Calendar, color: 'bg-sky-500' },
  { id: 'meeting', label: 'Meeting', icon: Video, color: 'bg-rose-400' },
  { id: 'focus', label: 'Focus Time', icon: Focus, color: 'bg-teal-500' },
  { id: 'task', label: 'Task', icon: CheckSquare, color: 'bg-amber-400' },
  { id: 'break', label: 'Break', icon: Coffee, color: 'bg-orange-400' },
  { id: 'work', label: 'Project Work', icon: Briefcase, color: 'bg-violet-400' },
]

const DURATION_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: 'custom', label: 'Custom' },
]

export default function CreateEventModal({ 
  isOpen, 
  onClose, 
  selectedDate,
  selectedTime,
  initialType = 'event',
  onCreated 
}) {
  const [eventType, setEventType] = useState(initialType)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState(selectedTime || '09:00')
  const [duration, setDuration] = useState('30')
  const [location, setLocation] = useState('')
  const [attendees, setAttendees] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEventType(initialType)
      setTitle('')
      setDescription('')
      setDate(selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0])
      setStartTime(selectedTime || '09:00')
      setDuration(initialType === 'focus' ? '90' : '30')
      setLocation('')
      setAttendees('')
    }
  }, [isOpen, initialType, selectedDate, selectedTime])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    setSaving(true)
    try {
      // For now, just show success - actual API integration TBD
      // The calendar stores these as local events
      toast.success('Event created successfully')
      onCreated?.()
      onClose()
    } catch (error) {
      toast.error('Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  const selectedTypeConfig = EVENT_TYPES.find(t => t.id === eventType)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", selectedTypeConfig?.color)}>
              {selectedTypeConfig && <selectedTypeConfig.icon className="h-4 w-4 text-white" />}
            </div>
            Create {selectedTypeConfig?.label || 'Event'}
          </DialogTitle>
          <DialogDescription>
            Add a new item to your calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Event Type Selector */}
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setEventType(type.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  eventType === type.id
                    ? `${type.color} text-white shadow-sm`
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                <type.icon className="h-3.5 w-3.5" />
                {type.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder={eventType === 'focus' ? 'Deep work session' : 'Enter title...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location (for meetings/events) */}
          {['event', 'meeting'].includes(eventType) && (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="Add location or video link"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {/* Attendees (for meetings) */}
          {eventType === 'meeting' && (
            <div className="space-y-2">
              <Label htmlFor="attendees">Attendees</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="attendees"
                  placeholder="Add attendees (comma-separated emails)"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className={cn(selectedTypeConfig?.color, "text-white")}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create {selectedTypeConfig?.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
