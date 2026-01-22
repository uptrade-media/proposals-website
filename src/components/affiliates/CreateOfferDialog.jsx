// src/components/affiliates/CreateOfferDialog.jsx
// Dialog to create a new offer for an affiliate

import { useState } from 'react'
import { Plus, Link2, Loader2 } from 'lucide-react'
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

export default function CreateOfferDialog({ affiliateId, children }) {
  const { currentProject } = useAuthStore()
  const { createOffer } = useAffiliatesStore()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    destination_url: '',
    description: '',
    payout_type: 'flat',
    payout_amount: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentProject?.id || !affiliateId) return

    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!formData.destination_url.trim()) {
      toast.error('Destination URL is required')
      return
    }

    setIsSubmitting(true)
    try {
      await createOffer(currentProject.id, {
        ...formData,
        affiliate_id: affiliateId,
        payout_amount: formData.payout_amount ? parseFloat(formData.payout_amount) : null,
      })
      toast.success('Offer created')
      setOpen(false)
      setFormData({
        name: '',
        destination_url: '',
        description: '',
        payout_type: 'flat',
        payout_amount: '',
      })
    } catch (error) {
      toast.error('Failed to create offer')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Offer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Offer</DialogTitle>
          <DialogDescription>
            Create a trackable offer with a unique link for this affiliate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Offer Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Homepage Link, Newsletter Promo"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination_url">Destination URL *</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="destination_url"
                name="destination_url"
                placeholder="https://your-site.com/landing-page"
                value={formData.destination_url}
                onChange={handleChange}
                className="pl-9"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Where visitors will be redirected when they click the tracking link
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What is this offer for?"
              value={formData.description}
              onChange={handleChange}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payout_type">Payout Type</Label>
              <Select
                value={formData.payout_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payout_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Rate</SelectItem>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.payout_type !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="payout_amount">
                  {formData.payout_type === 'percent' ? 'Percentage' : 'Amount'}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">
                    {formData.payout_type === 'percent' ? '%' : '$'}
                  </span>
                  <Input
                    id="payout_amount"
                    name="payout_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.payout_amount}
                    onChange={handleChange}
                    className="pl-8"
                  />
                </div>
              </div>
            )}
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
                'Create Offer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
