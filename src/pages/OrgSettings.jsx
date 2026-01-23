/**
 * OrgSettings - Organization Settings Page
 * 
 * Unified settings page for org-level users (non-agency) including:
 * - Signal Usage & Billing (current bill, usage breakdown, projected costs)
 * - Payment Methods (saved cards, auto-pay setup)
 * - Members (invite users, manage roles)
 * - General Settings (org profile, preferences)
 * 
 * This replaces the need for a separate Team module for client orgs.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Zap, 
  CreditCard, 
  Users, 
  Building2, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import SignalUsageBillingCard from '@/components/billing/SignalUsageBillingCard'
import OrganizationUsersPanel from '@/components/team/panels/OrganizationUsersPanel'
import useAuthStore from '@/lib/auth-store'
import { supabase } from '@/lib/supabase-auth'
import { toast } from 'sonner'

export default function OrgSettings() {
  const navigate = useNavigate()
  const { user, currentOrg, accessLevel, isSuperAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState('billing')
  const [orgDetails, setOrgDetails] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [isLoadingPayment, setIsLoadingPayment] = useState(true)
  const [isLoadingOrg, setIsLoadingOrg] = useState(true)

  // Access control
  const hasOrgLevelAccess = isSuperAdmin || accessLevel === 'organization'
  const canManageMembers = hasOrgLevelAccess

  useEffect(() => {
    if (currentOrg?.id) {
      fetchOrgDetails()
      fetchPaymentMethods()
    }
  }, [currentOrg?.id])

  const fetchOrgDetails = async () => {
    try {
      setIsLoadingOrg(true)
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', currentOrg.id)
        .single()
      
      if (error) throw error
      setOrgDetails(data)
    } catch (err) {
      console.error('Failed to fetch org details:', err)
    } finally {
      setIsLoadingOrg(false)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      setIsLoadingPayment(true)
      // Payment methods would come from Stripe via Portal API
      // For now, show placeholder
      setPaymentMethods([])
    } catch (err) {
      console.error('Failed to fetch payment methods:', err)
    } finally {
      setIsLoadingPayment(false)
    }
  }

  // Redirect if not org-level user
  if (!hasOrgLevelAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              Organization settings are only available to org-level users.
            </p>
            <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <Building2 className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{currentOrg.name}</h1>
              <p className="text-[var(--text-secondary)]">Organization Settings</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="billing" className="gap-2">
              <SignalIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Signal Usage</span>
              <span className="sm:hidden">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
              <span className="sm:hidden">Team</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Org</span>
            </TabsTrigger>
          </TabsList>

          {/* Signal Usage & Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="grid gap-6">
              {/* Current usage card */}
              <SignalUsageBillingCard />
              
              {/* Usage explanation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                    About Signal Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[var(--text-secondary)]">
                    Signal AI usage is billed monthly based on your actual usage. Invoices are generated 
                    at the beginning of each month and payment is due within 14 days.
                  </p>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-lg bg-[var(--surface-secondary)]">
                      <h4 className="font-medium mb-2">Token Usage</h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        AI conversations and document processing are charged per token.
                        Rates vary by model tier used.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--surface-secondary)]">
                      <h4 className="font-medium mb-2">Request Charges</h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Some advanced AI features incur a per-request charge 
                        for specialized processing.
                      </p>
                    </div>
                  </div>

                  {orgDetails?.auto_pay_enabled && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-700">
                        Auto-pay is enabled. Your bill will be charged automatically.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>
                      Manage your payment methods for Signal billing
                    </CardDescription>
                  </div>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Card
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingPayment ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-[var(--text-tertiary)]" />
                    <h3 className="text-lg font-medium mb-2">No payment methods</h3>
                    <p className="text-[var(--text-secondary)] mb-4">
                      Add a payment method to enable automatic billing
                    </p>
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Payment Method
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div 
                        key={method.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-[var(--text-tertiary)]" />
                          <div>
                            <p className="font-medium">
                              •••• •••• •••• {method.last4}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                              Expires {method.exp_month}/{method.exp_year}
                            </p>
                          </div>
                        </div>
                        {method.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto-pay settings */}
            <Card>
              <CardHeader>
                <CardTitle>Automatic Payment</CardTitle>
                <CardDescription>
                  Enable automatic payment for Signal invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-pay enabled</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Automatically charge your default payment method when invoices are due
                    </p>
                  </div>
                  <Button variant={orgDetails?.auto_pay_enabled ? 'outline' : 'default'}>
                    {orgDetails?.auto_pay_enabled ? 'Disable' : 'Enable Auto-Pay'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <OrganizationUsersPanel 
              organizationId={currentOrg.id}
              organizationName={currentOrg.name}
              canManage={canManageMembers}
            />
          </TabsContent>

          {/* General Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Profile</CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingOrg ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Organization Name</Label>
                        <Input 
                          value={orgDetails?.name || ''} 
                          disabled
                          className="bg-[var(--surface-secondary)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Domain</Label>
                        <Input 
                          value={orgDetails?.domain || ''} 
                          disabled
                          className="bg-[var(--surface-secondary)]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Organization ID</Label>
                      <Input 
                        value={currentOrg.id} 
                        disabled
                        className="bg-[var(--surface-secondary)] font-mono text-sm"
                      />
                    </div>

                    {orgDetails?.website && (
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            value={orgDetails.website} 
                            disabled
                            className="bg-[var(--surface-secondary)]"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => window.open(orgDetails.website, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-[var(--border-primary)]">
                      <p className="text-sm text-[var(--text-secondary)]">
                        To update organization settings, please contact your account manager.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
