// src/components/affiliates/CreateAffiliateDialog.jsx
// Dialog to create a new affiliate

import { useState } from 'react'
import { Plus, Globe, Loader2 } from 'lucide-react'
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
import useAuthStore from '@/lib/auth-store'
import useAffiliatesStore from '@/lib/affiliates-store'
import { toast } from 'sonner'

export default function CreateAffiliateDialog({ children }) {
  const { currentProject } = useAuthStore()
  const { createAffiliate } = useAffiliatesStore()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingLogo, setIsFetchingLogo] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    logo_url: '',
    notes: '',
    status: 'active',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleWebsiteBlur = async () => {
    const url = formData.website_url
    if (!url || formData.logo_url) return

    // Try to scrape logo from website
    setIsFetchingLogo(true)
    try {
      // Use Google's favicon service
      const cleanUrl = url.replace(/^https?:\/\//, '').split('/')[0]
      const logoUrl = `https://www.google.com/s2/favicons?domain=${cleanUrl}&sz=128`
      
      // Verify the favicon exists by loading it
      const img = new Image()
      img.onload = () => {
        setFormData(prev => ({ ...prev, logo_url: logoUrl }))
        setIsFetchingLogo(false)
      }
      img.onerror = () => {
        setIsFetchingLogo(false)
      }
      img.src = logoUrl
    } catch (error) {
      setIsFetchingLogo(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentProject?.id) return

    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setIsSubmitting(true)
    try {
      await createAffiliate(currentProject.id, formData)
      toast.success('Affiliate created')
      setOpen(false)
      setFormData({
        name: '',
        website_url: '',
        logo_url: '',
        notes: '',
        status: 'active',
      })
    } catch (error) {
      toast.error('Failed to create affiliate')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            Add Affiliate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Affiliate</DialogTitle>
          <DialogDescription>
            Add a new affiliate partner to track referrals and conversions.
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
                onBlur={handleWebsiteBlur}
                className="pl-9"
              />
              {isFetchingLogo && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Logo will be automatically fetched from the website
            </p>
          </div>

          {formData.logo_url && (
            <div className="space-y-2">
              <Label>Logo Preview</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                  <img 
                    src={formData.logo_url} 
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

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
                  Creating...
                </>
              ) : (
                'Create Affiliate'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
