/**
 * InviteTeamMemberDialog - Invite new Uptrade internal team members
 * Supports roles: admin, manager, sales_rep, developer
 */
import { useState, useEffect } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UPTRADE_ROLES } from '../shared/RoleBadge'

export default function InviteTeamMemberDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading = false 
}) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    teamRole: 'sales_rep',
    openphoneNumber: '',
    gmailAddress: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.(formData)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        email: '',
        name: '',
        teamRole: 'sales_rep',
        openphoneNumber: '',
        gmailAddress: ''
      })
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[var(--brand-primary)]" />
            Add Team Member
          </DialogTitle>
          <DialogDescription>
            Invite a new team member. They'll receive an email to set up their account with Google.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@uptrademedia.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.teamRole}
              onValueChange={(value) => handleChange('teamRole', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UPTRADE_ROLES).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openphone">OpenPhone Number</Label>
              <Input
                id="openphone"
                type="tel"
                placeholder="+1 555-0123"
                value={formData.openphoneNumber}
                onChange={(e) => handleChange('openphoneNumber', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gmail">Gmail Address</Label>
              <Input
                id="gmail"
                type="email"
                placeholder="john@gmail.com"
                value={formData.gmailAddress}
                onChange={(e) => handleChange('gmailAddress', e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
