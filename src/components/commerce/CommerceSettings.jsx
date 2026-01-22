/**
 * CommerceSettings - Payment processor configuration (Square/Stripe OAuth) + Tax settings
 */
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Loader2, AlertCircle, CreditCard, Zap, Percent, Save } from 'lucide-react'
import { portalApi } from '@/lib/portal-api'
import SquareSetupDialog from './SquareSetupDialog'
import StripeSetupDialog from './StripeSetupDialog'
import { toast } from 'sonner'

export default function CommerceSettings({ projectId, open, onOpenChange }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [squareDialogOpen, setSquareDialogOpen] = useState(false)
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(null) // 'square' | 'stripe'
  
  // Tax settings state
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxRate, setTaxRate] = useState('')
  const [taxName, setTaxName] = useState('Sales Tax')
  const [savingTax, setSavingTax] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadSettings()
    }
  }, [projectId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/commerce/settings/${projectId}`)
      setSettings(response.data)
      // Load tax settings
      setTaxEnabled(response.data?.tax_enabled || false)
      setTaxRate(response.data?.tax_rate?.toString() || '')
      setTaxName(response.data?.tax_name || 'Sales Tax')
    } catch (error) {
      console.error('Failed to load commerce settings:', error)
      toast.error('Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (processor) => {
    if (!confirm(`Are you sure you want to disconnect ${processor}?`)) return

    try {
      setDisconnecting(processor)
      await portalApi.get(`/commerce/oauth/${processor}/disconnect/${projectId}`)
      toast.success(`${processor} disconnected successfully`)
      await loadSettings()
    } catch (error) {
      console.error(`Failed to disconnect ${processor}:`, error)
      toast.error(`Failed to disconnect ${processor}`)
    } finally {
      setDisconnecting(null)
    }
  }

  const handleSaveTaxSettings = async () => {
    try {
      setSavingTax(true)
      await portalApi.put(`/commerce/settings/${projectId}`, {
        tax_enabled: taxEnabled,
        tax_rate: taxRate ? parseFloat(taxRate) : null,
        tax_name: taxName || 'Sales Tax',
      })
      toast.success('Tax settings saved')
    } catch (error) {
      console.error('Failed to save tax settings:', error)
      toast.error('Failed to save tax settings')
    } finally {
      setSavingTax(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Processor Settings</DialogTitle>
          <DialogDescription>
            Connect Square or Stripe to process payments for your Commerce offerings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Square Connection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#3E4348] rounded-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Square</CardTitle>
              <CardDescription>
                {settings?.square_connected ? 'Connected' : 'Not connected'}
              </CardDescription>
            </div>
          </div>
          {settings?.square_connected && (
            <Badge variant="success" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {settings?.square_connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Merchant ID</div>
                  <div className="font-mono text-xs mt-1">
                    {settings.square_merchant_id || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Location ID</div>
                  <div className="font-mono text-xs mt-1">
                    {settings.square_location_id || 'N/A'}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => handleDisconnect('square')}
                disabled={disconnecting === 'square'}
                className="w-full"
              >
                {disconnecting === 'square' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect Square'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Connect Square to accept in-person and online payments
                </AlertDescription>
              </Alert>
              <Button onClick={() => setSquareDialogOpen(true)} className="w-full">
                Connect Square
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Connection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#635BFF] rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Stripe</CardTitle>
              <CardDescription>
                {settings?.stripe_connected ? 'Connected' : 'Not connected'}
              </CardDescription>
            </div>
          </div>
          {settings?.stripe_connected && (
            <Badge variant="success" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {settings?.stripe_connected ? (
            <div className="space-y-4">
              <div className="text-sm">
                <div className="text-muted-foreground">Account ID</div>
                <div className="font-mono text-xs mt-1">
                  {settings.stripe_account_id || 'N/A'}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => handleDisconnect('stripe')}
                disabled={disconnecting === 'stripe'}
                className="w-full"
              >
                {disconnecting === 'stripe' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect Stripe'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Connect Stripe to accept payments and manage subscriptions
                </AlertDescription>
              </Alert>
              <Button onClick={() => setStripeDialogOpen(true)} className="w-full">
                Connect Stripe
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OAuth Dialogs */}
      <SquareSetupDialog
        open={squareDialogOpen}
        onOpenChange={setSquareDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          setSquareDialogOpen(false)
          loadSettings()
        }}
      />
      
      <StripeSetupDialog
        open={stripeDialogOpen}
        onOpenChange={setStripeDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          setStripeDialogOpen(false)
          loadSettings()
        }}
      />

      {/* Tax Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Percent className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Tax Settings</CardTitle>
              <CardDescription>
                Configure sales tax for your transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="tax-enabled">Enable Tax</Label>
              <p className="text-xs text-muted-foreground">Add tax to sales</p>
            </div>
            <Switch
              id="tax-enabled"
              checked={taxEnabled}
              onCheckedChange={setTaxEnabled}
            />
          </div>
          
          {taxEnabled && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-name">Tax Name</Label>
                  <Input
                    id="tax-name"
                    value={taxName}
                    onChange={(e) => setTaxName(e.target.value)}
                    placeholder="Sales Tax"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="8.25"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This tax rate will be applied to all sales unless overridden at checkout.
              </p>
            </div>
          )}
          
          <Button
            onClick={handleSaveTaxSettings}
            disabled={savingTax}
            className="w-full"
          >
            {savingTax ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Tax Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
