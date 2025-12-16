/**
 * Forms Manager - View and manage website forms and submissions
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Globe,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  ArrowUpRight,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFormsStore } from '@/lib/forms-store'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

// Status badge component
function StatusBadge({ status }) {
  const statusConfig = {
    new: { label: 'New', variant: 'default', className: 'bg-blue-500' },
    contacted: { label: 'Contacted', variant: 'secondary', className: 'bg-yellow-500' },
    qualified: { label: 'Qualified', variant: 'secondary', className: 'bg-green-500' },
    converted: { label: 'Converted', variant: 'secondary', className: 'bg-emerald-600' },
    spam: { label: 'Spam', variant: 'destructive', className: 'bg-red-500' }
  }

  const config = statusConfig[status] || statusConfig.new

  return (
    <Badge className={cn('text-white', config.className)}>
      {config.label}
    </Badge>
  )
}

// Device icon component
function DeviceIcon({ device }) {
  switch (device) {
    case 'mobile':
      return <Smartphone className="h-4 w-4 text-muted-foreground" />
    case 'tablet':
      return <Tablet className="h-4 w-4 text-muted-foreground" />
    default:
      return <Monitor className="h-4 w-4 text-muted-foreground" />
  }
}

// Forms overview cards
function FormsOverview({ forms, onSelectForm }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {forms.map(form => (
        <Card
          key={form.id}
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => onSelectForm(form)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">{form.name}</CardTitle>
                  <CardDescription className="text-xs">{form.slug}</CardDescription>
                </div>
              </div>
              {form.new_count > 0 && (
                <Badge variant="destructive" className="h-5 text-xs">
                  {form.new_count} new
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total submissions</span>
              <span className="font-semibold">{form.submission_count || 0}</span>
            </div>
            {form.website_url && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span className="truncate">{form.website_url}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Submission detail modal
function SubmissionDetailModal({ submission, open, onOpenChange, onUpdateStatus }) {
  if (!submission) return null

  const { submission: sub, relatedSubmissions = [] } = submission

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {sub.name || sub.email}
              </DialogTitle>
              <DialogDescription>
                Submitted {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
              </DialogDescription>
            </div>
            <StatusBadge status={sub.status} />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Contact Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{sub.email}</p>
                </div>
              </div>
              {sub.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{sub.phone}</p>
                  </div>
                </div>
              )}
              {sub.company && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium">{sub.company}</p>
                  </div>
                </div>
              )}
              {sub.source_page && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Source Page</p>
                    <p className="font-medium truncate">{sub.source_page}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            {sub.message && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Message</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{sub.message}</p>
              </div>
            )}

            {/* Additional Fields */}
            {sub.fields && Object.keys(sub.fields).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Form Fields</h4>
                <div className="grid gap-2">
                  {Object.entries(sub.fields).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UTM Parameters */}
            {(sub.utm_source || sub.utm_medium || sub.utm_campaign) && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Attribution</h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  {sub.utm_source && (
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-xs text-muted-foreground">Source</p>
                      <p className="text-sm font-medium">{sub.utm_source}</p>
                    </div>
                  )}
                  {sub.utm_medium && (
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-xs text-muted-foreground">Medium</p>
                      <p className="text-sm font-medium">{sub.utm_medium}</p>
                    </div>
                  )}
                  {sub.utm_campaign && (
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-xs text-muted-foreground">Campaign</p>
                      <p className="text-sm font-medium">{sub.utm_campaign}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Device Info */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Device Information</h4>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                  <DeviceIcon device={sub.device_type} />
                  <span className="text-sm capitalize">{sub.device_type || 'Desktop'}</span>
                </div>
                {sub.browser && (
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-xs text-muted-foreground">Browser</p>
                    <p className="text-sm font-medium">{sub.browser}</p>
                  </div>
                )}
                {sub.os && (
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-xs text-muted-foreground">OS</p>
                    <p className="text-sm font-medium">{sub.os}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Related Submissions */}
            {relatedSubmissions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Other Submissions from this Contact</h4>
                <div className="space-y-2">
                  {relatedSubmissions.map(rel => (
                    <div key={rel.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{rel.form?.name || 'Unknown Form'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(rel.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Select
            value={sub.status}
            onValueChange={(value) => onUpdateStatus(sub.id, value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${sub.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
            {sub.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${sub.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main FormsManager component
export default function FormsManager() {
  const {
    forms,
    submissions,
    currentSubmission,
    pagination,
    filters,
    isLoading,
    isLoadingSubmissions,
    fetchForms,
    fetchSubmissions,
    fetchSubmission,
    updateSubmission,
    setFilters,
    setPage,
    clearCurrentSubmission
  } = useFormsStore()

  const [activeTab, setActiveTab] = useState('overview')
  const [selectedForm, setSelectedForm] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetail, setShowDetail] = useState(false)

  // Load forms on mount
  useEffect(() => {
    fetchForms({ includeGlobal: true })
  }, [fetchForms])

  // Load submissions when form is selected or filters change
  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions({
        formId: selectedForm?.id,
        search: filters.search,
        status: filters.status
      })
    }
  }, [activeTab, selectedForm, filters, fetchSubmissions])

  const handleSelectForm = (form) => {
    setSelectedForm(form)
    setActiveTab('submissions')
    setFilters({ formId: form.id })
  }

  const handleViewSubmission = async (submissionId) => {
    await fetchSubmission(submissionId)
    setShowDetail(true)
  }

  const handleUpdateStatus = async (submissionId, status) => {
    try {
      await updateSubmission(submissionId, { status })
      toast.success('Status updated')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleSearch = () => {
    setFilters({ search: searchQuery })
  }

  const handleRefresh = () => {
    if (activeTab === 'overview') {
      fetchForms({ includeGlobal: true })
    } else {
      fetchSubmissions({
        formId: selectedForm?.id,
        search: filters.search,
        status: filters.status
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
          <p className="text-muted-foreground">
            Track and manage form submissions from your websites
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Form
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">
              Overview
              {forms.reduce((acc, f) => acc + (f.new_count || 0), 0) > 0 && (
                <Badge variant="destructive" className="ml-2 h-5">
                  {forms.reduce((acc, f) => acc + (f.new_count || 0), 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="submissions">
              All Submissions
            </TabsTrigger>
          </TabsList>

          {activeTab === 'submissions' && (
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 w-[250px]"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ status: value })}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                </SelectContent>
              </Select>

              {/* Form Filter */}
              <Select
                value={selectedForm?.id || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedForm(null)
                    setFilters({ formId: null })
                  } else {
                    const form = forms.find(f => f.id === value)
                    setSelectedForm(form)
                    setFilters({ formId: value })
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <FileText className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Forms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {forms.map(form => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : forms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first form to start tracking submissions
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Form
                </Button>
              </CardContent>
            </Card>
          ) : (
            <FormsOverview forms={forms} onSelectForm={handleSelectForm} />
          )}
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSubmissions ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No submissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map(submission => (
                    <TableRow
                      key={submission.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewSubmission(submission.id)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{submission.name || 'Unknown'}</span>
                          <span className="text-sm text-muted-foreground">{submission.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{submission.form?.name || 'Unknown'}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {submission.source_page || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DeviceIcon device={submission.device_type} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(new Date(submission.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(submission.created_at), 'h:mm a')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              handleViewSubmission(submission.id)
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`mailto:${submission.email}`} onClick={(e) => e.stopPropagation()}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUpdateStatus(submission.id, 'spam')
                              }}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Mark as Spam
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} submissions
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPage(pagination.page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasMore}
                    onClick={() => setPage(pagination.page + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submission Detail Modal */}
      <SubmissionDetailModal
        submission={currentSubmission}
        open={showDetail}
        onOpenChange={(open) => {
          setShowDetail(open)
          if (!open) clearCurrentSubmission()
        }}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  )
}
