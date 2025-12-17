import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ProposalTemplate from './ProposalTemplate'
import ProposalViewWithAnalytics from './ProposalViewWithAnalytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { EmptyState } from './EmptyState'
import { ConfirmDialog } from './ConfirmDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Eye,
  Edit,
  Loader2,
  Send,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart2,
  MousePointer,
  Timer,
  TrendingUp,
  Activity
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'
import ProposalAIDialog from './ProposalAIDialog'
import EditProposalDialog from './EditProposalDialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'

// Proposal Row component for consistent display (Admin view) with expandable analytics
function ProposalRow({ proposal, onView, onEdit, onDelete, showSignedDate = false }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'signed':
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Signed</Badge>
      case 'sent':
        return <Badge variant="outline" className="border-blue-200 text-blue-600">Sent</Badge>
      case 'viewed':
        return <Badge variant="outline" className="border-purple-200 text-purple-600">Viewed</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'declined':
        return <Badge variant="outline" className="border-red-200 text-red-600">Declined</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const fetchAnalytics = async () => {
    if (analytics || loadingAnalytics) return
    setLoadingAnalytics(true)
    try {
      const response = await api.get(`/.netlify/functions/proposals-analytics?id=${proposal.id}`)
      setAnalytics(response.data.analytics)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const handleToggle = () => {
    if (!isExpanded && !analytics) {
      fetchAnalytics()
    }
    setIsExpanded(!isExpanded)
  }

  // Don't show analytics toggle for drafts
  const showAnalytics = proposal.status !== 'draft'

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <div className="border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm hover:bg-[var(--surface-secondary)] transition-colors overflow-hidden">
        {/* Main Row */}
        <div className="flex items-center justify-between p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-[var(--text-primary)] truncate">{proposal.title}</h4>
              {getStatusBadge(proposal.status)}
              {showAnalytics && analytics?.summary?.engagementScore > 0 && (
                <Badge variant="outline" className="border-amber-200 text-amber-600 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {analytics.summary.engagementScore}%
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-[var(--text-secondary)] truncate">
                {proposal.contact?.name || proposal.client_name || 'Unknown client'}
                {(proposal.contact?.email || proposal.client_email) && (
                  <span className="text-[var(--text-tertiary)]"> ({proposal.contact?.email || proposal.client_email})</span>
                )}
              </p>
              {proposal.totalAmount && (
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  ${proposal.totalAmount.toLocaleString()}
                </span>
              )}
            </div>
            {showSignedDate && proposal.signedAt && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Signed on {formatDate(proposal.signedAt)}
                {proposal.fullyExecutedAt && (
                  <span className="text-[var(--text-tertiary)]"> • Fully executed {formatDate(proposal.fullyExecutedAt)}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {showAnalytics && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[var(--text-secondary)]">
                  <BarChart2 className="w-3.5 h-3.5 mr-1" />
                  Analytics
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                </Button>
              </CollapsibleTrigger>
            )}
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            {!['signed', 'accepted'].includes(proposal.status) && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Expandable Analytics Panel */}
        <CollapsibleContent>
          <div className="border-t border-[var(--glass-border)] bg-[var(--surface-secondary)]/50 px-4 py-3">
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
                <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading analytics...</span>
              </div>
            ) : analytics ? (
              <div className="space-y-4">
                {/* Summary Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <MousePointer className="w-3.5 h-3.5" />
                      Total Views
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {analytics.summary?.totalViews || 0}
                    </p>
                  </div>
                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <Activity className="w-3.5 h-3.5" />
                      Unique Views
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {analytics.summary?.uniqueViews || 0}
                    </p>
                  </div>
                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <Timer className="w-3.5 h-3.5" />
                      Avg. Time
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {formatTime(analytics.summary?.avgTimeOnPage || 0)}
                    </p>
                  </div>
                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Engagement
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-semibold text-[var(--text-primary)]">
                        {analytics.summary?.engagementScore || 0}%
                      </p>
                      <Progress value={analytics.summary?.engagementScore || 0} className="flex-1 h-1.5" />
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                {analytics.recentViews && analytics.recentViews.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Recent Activity
                    </h5>
                    <div className="space-y-1.5">
                      {analytics.recentViews.slice(0, 3).map((view, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-[var(--glass-bg)] rounded-lg px-3 py-2 border border-[var(--glass-border)]">
                          <span className="text-[var(--text-secondary)]">
                            {formatDateTime(view.viewedAt)}
                          </span>
                          <span className="text-[var(--text-tertiary)]">
                            {formatTime(view.timeOnPage)} spent
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                No analytics data available yet
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Client Proposal Row - simpler view for clients
function ClientProposalRow({ proposal, onView, showSignedDate = false }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'signed':
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Signed</Badge>
      case 'sent':
        return <Badge variant="outline" className="border-blue-200 text-blue-600">Ready to Review</Badge>
      case 'viewed':
        return <Badge variant="outline" className="border-purple-200 text-purple-600">Viewed</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'declined':
        return <Badge variant="outline" className="border-red-200 text-red-600">Declined</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <div className="flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm hover:bg-[var(--surface-secondary)] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-[var(--text-primary)] truncate">{proposal.title}</h4>
          {getStatusBadge(proposal.status)}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {proposal.totalAmount && (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              ${proposal.totalAmount.toLocaleString()}
            </span>
          )}
          {proposal.createdAt && (
            <span className="text-sm text-[var(--text-secondary)]">
              Sent {formatDate(proposal.createdAt)}
            </span>
          )}
        </div>
        {showSignedDate && proposal.signedAt && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            You signed on {formatDate(proposal.signedAt)}
            {proposal.fullyExecutedAt && (
              <span className="text-[var(--text-tertiary)]"> • Contract executed {formatDate(proposal.fullyExecutedAt)}</span>
            )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button 
          variant={['sent', 'viewed'].includes(proposal.status) ? 'default' : 'outline'} 
          size="sm" 
          onClick={onView}
          className={['sent', 'viewed'].includes(proposal.status) ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]' : ''}
        >
          <Eye className="w-3 h-3 mr-1" />
          {['sent', 'viewed'].includes(proposal.status) ? 'Review & Sign' : 'View'}
        </Button>
      </div>
    </div>
  )
}

const Proposals = ({ onNavigate }) => {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  
  const hasFetchedRef = useRef(false)
  const [proposals, setProposals] = useState([])
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewingProposal, setViewingProposal] = useState(null)
  const [loadingProposalView, setLoadingProposalView] = useState(false)
  const [editingProposal, setEditingProposal] = useState(null)
  const [deleteProposalDialog, setDeleteProposalDialog] = useState({ open: false, id: null, title: '', isSigned: false })
  const [showAIProposalDialog, setShowAIProposalDialog] = useState(false)

  // Fetch data only once on mount
  useEffect(() => {
    if (hasFetchedRef.current) return
    
    console.log('[Proposals] Fetching initial data')
    hasFetchedRef.current = true
    
    fetchProposals()
    if (isAdmin) {
      fetchClients()
    }
  }, [])

  const fetchProposals = async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/.netlify/functions/proposals-list')
      setProposals(response.data.proposals || [])
    } catch (err) {
      console.error('Failed to fetch proposals:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await api.get('/.netlify/functions/admin-clients-list')
      setClients(response.data.clients || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  // View proposal - shows read-only view with analytics overlay for admins
  const handleViewProposal = async (proposal) => {
    setLoadingProposalView(true)
    try {
      const response = await api.get(`/.netlify/functions/proposals-get?id=${proposal.id}`)
      setViewingProposal(response.data.proposal)
    } catch (err) {
      console.error('Failed to fetch proposal details:', err)
      toast.error('Failed to load proposal')
    } finally {
      setLoadingProposalView(false)
    }
  }

  // Edit proposal - navigates to full editor with AI editing capabilities
  const handleEditProposal = (proposal) => {
    if (onNavigate) {
      onNavigate('proposal-editor', { proposalId: proposal.id })
    }
  }

  const handleDeleteProposal = async () => {
    if (!deleteProposalDialog.id) return
    
    try {
      // Add confirm=true for signed proposals
      const confirmParam = deleteProposalDialog.isSigned ? '&confirm=true' : ''
      await api.delete(`/.netlify/functions/proposals-delete?id=${deleteProposalDialog.id}${confirmParam}`)
      setProposals(proposals.filter(p => p.id !== deleteProposalDialog.id))
      toast.success('Proposal deleted')
    } catch (err) {
      toast.error('Failed to delete proposal')
    } finally {
      setDeleteProposalDialog({ open: false, id: null, title: '', isSigned: false })
    }
  }

  // Loading state when fetching full proposal
  if (loadingProposalView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading proposal...</p>
        </div>
      </div>
    )
  }

  // If viewing a proposal, show appropriate view based on role
  if (viewingProposal) {
    // Admin sees proposal with analytics panel
    if (isAdmin) {
      return (
        <ProposalViewWithAnalytics
          proposal={viewingProposal}
          onBack={() => setViewingProposal(null)}
          onEdit={() => {
            setViewingProposal(null)
            handleEditProposal(viewingProposal)
          }}
        />
      )
    }
    
    // Client sees proposal template (can sign)
    return (
      <ProposalTemplate
        proposal={viewingProposal}
        onBack={() => setViewingProposal(null)}
        onSigned={() => {
          fetchProposals()
          setViewingProposal(null)
        }}
      />
    )
  }

  // Client view
  if (!isAdmin) {
    const activeProposals = proposals.filter(p => !['signed', 'accepted', 'declined'].includes(p.status))
    const signedProposals = proposals.filter(p => ['signed', 'accepted'].includes(p.status))

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Proposals</h1>
          <p className="text-[var(--text-secondary)]">Review and sign proposals from Uptrade Media</p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Pending
              {activeProposals.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {activeProposals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="signed" className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Signed
              {signedProposals.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700">
                  {signedProposals.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              </div>
            ) : activeProposals.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No pending proposals"
                description="You don't have any proposals waiting for review."
              />
            ) : (
              <div className="space-y-3">
                {activeProposals.map((proposal) => (
                  <ClientProposalRow
                    key={proposal.id}
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="signed" className="space-y-4 mt-4">
            {signedProposals.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="No signed proposals"
                description="Proposals you've signed will appear here."
              />
            ) : (
              <div className="space-y-3">
                {signedProposals.map((proposal) => (
                  <ClientProposalRow
                    key={proposal.id}
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                    showSignedDate
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Admin view
  const activeProposals = proposals.filter(p => !['signed', 'accepted', 'declined'].includes(p.status))
  const signedProposals = proposals.filter(p => ['signed', 'accepted'].includes(p.status))
  const declinedProposals = proposals.filter(p => p.status === 'declined')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Proposals</h1>
          <p className="text-[var(--text-secondary)]">Create and manage client proposals</p>
        </div>
        <ProposalAIDialog 
          clients={clients}
          onNavigate={onNavigate}
          open={showAIProposalDialog}
          onOpenChange={setShowAIProposalDialog}
          onSuccess={(proposal) => {
            setProposals([proposal, ...proposals])
            toast.success(`Proposal "${proposal.title}" generated!`)
          }}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="active" className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Active
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {activeProposals.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="signed" className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Signed
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700">
                  {signedProposals.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="declined" className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Declined
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {declinedProposals.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Active Proposals */}
            <TabsContent value="active" className="space-y-2 mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : activeProposals.length === 0 ? (
                <EmptyState
                  icon={Send}
                  title="No active proposals"
                  description="Create your first proposal to send to clients."
                  actionLabel="Create Proposal"
                  onAction={() => setShowAIProposalDialog(true)}
                />
              ) : (
                activeProposals.map((proposal) => (
                  <ProposalRow 
                    key={proposal.id} 
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                    onEdit={() => handleEditProposal(proposal)}
                    onDelete={() => setDeleteProposalDialog({
                      open: true,
                      id: proposal.id,
                      title: proposal.title
                    })}
                  />
                ))
              )}
            </TabsContent>

            {/* Signed Proposals */}
            <TabsContent value="signed" className="space-y-2 mt-0">
              {signedProposals.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="No signed proposals"
                  description="Signed proposals will appear here."
                />
              ) : (
                signedProposals.map((proposal) => (
                  <ProposalRow 
                    key={proposal.id} 
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                    onEdit={() => handleEditProposal(proposal)}
                    onDelete={() => setDeleteProposalDialog({
                      open: true,
                      id: proposal.id,
                      title: proposal.title,
                      isSigned: true
                    })}
                    showSignedDate
                  />
                ))
              )}
            </TabsContent>

            {/* Declined Proposals */}
            <TabsContent value="declined" className="space-y-2 mt-0">
              {declinedProposals.length === 0 ? (
                <EmptyState
                  icon={AlertCircle}
                  title="No declined proposals"
                  description="Declined proposals will appear here."
                />
              ) : (
                declinedProposals.map((proposal) => (
                  <ProposalRow 
                    key={proposal.id} 
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                    onEdit={() => handleEditProposal(proposal)}
                    onDelete={() => setDeleteProposalDialog({
                      open: true,
                      id: proposal.id,
                      title: proposal.title
                    })}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Proposal Dialog */}
      <EditProposalDialog
        proposal={editingProposal}
        clients={clients}
        open={!!editingProposal}
        onOpenChange={(open) => !open && setEditingProposal(null)}
        onSuccess={(updatedProposal) => {
          setProposals(proposals.map(p => p.id === updatedProposal.id ? updatedProposal : p))
          setEditingProposal(null)
          toast.success('Proposal updated')
        }}
        onNavigate={onNavigate}
      />

      {/* Delete Proposal Confirmation */}
      <ConfirmDialog
        open={deleteProposalDialog.open}
        onOpenChange={(open) => !open && setDeleteProposalDialog({ open: false, id: null, title: '', isSigned: false })}
        title={deleteProposalDialog.isSigned ? "⚠️ Delete SIGNED Proposal" : "Delete Proposal"}
        description={
          deleteProposalDialog.isSigned 
            ? `WARNING: This is a legally signed contract! Deleting "${deleteProposalDialog.title}" will permanently remove all signature data, contract records, and cannot be recovered. Only proceed if this was a test proposal.`
            : `Are you sure you want to delete "${deleteProposalDialog.title}"? This action cannot be undone.`
        }
        confirmLabel={deleteProposalDialog.isSigned ? "Yes, Delete Signed Contract" : "Delete"}
        variant="destructive"
        onConfirm={handleDeleteProposal}
      />
    </div>
  )
}

export default Proposals
