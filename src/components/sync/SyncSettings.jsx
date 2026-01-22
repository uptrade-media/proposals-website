// src/components/sync/SyncSettings.jsx
// Settings and configuration for Sync module
// Availability, timezone, buffer times, notifications

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Globe,
  Bell,
  Shield,
  Calendar,
  Zap,
  Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ============================================================================
// DAYS OF WEEK
// ============================================================================

const DAYS_OF_WEEK = [
  { id: 'mon', label: 'Mon', full: 'Monday' },
  { id: 'tue', label: 'Tue', full: 'Tuesday' },
  { id: 'wed', label: 'Wed', full: 'Wednesday' },
  { id: 'thu', label: 'Thu', full: 'Thursday' },
  { id: 'fri', label: 'Fri', full: 'Friday' },
  { id: 'sat', label: 'Sat', full: 'Saturday' },
  { id: 'sun', label: 'Sun', full: 'Sunday' }
]

// ============================================================================
// TIMEZONES (Common ones)
// ============================================================================

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' }
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SyncSettings({ settings, onSave }) {
  const [localSettings, setLocalSettings] = useState(settings || {
    timezone: 'America/New_York',
    availability: {
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      start_time: '09:00',
      end_time: '17:00'
    },
    buffers: {
      before: 5,
      after: 5
    },
    notifications: {
      email_reminders: true,
      sms_reminders: false,
      reminder_time: 15 // minutes before
    },
    booking: {
      require_confirmation: false,
      allow_cancellation: true,
      cancellation_notice: 24, // hours
      max_advance_days: 60
    }
  })
  
  const [saving, setSaving] = useState(false)
  
  // Toggle day availability
  const toggleDay = (dayId) => {
    setLocalSettings(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        days: prev.availability.days.includes(dayId)
          ? prev.availability.days.filter(d => d !== dayId)
          : [...prev.availability.days, dayId]
      }
    }))
  }
  
  // Update nested setting
  const updateSetting = (section, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }
  
  // Save settings
  const handleSave = async () => {
    setSaving(true)
    await onSave?.(localSettings)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Timezone */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Timezone</CardTitle>
          </div>
          <CardDescription>
            Your timezone for scheduling and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={localSettings.timezone}
            onValueChange={(value) => setLocalSettings(prev => ({ ...prev, timezone: value }))}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {/* Availability */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Availability</CardTitle>
          </div>
          <CardDescription>
            Set your default available days and hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Days */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Available Days</Label>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-medium transition-all",
                    localSettings.availability.days.includes(day.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Hours */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <Label className="text-sm font-medium mb-2 block">Start Time</Label>
              <Input 
                type="time" 
                value={localSettings.availability.start_time}
                onChange={(e) => updateSetting('availability', 'start_time', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">End Time</Label>
              <Input 
                type="time" 
                value={localSettings.availability.end_time}
                onChange={(e) => updateSetting('availability', 'end_time', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Buffer Times */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Buffer Times</CardTitle>
          </div>
          <CardDescription>
            Add padding before and after meetings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 max-w-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Before meetings</Label>
                <span className="text-sm text-muted-foreground">
                  {localSettings.buffers.before} min
                </span>
              </div>
              <Slider
                value={[localSettings.buffers.before]}
                onValueChange={([value]) => updateSetting('buffers', 'before', value)}
                max={30}
                min={0}
                step={5}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">After meetings</Label>
                <span className="text-sm text-muted-foreground">
                  {localSettings.buffers.after} min
                </span>
              </div>
              <Slider
                value={[localSettings.buffers.after]}
                onValueChange={([value]) => updateSetting('buffers', 'after', value)}
                max={30}
                min={0}
                step={5}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure reminders and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Email Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive email reminders before meetings
              </p>
            </div>
            <Switch 
              checked={localSettings.notifications.email_reminders}
              onCheckedChange={(checked) => updateSetting('notifications', 'email_reminders', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">SMS Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get text message reminders
              </p>
            </div>
            <Switch 
              checked={localSettings.notifications.sms_reminders}
              onCheckedChange={(checked) => updateSetting('notifications', 'sms_reminders', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="max-w-xs">
            <Label className="text-sm font-medium mb-2 block">Reminder Time</Label>
            <Select 
              value={String(localSettings.notifications.reminder_time)}
              onValueChange={(value) => updateSetting('notifications', 'reminder_time', Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="10">10 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="1440">1 day before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Booking Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Booking Rules</CardTitle>
          </div>
          <CardDescription>
            Control how people can book with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Require Confirmation</Label>
              <p className="text-sm text-muted-foreground">
                Manually approve each booking request
              </p>
            </div>
            <Switch 
              checked={localSettings.booking.require_confirmation}
              onCheckedChange={(checked) => updateSetting('booking', 'require_confirmation', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Allow Cancellation</Label>
              <p className="text-sm text-muted-foreground">
                Let attendees cancel their bookings
              </p>
            </div>
            <Switch 
              checked={localSettings.booking.allow_cancellation}
              onCheckedChange={(checked) => updateSetting('booking', 'allow_cancellation', checked)}
            />
          </div>
          
          {localSettings.booking.allow_cancellation && (
            <div className="pl-4 border-l-2 border-muted max-w-xs">
              <Label className="text-sm font-medium mb-2 block">Minimum Notice</Label>
              <Select 
                value={String(localSettings.booking.cancellation_notice)}
                onValueChange={(value) => updateSetting('booking', 'cancellation_notice', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <Separator />
          
          <div className="max-w-xs">
            <Label className="text-sm font-medium mb-2 block">Max Days in Advance</Label>
            <Select 
              value={String(localSettings.booking.max_advance_days)}
              onValueChange={(value) => updateSetting('booking', 'max_advance_days', Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
                <SelectItem value="60">2 months</SelectItem>
                <SelectItem value="90">3 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Zap className="h-4 w-4 mr-2 animate-pulse" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
