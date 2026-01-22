/**
 * Reputation Campaigns
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Review request campaign management:
 * - Create/edit campaigns
 * - Campaign performance stats
 * - Review request history
 */

import { useEffect, useState } from 'react'
import { 
  Plus, Play, Pause, Trash2, Edit, TrendingUp, 
  Mail, MessageSquare, MoreVertical, ChevronRight 
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useReputationStore } from '@/lib/reputation-store'
import { useToast } from '@/hooks/use-toast'

const defaultMessageTemplate = `Hi {{name}},

Thank you for choosing us! We'd love to hear about your experience.

If you have a moment, please leave us a review:
{{review_link}}

Your feedback helps us improve and helps others find us. Thank you!`

// Campaign Card
function CampaignCard({ campaign, onEdit, onActivate, onPause, onDelete }) {
  const conversionRate = campaign.totalSent > 0 
    ? ((campaign.totalReviews / campaign.totalSent) * 100).toFixed(1)
    : 0

  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      default:
        return <Badge variant="outline">{campaign.status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            {campaign.description && (
              <CardDescription className="mt-1">{campaign.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {campaign.status === 'active' ? (
                  <DropdownMenuItem onClick={onPause}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onActivate}>
                    <Play className="w-4 h-4 mr-2" />
                    Activate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{campaign.totalSent || 0}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{campaign.totalReviews || 0}</div>
            <div className="text-xs text-muted-foreground">Reviews</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <div className="text-xs text-muted-foreground">Conversion</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{campaign.sendDelayHours || 24}h</div>
            <div className="text-xs text-muted-foreground">Delay</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {campaign.targetPlatform || 'google'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {campaign.emailEnabled && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </span>
            )}
            {campaign.smsEnabled && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> SMS
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Campaign Form Dialog
function CampaignFormDialog({ campaign, open, onOpenChange, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaignType: 'general',
    targetPlatform: 'google',
    sendDelayHours: 24,
    messageTemplate: defaultMessageTemplate,
    emailEnabled: true,
    smsEnabled: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        campaignType: campaign.campaignType || 'general',
        targetPlatform: campaign.targetPlatform || 'google',
        sendDelayHours: campaign.sendDelayHours || 24,
        messageTemplate: campaign.messageTemplate || defaultMessageTemplate,
        emailEnabled: campaign.emailEnabled ?? true,
        smsEnabled: campaign.smsEnabled || false,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        campaignType: 'general',
        targetPlatform: 'google',
        sendDelayHours: 24,
        messageTemplate: defaultMessageTemplate,
        emailEnabled: true,
        smsEnabled: false,
      })
    }
  }, [campaign, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{campaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
            <DialogDescription>
              Set up automated review requests for your customers
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Post-Service Follow-up"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this campaign"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Campaign Type</Label>
                <Select
                  value={formData.campaignType}
                  onValueChange={(v) => setFormData({ ...formData, campaignType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="post_service">Post-Service</SelectItem>
                    <SelectItem value="post_sale">Post-Sale</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Target Platform</Label>
                <Select
                  value={formData.targetPlatform}
                  onValueChange={(v) => setFormData({ ...formData, targetPlatform: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="yelp">Yelp</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="trustpilot">Trustpilot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Send Delay (hours after trigger)</Label>
              <Select
                value={formData.sendDelayHours.toString()}
                onValueChange={(v) => setFormData({ ...formData, sendDelayHours: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours (3 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template">Message Template</Label>
              <Textarea
                id="template"
                value={formData.messageTemplate}
                onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {'{{name}}'}, {'{{review_link}}'}, {'{{business_name}}'}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="email"
                  checked={formData.emailEnabled}
                  onCheckedChange={(v) => setFormData({ ...formData, emailEnabled: v })}
                />
                <Label htmlFor="email">Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="sms"
                  checked={formData.smsEnabled}
                  onCheckedChange={(v) => setFormData({ ...formData, smsEnabled: v })}
                />
                <Label htmlFor="sms">SMS</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Campaigns() {
  const [showForm, setShowForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)

  const {
    campaigns,
    campaignsLoading,
    requests,
    requestsLoading,
    fetchCampaigns,
    fetchRequests,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    activateCampaign,
    pauseCampaign,
  } = useReputationStore()
  const { toast } = useToast()

  useEffect(() => {
    fetchCampaigns()
    fetchRequests()
  }, [])

  const handleSave = async (data) => {
    try {
      if (editingCampaign) {
        await updateCampaign(editingCampaign.id, data)
        toast({ title: 'Campaign updated' })
      } else {
        await createCampaign(data)
        toast({ title: 'Campaign created' })
      }
      setEditingCampaign(null)
    } catch (error) {
      toast({ title: 'Failed to save campaign', description: error.message, variant: 'destructive' })
      throw error
    }
  }

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign)
    setShowForm(true)
  }

  const handleDelete = async (campaignId) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    try {
      await deleteCampaign(campaignId)
      toast({ title: 'Campaign deleted' })
    } catch (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' })
    }
  }

  const handleActivate = async (campaignId) => {
    try {
      await activateCampaign(campaignId)
      toast({ title: 'Campaign activated' })
    } catch (error) {
      toast({ title: 'Failed to activate', description: error.message, variant: 'destructive' })
    }
  }

  const handlePause = async (campaignId) => {
    try {
      await pauseCampaign(campaignId)
      toast({ title: 'Campaign paused' })
    } catch (error) {
      toast({ title: 'Failed to pause', description: error.message, variant: 'destructive' })
    }
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const totalSent = campaigns.reduce((sum, c) => sum + (c.totalSent || 0), 0)
  const totalReviews = campaigns.reduce((sum, c) => sum + (c.totalReviews || 0), 0)

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Campaigns</h1>
          <p className="text-muted-foreground">Automate review requests to grow your reputation</p>
        </div>
        <Button onClick={() => { setEditingCampaign(null); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCampaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Requests Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Reviews Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalSent > 0 ? ((totalReviews / totalSent) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Grid */}
      {campaignsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={() => handleEdit(campaign)}
              onActivate={() => handleActivate(campaign.id)}
              onPause={() => handlePause(campaign.id)}
              onDelete={() => handleDelete(campaign.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No campaigns yet</p>
              <p className="text-sm mb-4">Create your first campaign to start collecting more reviews</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>Latest review requests sent</CardDescription>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-2">
              {requests.slice(0, 10).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <span className="font-medium">{request.recipientName || 'Unknown'}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      via {request.channel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{request.targetPlatform}</Badge>
                    {request.reviewReceived ? (
                      <Badge className="bg-green-100 text-green-800">Review Received</Badge>
                    ) : (
                      <Badge variant="secondary">{request.status}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">No requests sent yet</p>
          )}
        </CardContent>
      </Card>

      {/* Campaign Form Dialog */}
      <CampaignFormDialog
        campaign={editingCampaign}
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) setEditingCampaign(null)
        }}
        onSave={handleSave}
      />
    </div>
  )
}
