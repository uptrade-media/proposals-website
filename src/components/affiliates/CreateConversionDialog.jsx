// src/components/affiliates/CreateConversionDialog.jsx
// Dialog to manually record a conversion

import { useState, useEffect } from 'react'
import { Plus, DollarSign, Loader2 } from 'lucide-react'
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

export default function CreateConversionDialog({ affiliateId, children }) {
  const { currentProject } = useAuthStore()
  const { offers, createConversion, fetchOffers } = useAffiliatesStore()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const affiliateOffers = offers.filter(o => o.affiliate_id === affiliateId)

  const [formData, setFormData] = useState({
    offer_id: '',
    conversion_value: '',
    payout_amount: '',
    notes: '',
    conversion_date: new Date().toISOString().split('T')[0],
  })

  // Fetch offers when dialog opens
  useEffect(() => {
    if (open && currentProject?.id && affiliateId) {
      fetchOffers(currentProject.id, affiliateId)
    }
  }, [open, currentProject?.id, affiliateId, fetchOffers])

  // Auto-fill payout when offer is selected
  useEffect(() => {
    if (formData.offer_id) {
      const selectedOffer = affiliateOffers.find(o => o.id === formData.offer_id)
      if (selectedOffer?.payout_amount) {
        setFormData(prev => ({ 
          ...prev, 
          payout_amount: selectedOffer.payout_amount.toString() 
        }))
      }
    }
  }, [formData.offer_id, affiliateOffers])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentProject?.id || !affiliateId) return

    setIsSubmitting(true)
    try {
      await createConversion(currentProject.id, {
        affiliate_id: affiliateId,
        offer_id: formData.offer_id || null,
        conversion_value: formData.conversion_value ? parseFloat(formData.conversion_value) : null,
        payout_amount: formData.payout_amount ? parseFloat(formData.payout_amount) : null,
        notes: formData.notes || null,
        conversion_date: formData.conversion_date,
        status: 'approved',
      })
      toast.success('Conversion recorded')
      setOpen(false)
      setFormData({
        offer_id: '',
        conversion_value: '',
        payout_amount: '',
        notes: '',
        conversion_date: new Date().toISOString().split('T')[0],
      })
    } catch (error) {
      toast.error('Failed to record conversion')
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
            Add Conversion
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Record Conversion</DialogTitle>
          <DialogDescription>
            Manually record a conversion for this affiliate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conversion_date">Conversion Date</Label>
            <Input
              id="conversion_date"
              name="conversion_date"
              type="date"
              value={formData.conversion_date}
              onChange={handleChange}
            />
          </div>

          {affiliateOffers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="offer_id">Offer (Optional)</Label>
              <Select
                value={formData.offer_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, offer_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an offer" />
                </SelectTrigger>
                <SelectContent>
                  {affiliateOffers.map(offer => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="conversion_value">Sale Value</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="conversion_value"
                  name="conversion_value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.conversion_value}
                  onChange={handleChange}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout_amount">Payout Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="payout_amount"
                  name="payout_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.payout_amount}
                  onChange={handleChange}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional details..."
              value={formData.notes}
              onChange={handleChange}
              rows={2}
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
                  Recording...
                </>
              ) : (
                'Record Conversion'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
