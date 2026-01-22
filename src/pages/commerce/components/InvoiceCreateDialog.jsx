// src/pages/commerce/components/InvoiceCreateDialog.jsx
// Dialog for creating invoices with service selection

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Send, Loader2, Zap, Receipt, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

// Default due date: 14 days from now
function getDefaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().split('T')[0]
}

export function InvoiceCreateDialog({ 
  open, 
  onOpenChange, 
  brandColors,
  onSuccess 
}) {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id

  // Services from Commerce offerings
  const [services, setServices] = useState([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  // Invoice data
  const [formData, setFormData] = useState({
    selectedServiceId: '',
    email: '',
    name: '',
    company: '',
    amount: '',
    description: '',
    due_date: getDefaultDueDate(),
    send_now: true,
    payment_type: 'full', // 'full' or 'deposit'
    deposit_percentage: 50,
    deposit_amount: '',
  })

  // Load services when dialog opens
  useEffect(() => {
    if (open && projectId) {
      loadServices()
    }
  }, [open, projectId])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        selectedServiceId: '',
        email: '',
        name: '',
        company: '',
        amount: '',
        description: '',
        due_date: getDefaultDueDate(),
        send_now: true,
        payment_type: 'full',
        deposit_percentage: 50,
        deposit_amount: '',
      })
      setError(null)
      setSuccess(false)
    }
  }, [open])

  const loadServices = async () => {
    setIsLoadingServices(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('commerce_offerings')
        .select('id, name, description, price_type, price, status')
        .eq('project_id', projectId)
        .eq('type', 'service')
        .eq('status', 'active')
        .order('name', { ascending: true })
      
      if (fetchError) throw fetchError
      setServices(data || [])
    } catch (err) {
      console.error('Error loading services:', err)
    } finally {
      setIsLoadingServices(false)
    }
  }

  // When a service is selected, auto-populate fields
  const handleServiceSelect = (serviceId) => {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      const price = service.price || 0
      setFormData(prev => ({
        ...prev,
        selectedServiceId: serviceId,
        amount: price.toString(),
        description: service.name + (service.description ? ` - ${service.description}` : ''),
        deposit_amount: (price * 0.5).toFixed(2), // 50% default deposit
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        selectedServiceId: '',
      }))
    }
  }

  // Update deposit amount when percentage changes
  const handleDepositPercentageChange = (percentage) => {
    const amount = parseFloat(formData.amount) || 0
    setFormData(prev => ({
      ...prev,
      deposit_percentage: percentage,
      deposit_amount: ((amount * percentage) / 100).toFixed(2),
    }))
  }

  // Calculate final invoice amount based on payment type
  const getFinalAmount = () => {
    const baseAmount = parseFloat(formData.amount) || 0
    if (formData.payment_type === 'deposit') {
      return parseFloat(formData.deposit_amount) || (baseAmount * 0.5)
    }
    return baseAmount
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const finalAmount = getFinalAmount()
      
      // Create invoice via API or directly
      const { data: invoice, error: createError } = await supabase
        .from('invoices')
        .insert({
          project_id: projectId,
          amount: finalAmount,
          description: formData.description + (formData.payment_type === 'deposit' ? ` (Deposit - ${formData.deposit_percentage}%)` : ''),
          due_at: formData.due_date,
          status: formData.send_now ? 'pending' : 'draft',
          sent_to_email: formData.email.toLowerCase(),
          sent_at: formData.send_now ? new Date().toISOString() : null,
          // Link to service offering if selected
          metadata: formData.selectedServiceId ? {
            offering_id: formData.selectedServiceId,
            payment_type: formData.payment_type,
            total_amount: parseFloat(formData.amount),
            deposit_percentage: formData.payment_type === 'deposit' ? formData.deposit_percentage : null,
          } : {},
        })
        .select()
        .single()

      if (createError) throw createError

      setSuccess(true)
      
      // Call success callback after brief delay to show success message
      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      console.error('Error creating invoice:', err)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Create Invoice
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Send an invoice for a service or custom amount
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Send className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Invoice Created!</h3>
            <p className="text-[var(--text-secondary)]">
              {formData.send_now ? 'Email sent with payment link.' : 'Invoice saved as draft.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service Selection */}
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)]">Select a Service (Optional)</Label>
              <Select 
                value={formData.selectedServiceId} 
                onValueChange={handleServiceSelect}
                disabled={isLoadingServices}
              >
                <SelectTrigger className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]">
                  <SelectValue placeholder={isLoadingServices ? "Loading services..." : "Choose a service to invoice for..."} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <SelectItem value="" className="text-[var(--text-secondary)]">
                    Custom Invoice (no service)
                  </SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-[var(--text-tertiary)]" />
                        <span className="text-[var(--text-primary)]">{service.name}</span>
                        {service.price_type === 'fixed' && service.price && (
                          <span className="text-[var(--text-secondary)]">
                            ${Number(service.price).toLocaleString()}
                          </span>
                        )}
                        {service.price_type === 'quote' && (
                          <span className="text-[var(--text-tertiary)] text-xs">Quote</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--text-primary)]">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@example.com"
                required
                className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
              />
            </div>

            {/* Customer Name & Company */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[var(--text-primary)]">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-[var(--text-primary)]">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Acme Inc"
                  className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Amount & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[var(--text-primary)]">Total Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    const amount = e.target.value
                    setFormData(prev => ({ 
                      ...prev, 
                      amount,
                      deposit_amount: ((parseFloat(amount) || 0) * prev.deposit_percentage / 100).toFixed(2)
                    }))
                  }}
                  placeholder="0.00"
                  required
                  className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-[var(--text-primary)]">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                  className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Payment Type (Deposit / Full) */}
            {parseFloat(formData.amount) > 0 && (
              <div className="space-y-3 p-4 rounded-lg bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]">
                <Label className="text-[var(--text-primary)]">Payment Type</Label>
                <RadioGroup
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_type: value }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="cursor-pointer text-[var(--text-primary)]">
                      Pay in Full (${parseFloat(formData.amount).toLocaleString()})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="deposit" id="deposit" />
                    <Label htmlFor="deposit" className="cursor-pointer text-[var(--text-primary)]">
                      Deposit
                    </Label>
                  </div>
                </RadioGroup>

                {formData.payment_type === 'deposit' && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-[var(--text-secondary)]">Deposit %</Label>
                      <Select 
                        value={formData.deposit_percentage.toString()} 
                        onValueChange={(v) => handleDepositPercentageChange(parseInt(v))}
                      >
                        <SelectTrigger className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                          <SelectItem value="25">25%</SelectItem>
                          <SelectItem value="50">50%</SelectItem>
                          <SelectItem value="75">75%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-[var(--text-secondary)]">Deposit Amount</Label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <DollarSign className="h-4 w-4 text-[var(--text-tertiary)]" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {parseFloat(formData.deposit_amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[var(--text-primary)]">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Services rendered..."
                rows={3}
                className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
              />
            </div>

            {/* Send Now */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="send_now" 
                checked={formData.send_now}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_now: checked }))}
              />
              <Label htmlFor="send_now" className="cursor-pointer text-[var(--text-primary)]">
                Send email immediately with payment link
              </Label>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="border-[var(--glass-border)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.email || !formData.amount || !formData.due_date}
                style={{ backgroundColor: brandColors?.primary || '#3b82f6' }}
                className="text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {formData.send_now ? 'Create & Send' : 'Create Invoice'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
