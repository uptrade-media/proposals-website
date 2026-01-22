// src/components/affiliates/EditAffiliateDialog.jsx
// Dialog to edit an existing affiliate

import { useState, useEffect } from 'react'
import { Globe, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  SelectValue,
} from '@/components/ui/select'
import useAffiliatesStore from '@/lib/affiliates-store'
import { toast } from 'sonner'

export default function EditAffiliateDialog({ affiliate, children }) {
  const { updateAffiliate } = useAffiliatesStore()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    logo_url: '',
    notes: '',
    status: 'active',
  })

  useEffect(() => {
    if (affiliate) {
      setFormData({
        name: affiliate.name || '',
        website_url: affiliate.website_url || '',
        logo_url: affiliate.logo_url || '',
        notes: affiliate.notes || '',
        status: affiliate.status || 'active',
      })
    }
  }, [affiliate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setIsSubmitting(true)
    try {
      await updateAffiliate(affiliate.id, formData)
      toast.success('Affiliate updated')
      setOpen(false)
    } catch (error) {
      toast.error('Failed to update affiliate')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Affiliate</DialogTitle>
          <DialogDescription>
            Update affiliate details and settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Company or person name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="website_url"
                name="website_url"
                placeholder="https://example.com"
                value={formData.website_url}
                onChange={handleChange}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <div className="flex gap-2">
              <Input
                id="logo_url"
                name="logo_url"
                placeholder="https://example.com/logo.png"
                value={formData.logo_url}
                onChange={handleChange}
                className="flex-1"
              />
              {formData.logo_url && (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img 
                    src={formData.logo_url} 
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional information..."
              value={formData.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
