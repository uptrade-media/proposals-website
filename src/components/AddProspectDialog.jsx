// src/components/AddProspectDialog.jsx
/**
 * Reusable Add Prospect Dialog
 * 
 * Can be used standalone or embedded in other dialogs
 * like the ProposalAIDialog.
 */
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Loader2, UserPlus, Building2, Mail, Phone, Globe, FileText } from 'lucide-react'
import api from '../lib/api'
import { toast } from '../lib/toast'

const LEAD_SOURCES = [
  { value: 'outreach', label: 'Outreach' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'event', label: 'Event' },
  { value: 'social', label: 'Social Media' },
  { value: 'other', label: 'Other' },
]

export default function AddProspectDialog({
  isOpen,
  onClose,
  onSuccess,
  initialData = {}
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    company: initialData.company || '',
    phone: initialData.phone || '',
    website: initialData.website || '',
    source: initialData.source || 'outreach',
    notes: initialData.notes || '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.post('/.netlify/functions/admin-clients-create', {
        ...formData,
        contactType: 'prospect',
        pipeline_stage: 'new_lead'
      })
      
      toast.success('Prospect added successfully!')
      
      // Return the created prospect data
      if (onSuccess) {
        onSuccess({
          id: response.data.contact?.id || response.data.id,
          name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
          website: formData.website,
          pipelineStage: 'new_lead'
        })
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        website: '',
        source: 'outreach',
        notes: '',
      })
      
      onClose()
    } catch (err) {
      console.error('Failed to add prospect:', err)
      toast.error(err.response?.data?.error || 'Failed to add prospect')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg glass-bg border-[var(--glass-border)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            Add New Prospect
          </DialogTitle>
          <DialogDescription>
            Add a new prospect to create a proposal for them
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Company Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <UserPlus className="w-3.5 h-3.5" />
                Name *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="John Smith"
                className="glass-bg border-[var(--glass-border)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <Building2 className="w-3.5 h-3.5" />
                Company
              </Label>
              <Input
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="Acme Corp"
                className="glass-bg border-[var(--glass-border)]"
              />
            </div>
          </div>

          {/* Email & Phone Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <Mail className="w-3.5 h-3.5" />
                Email
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@acme.com"
                className="glass-bg border-[var(--glass-border)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <Phone className="w-3.5 h-3.5" />
                Phone
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="glass-bg border-[var(--glass-border)]"
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <Globe className="w-3.5 h-3.5" />
              Website
            </Label>
            <Input
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://acme.com"
              className="glass-bg border-[var(--glass-border)]"
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label className="text-[var(--text-secondary)]">Lead Source</Label>
            <Select value={formData.source} onValueChange={(v) => handleChange('source', v)}>
              <SelectTrigger className="glass-bg border-[var(--glass-border)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <FileText className="w-3.5 h-3.5" />
              Notes
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Initial notes about this prospect..."
              rows={3}
              className="glass-bg border-[var(--glass-border)]"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-[var(--glass-border)]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] hover:opacity-90"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Adding...</>
              ) : (
                <><UserPlus className="h-4 w-4" />Add Prospect</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
