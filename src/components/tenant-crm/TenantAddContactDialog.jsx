/**
 * TenantAddContactDialog - Add new contact dialog for tenant CRM
 * Simple, clean form without agency-specific fields
 */
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Globe, 
  DollarSign,
  Loader2
} from 'lucide-react'
import { TENANT_PIPELINE_STAGES } from './TenantPipelineKanban'

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  website: '',
  deal_value: '',
  pipeline_stage: 'new_lead',
  notes: ''
}

export default function TenantAddContactDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false
}) {
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.name.trim() && !formData.email.trim()) {
      newErrors.name = 'Name or email is required'
      newErrors.email = 'Name or email is required'
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (formData.deal_value && isNaN(parseFloat(formData.deal_value))) {
      newErrors.deal_value = 'Must be a valid number'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) return
    
    const contactData = {
      ...formData,
      deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null
    }
    
    onSubmit?.(contactData)
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#4bbf39]" />
            Add New Contact
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--text-tertiary)]" />
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="John Doe"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[var(--text-tertiary)]" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john@example.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[var(--text-tertiary)]" />
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--text-tertiary)]" />
              Company
            </Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Acme Inc."
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[var(--text-tertiary)]" />
              Website
            </Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Deal Value */}
          <div className="space-y-2">
            <Label htmlFor="deal_value" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--text-tertiary)]" />
              Deal Value
            </Label>
            <Input
              id="deal_value"
              type="number"
              step="0.01"
              value={formData.deal_value}
              onChange={(e) => handleChange('deal_value', e.target.value)}
              placeholder="0.00"
              className={errors.deal_value ? 'border-red-500' : ''}
            />
            {errors.deal_value && (
              <p className="text-xs text-red-500">{errors.deal_value}</p>
            )}
          </div>

          {/* Pipeline Stage */}
          <div className="space-y-2">
            <Label>Pipeline Stage</Label>
            <Select
              value={formData.pipeline_stage}
              onValueChange={(value) => handleChange('pipeline_stage', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TENANT_PIPELINE_STAGES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.color}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes about this contact..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#4bbf39] hover:bg-[#4bbf39]/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Contact'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
