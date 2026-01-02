// Tenants.jsx - Admin UI for managing organizations/tenants
import { useState, useEffect } from 'react'
import { 
  Building2, 
  Plus, 
  Search, 
  Settings, 
  Code, 
  Users, 
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useAuthStore from '@/lib/auth-store'
import { getSession } from '@/lib/supabase-auth'
import axios from 'axios'
import { toast } from 'sonner'

// Available features
const AVAILABLE_FEATURES = [
  { key: 'analytics', label: 'Website Analytics', description: 'Track visitors, sessions, page views' },
  { key: 'blog', label: 'Blog Manager', description: 'Create and manage blog posts' },
  { key: 'crm', label: 'Lead Management', description: 'Track leads and manage pipeline' },
  { key: 'projects', label: 'Projects', description: 'Manage client projects' },
  { key: 'proposals', label: 'Proposals', description: 'Create and send proposals' },
  { key: 'billing', label: 'Invoices & Payments', description: 'Manage invoices and accept payments' },
  { key: 'ecommerce', label: 'E-commerce', description: 'Products, orders, inventory' },
  { key: 'files', label: 'File Manager', description: 'Upload and share files' },
  { key: 'messages', label: 'Messages', description: 'Internal messaging' },
  { key: 'email_manager', label: 'Outreach', description: 'Email and SMS campaign management' },
  { key: 'seo', label: 'SEO Manager', description: 'Search engine optimization tools' },
]

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

const Tenants = () => {
  const { isSuperAdmin } = useAuthStore()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [trackingScript, setTrackingScript] = useState('')
  const [copied, setCopied] = useState(false)
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    plan: 'free',
    features: {
      analytics: false,
      blog: false,
      crm: false,
      projects: false,
      proposals: false,
      billing: false,
      ecommerce: false,
      files: true,
      messages: true,
      email_manager: false,
      seo: false
    },
    adminEmail: '',
    adminName: '',
    theme: {
      primaryColor: '#4bbf39'
    }
  })
  const [saving, setSaving] = useState(false)

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await getSession()
      const response = await axios.get('/.netlify/functions/admin-tenants-list', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setOrganizations(response.data.organizations || [])
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrgDetails = async (orgId) => {
    try {
      const { data: { session } } = await getSession()
      const response = await axios.get(`/.netlify/functions/admin-tenants-get?id=${orgId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setSelectedOrg(response.data.organization)
      setTrackingScript(response.data.trackingScript)
      setFormData({
        ...response.data.organization,
        adminEmail: '',
        adminName: ''
      })
      setShowDetailsDialog(true)
    } catch (error) {
      console.error('Failed to fetch organization details:', error)
      toast.error('Failed to load organization details')
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required')
      return
    }

    setSaving(true)
    try {
      const { data: { session } } = await getSession()
      const response = await axios.post('/.netlify/functions/admin-tenants-create', formData, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      
      toast.success(`Organization "${formData.name}" created successfully`)
      setTrackingScript(response.data.trackingScript)
      setShowCreateDialog(false)
      fetchOrganizations()
      
      // Show the new org details
      setSelectedOrg(response.data.organization)
      setShowDetailsDialog(true)
    } catch (error) {
      console.error('Failed to create organization:', error)
      toast.error(error.response?.data?.error || 'Failed to create organization')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedOrg?.id) return

    setSaving(true)
    try {
      const { data: { session } } = await getSession()
      await axios.put('/.netlify/functions/admin-tenants-update', {
        id: selectedOrg.id,
        name: formData.name,
        domain: formData.domain,
        plan: formData.plan,
        features: formData.features,
        theme: formData.theme,
        status: formData.status
      }, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      
      toast.success('Organization updated successfully')
      setShowDetailsDialog(false)
      fetchOrganizations()
    } catch (error) {
      console.error('Failed to update organization:', error)
      toast.error(error.response?.data?.error || 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  const copyTrackingScript = () => {
    navigator.clipboard.writeText(trackingScript)
    setCopied(true)
    toast.success('Tracking script copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      domain: '',
      plan: 'free',
      features: {
        analytics: false,
        blog: false,
        crm: false,
        projects: false,
        proposals: false,
        billing: false,
        ecommerce: false,
        files: true,
        messages: true,
        email_manager: false,
        seo: false
      },
      adminEmail: '',
      adminName: '',
      theme: {
        primaryColor: '#4bbf39'
      }
    })
  }

  // Filter organizations
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = !searchQuery || 
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.domain?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Check if user is super admin
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Building2 className="h-16 w-16 text-[var(--text-tertiary)] mb-4" />
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Access Denied</h2>
        <p className="text-[var(--text-secondary)]">
          You need super admin privileges to manage tenants.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tenant Management</h1>
          <p className="text-[var(--text-secondary)]">
            Manage organizations and their portal access
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          New Tenant
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search by name, slug, or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Building2 className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
          <p className="text-[var(--text-secondary)]">
            {searchQuery ? 'No organizations match your search' : 'No organizations yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrgs.map((org) => (
            <Card 
              key={org.id} 
              className="cursor-pointer hover:border-[var(--accent-primary)] transition-colors"
              onClick={() => fetchOrgDetails(org.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: org.theme?.primaryColor || '#4bbf39' }}
                    >
                      {org.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <CardDescription>{org.domain || org.slug}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--text-tertiary)]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={org.status === 'active' ? 'default' : 'destructive'}
                      className="capitalize"
                    >
                      {org.status}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {org.plan}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                    <Users className="h-4 w-4" />
                    <span>{org.userCount || 0}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(org.features || {})
                    .filter(([_, enabled]) => enabled)
                    .slice(0, 4)
                    .map(([key]) => (
                      <Badge key={key} variant="secondary" className="text-[10px]">
                        {key.replace('_', ' ')}
                      </Badge>
                    ))
                  }
                  {Object.values(org.features || {}).filter(Boolean).length > 4 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{Object.values(org.features || {}).filter(Boolean).length - 4} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Set up a new organization with their portal access and features.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  placeholder="Acme Corp"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  placeholder="acme-corp"
                  value={formData.slug}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') 
                  })}
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  Used for database schema: org_{formData.slug.replace(/-/g, '_') || 'slug'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="domain">Website Domain</Label>
                <Input
                  id="domain"
                  placeholder="acmecorp.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Select 
                  value={formData.plan} 
                  onValueChange={(value) => setFormData({ ...formData, plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Admin User */}
            <div className="space-y-2">
              <Label>Initial Admin User (optional)</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="admin@acmecorp.com"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                />
                <Input
                  placeholder="Admin Name"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <Label>Enabled Features</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {AVAILABLE_FEATURES.map(feature => (
                  <div 
                    key={feature.key}
                    className="flex items-center justify-between p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-secondary)]"
                  >
                    <div>
                      <p className="font-medium text-sm">{feature.label}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{feature.description}</p>
                    </div>
                    <Switch
                      checked={formData.features[feature.key]}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        features: { ...formData.features, [feature.key]: checked }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-3">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.theme.primaryColor}
                  onChange={(e) => setFormData({
                    ...formData,
                    theme: { ...formData.theme, primaryColor: e.target.value }
                  })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.theme.primaryColor}
                  onChange={(e) => setFormData({
                    ...formData,
                    theme: { ...formData.theme, primaryColor: e.target.value }
                  })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: selectedOrg?.theme?.primaryColor || '#4bbf39' }}
              >
                {selectedOrg?.name?.charAt(0) || '?'}
              </div>
              <div>
                <DialogTitle>{selectedOrg?.name}</DialogTitle>
                <DialogDescription>{selectedOrg?.domain || selectedOrg?.slug}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="settings" className="mt-4">
            <TabsList>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="features">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Features
              </TabsTrigger>
              <TabsTrigger value="tracking">
                <Code className="h-4 w-4 mr-2" />
                Tracking Script
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Input
                    value={formData.domain || ''}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select 
                    value={formData.plan} 
                    onValueChange={(value) => setFormData({ ...formData, plan: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-3">
                  <Input
                    type="color"
                    value={formData.theme?.primaryColor || '#4bbf39'}
                    onChange={(e) => setFormData({
                      ...formData,
                      theme: { ...formData.theme, primaryColor: e.target.value }
                    })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.theme?.primaryColor || '#4bbf39'}
                    onChange={(e) => setFormData({
                      ...formData,
                      theme: { ...formData.theme, primaryColor: e.target.value }
                    })}
                    className="flex-1"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 mt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {AVAILABLE_FEATURES.map(feature => (
                  <div 
                    key={feature.key}
                    className="flex items-center justify-between p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-secondary)]"
                  >
                    <div>
                      <p className="font-medium text-sm">{feature.label}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{feature.description}</p>
                    </div>
                    <Switch
                      checked={formData.features?.[feature.key] || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        features: { ...formData.features, [feature.key]: checked }
                      })}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tracking Script</Label>
                  <Button variant="outline" size="sm" onClick={copyTrackingScript}>
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <Textarea
                  value={trackingScript}
                  readOnly
                  rows={10}
                  className="font-mono text-xs"
                />
                <p className="text-sm text-[var(--text-secondary)]">
                  Add this script to the client's website to enable analytics tracking.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Tenants
