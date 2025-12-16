import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { AreaChart, BarChart, DonutChart } from '@tremor/react'
import { 
  DollarSign, 
  Receipt, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus,
  Eye,
  Edit,
  CreditCard,
  TrendingUp,
  Calendar,
  Loader2,
  Download,
  Send,
  Bell,
  ExternalLink,
  Mail,
  Repeat,
  Pause,
  Play,
  BarChart3
} from 'lucide-react'
import useBillingStore from '@/lib/billing-store'
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'
import useReportsStore from '@/lib/reports-store'
import InvoicePaymentDialog from './InvoicePaymentDialog'
import api from '@/lib/api'

const Billing = () => {
  const { user } = useAuthStore()
  const { projects, fetchProjects } = useProjectsStore()
  const { 
    invoices, 
    summary,
    overdueInvoices,
    fetchInvoices, 
    fetchBillingSummary,
    fetchOverdueInvoices,
    createInvoice,
    updateInvoice,
    markInvoicePaid,
    sendInvoice,
    sendReminder,
    toggleRecurringPause,
    getRecurringIntervalLabel,
    getStatusColor,
    formatCurrency,
    formatDate,
    isOverdue,
    getDaysOverdue,
    isLoading, 
    error, 
    clearError 
  } = useBillingStore()
  
  const { 
    financialReport,
    fetchFinancialReport,
    formatCurrency: formatReportCurrency,
    isLoading: reportsLoading 
  } = useReportsStore()
  
  const hasFetchedRef = useRef(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [sendingInvoiceId, setSendingInvoiceId] = useState(null)
  const [sendingReminderId, setSendingReminderId] = useState(null)
  const [togglingRecurringId, setTogglingRecurringId] = useState(null)
  const [clients, setClients] = useState([])
  const [reportDateFilters, setReportDateFilters] = useState({ start_date: '', end_date: '' })
  const [formData, setFormData] = useState({
    contactId: '',
    project_id: '',
    amount: '',
    tax_rate: '0',
    due_date: '',
    description: '',
    status: 'pending',
    // Recurring invoice fields
    isRecurring: false,
    recurringInterval: '',
    recurringDayOfMonth: '',
    recurringEndDate: '',
    recurringCount: ''
  })
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [invoiceToPay, setInvoiceToPay] = useState(null)

  // Fetch initial data only once
  useEffect(() => {
    if (hasFetchedRef.current) return
    
    console.log('[Billing] Fetching initial data')
    hasFetchedRef.current = true
    fetchProjects()
    fetchBillingSummary()
    fetchInvoices()
    fetchOverdueInvoices()
    if (isAdmin) {
      fetchClients()
    }
  }, [])

  const fetchClients = async () => {
    try {
      const response = await api.get('/.netlify/functions/admin-clients-list')
      setClients(response.data.clients || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    if (error) {
      clearError()
    }
  }

  const resetForm = () => {
    setFormData({
      contactId: '',
      project_id: '',
      amount: '',
      tax_rate: '0',
      due_date: '',
      description: '',
      status: 'pending',
      // Recurring invoice fields
      isRecurring: false,
      recurringInterval: '',
      recurringDayOfMonth: '',
      recurringEndDate: '',
      recurringCount: ''
    })
  }

  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    
    const invoiceData = {
      contactId: formData.contactId,
      projectId: formData.project_id || null,
      amount: parseFloat(formData.amount),
      taxRate: parseFloat(formData.tax_rate),
      dueDate: formData.due_date,
      description: formData.description || null,
      // Recurring invoice fields
      isRecurring: formData.isRecurring,
      recurringInterval: formData.isRecurring ? formData.recurringInterval : null,
      recurringDayOfMonth: formData.isRecurring && formData.recurringDayOfMonth ? parseInt(formData.recurringDayOfMonth) : null,
      recurringEndDate: formData.isRecurring && formData.recurringEndDate ? formData.recurringEndDate : null,
      recurringCount: formData.isRecurring && formData.recurringCount ? parseInt(formData.recurringCount) : null
    }
    
    const result = await createInvoice(invoiceData)
    
    if (result.success) {
      setIsCreateDialogOpen(false)
      resetForm()
      fetchBillingSummary() // Refresh summary
    }
  }

  const handleEditInvoice = async (e) => {
    e.preventDefault()
    
    if (!selectedInvoice) return
    
    const invoiceData = {
      ...formData,
      amount: parseFloat(formData.amount),
      tax_rate: parseFloat(formData.tax_rate)
    }
    
    const result = await updateInvoice(selectedInvoice.id, invoiceData)
    
    if (result.success) {
      setIsEditDialogOpen(false)
      setSelectedInvoice(null)
      resetForm()
      fetchBillingSummary() // Refresh summary
    }
  }

  const openEditDialog = (invoice) => {
    setSelectedInvoice(invoice)
    setFormData({
      project_id: invoice.project?.id?.toString() || '',
      amount: invoice.amount?.toString() || '',
      tax_rate: ((invoice.taxAmount / invoice.amount) * 100).toFixed(2) || '0',
      due_date: invoice.dueDate || '',
      description: invoice.description || '',
      status: invoice.status || 'pending'
    })
    setIsEditDialogOpen(true)
  }

  const handleMarkPaid = async (invoice) => {
    if (window.confirm(`Mark invoice ${invoice.invoiceNumber} as paid?`)) {
      await markInvoicePaid(invoice.id)
    }
  }

  const handleSendInvoice = async (invoice) => {
    if (invoice.status === 'paid') return
    
    const confirmText = invoice.sentAt 
      ? `Resend invoice ${invoice.invoiceNumber} to ${invoice.contact?.email}?`
      : `Send invoice ${invoice.invoiceNumber} to ${invoice.contact?.email}?`
    
    if (!window.confirm(confirmText)) return
    
    setSendingInvoiceId(invoice.id)
    const result = await sendInvoice(invoice.id)
    setSendingInvoiceId(null)
    
    if (result.success) {
      fetchInvoices() // Refresh to get updated status
    }
  }

  const handleSendReminder = async (invoice) => {
    if (invoice.status === 'paid') return
    if (!invoice.hasPaymentToken && !invoice.sentAt) {
      alert('Please send the invoice first before sending reminders.')
      return
    }
    
    const confirmText = `Send payment reminder for ${invoice.invoiceNumber} to ${invoice.contact?.email}? (Reminder ${(invoice.reminderCount || 0) + 1}/3)`
    if (!window.confirm(confirmText)) return
    
    setSendingReminderId(invoice.id)
    const result = await sendReminder(invoice.id)
    setSendingReminderId(null)
    
    if (result.success) {
      fetchInvoices() // Refresh to get updated reminder count
    }
  }

  const handleToggleRecurring = async (invoice) => {
    if (!invoice.isRecurring) return
    
    const action = invoice.recurringPaused ? 'resume' : 'pause'
    const confirmText = `${action === 'pause' ? 'Pause' : 'Resume'} recurring invoice ${invoice.invoiceNumber}?`
    if (!window.confirm(confirmText)) return
    
    setTogglingRecurringId(invoice.id)
    const result = await toggleRecurringPause(invoice.id, !invoice.recurringPaused)
    setTogglingRecurringId(null)
    
    if (result.success) {
      fetchInvoices() // Refresh to get updated status
    }
  }

  const openPaymentDialog = (invoice) => {
    setInvoiceToPay(invoice)
    setPaymentDialogOpen(true)
  }

  const handlePaymentSuccess = () => {
    // Refresh invoices after successful payment
    fetchInvoices()
    fetchBillingSummary()
    fetchOverdueInvoices()
    setPaymentDialogOpen(false)
    setInvoiceToPay(null)
  }

  const filteredInvoices = statusFilter 
    ? (invoices || []).filter(invoice => invoice.status === statusFilter)
    : (invoices || [])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Billing</h1>
          <p className="text-[var(--text-secondary)]">Manage invoices and billing information</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glass-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Generate a new invoice for a project.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="contactId">Client *</Label>
                  <Select 
                    value={formData.contactId} 
                    onValueChange={(value) => handleFormChange('contactId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.filter(client => client.id).map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project_id">Project (Optional)</Label>
                  <Select 
                    value={formData.project_id || 'none'} 
                    onValueChange={(value) => handleFormChange('project_id', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.filter(project => project.id).map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleFormChange('amount', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => handleFormChange('tax_rate', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleFormChange('due_date', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Invoice description"
                    rows={3}
                  />
                </div>

                {/* Recurring Invoice Options */}
                <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isRecurring" 
                      checked={formData.isRecurring}
                      onCheckedChange={(checked) => handleFormChange('isRecurring', checked)}
                    />
                    <Label htmlFor="isRecurring" className="flex items-center gap-2 cursor-pointer">
                      <Repeat className="w-4 h-4" />
                      Make this a recurring invoice
                    </Label>
                  </div>

                  {formData.isRecurring && (
                    <div className="space-y-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="recurringInterval">Billing Frequency *</Label>
                        <Select 
                          value={formData.recurringInterval} 
                          onValueChange={(value) => handleFormChange('recurringInterval', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {['monthly', 'quarterly', 'semi-annual', 'annual'].includes(formData.recurringInterval) && (
                        <div className="space-y-2">
                          <Label htmlFor="recurringDayOfMonth">Day of Month</Label>
                          <Select 
                            value={formData.recurringDayOfMonth} 
                            onValueChange={(value) => handleFormChange('recurringDayOfMonth', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select day (1-28)" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(28)].map((_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-[var(--text-muted)]">
                            Invoice will be generated on this day each period
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="recurringEndDate">End Date (Optional)</Label>
                          <Input
                            id="recurringEndDate"
                            type="date"
                            value={formData.recurringEndDate}
                            onChange={(e) => handleFormChange('recurringEndDate', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recurringCount">Max Invoices (Optional)</Label>
                          <Input
                            id="recurringCount"
                            type="number"
                            min="1"
                            value={formData.recurringCount}
                            onChange={(e) => handleFormChange('recurringCount', e.target.value)}
                            placeholder="e.g. 12"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Leave both blank for indefinite recurring. Set one or both to limit.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !formData.contactId || !formData.amount || !formData.due_date || (formData.isRecurring && !formData.recurringInterval)}
                    variant="glass-primary"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      formData.isRecurring ? 'Create Recurring Invoice' : 'Create Invoice'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Total Revenue</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {formatCurrency(summary.totalRevenue)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[var(--accent-success)]/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-[var(--accent-success)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Pending</p>
                      <p className="text-2xl font-bold text-[var(--accent-warning)]">
                        {formatCurrency(summary.pendingAmount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[var(--accent-warning)]/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-[var(--accent-warning)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">This Month</p>
                      <p className="text-2xl font-bold text-[var(--accent-success)]">
                        {formatCurrency(summary.thisMonthRevenue)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[var(--accent-success)]/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-[var(--accent-success)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Overdue</p>
                      <p className="text-2xl font-bold text-[var(--accent-error)]">
                        {formatCurrency(summary.overdueAmount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[var(--accent-error)]/20 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-[var(--accent-error)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest billing activity</CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.recentInvoices?.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">No invoices yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {summary?.recentInvoices?.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-xl flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-[var(--brand-primary)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{invoice.projectName || invoice.contactName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                        <Badge className={getStatusColor(invoice.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(invoice.status)}
                            <span className="capitalize">{invoice.status}</span>
                          </div>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices List */}
          {isLoading && filteredInvoices.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No invoices found</h3>
                <p className="text-[var(--text-secondary)] text-center mb-4">
                  {statusFilter 
                    ? `No invoices with status "${statusFilter}".`
                    : "No invoices have been created yet."
                  }
                </p>
                {isAdmin && !statusFilter && (
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    variant="glass-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Invoice
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#4bbf39]/10 rounded-lg flex items-center justify-center">
                          {invoice.isRecurring ? (
                            <Repeat className="w-6 h-6 text-[#4bbf39]" />
                          ) : (
                            <Receipt className="w-6 h-6 text-[#4bbf39]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{invoice.invoiceNumber}</h4>
                            {invoice.isRecurring && (
                              <Badge variant="outline" className="text-xs bg-[#4bbf39]/10 text-[#4bbf39] border-[#4bbf39]/30">
                                <Repeat className="w-3 h-3 mr-1" />
                                {getRecurringIntervalLabel(invoice.recurringInterval)}
                                {invoice.recurringPaused && <span className="ml-1">(Paused)</span>}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[var(--text-secondary)]">{invoice.project?.title || invoice.projectName}</p>
                          <p className="text-sm text-[var(--text-tertiary)]">{invoice.contact?.company}</p>
                          {invoice.isRecurring && invoice.nextRecurringDate && !invoice.recurringPaused && (
                            <p className="text-xs text-[var(--text-tertiary)]">
                              Next invoice: {formatDate(invoice.nextRecurringDate)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(invoice.totalAmount)}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className={getStatusColor(isOverdue(invoice) ? 'overdue' : invoice.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(isOverdue(invoice) ? 'overdue' : invoice.status)}
                              <span className="capitalize">
                                {isOverdue(invoice) ? 'Overdue' : invoice.status}
                              </span>
                            </div>
                          </Badge>
                          {isOverdue(invoice) && (
                            <span className="text-xs text-red-600">
                              {getDaysOverdue(invoice)} days
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--text-tertiary)] mt-1">
                          Due: {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Admin Tracking Info */}
                    {isAdmin && invoice.status !== 'paid' && (
                      <div className="mt-4 pt-4 border-t border-dashed flex flex-wrap gap-4 text-sm text-[var(--text-tertiary)]">
                        {invoice.sentAt && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Sent: {formatDate(invoice.sentAt)}</span>
                          </div>
                        )}
                        {invoice.viewCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Views: {invoice.viewCount}</span>
                            {invoice.lastViewedAt && (
                              <span className="text-xs">(last: {formatDate(invoice.lastViewedAt)})</span>
                            )}
                          </div>
                        )}
                        {invoice.reminderCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Bell className="w-3.5 h-3.5" />
                            <span>Reminders: {invoice.reminderCount}/3</span>
                            {invoice.lastReminderSent && (
                              <span className="text-xs">(last: {formatDate(invoice.lastReminderSent)})</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                        {invoice.status !== 'paid' && (
                          <>
                            <Button 
                              variant={invoice.sentAt ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleSendInvoice(invoice)}
                              disabled={sendingInvoiceId === invoice.id}
                            >
                              {sendingInvoiceId === invoice.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4 mr-2" />
                              )}
                              {invoice.sentAt ? 'Resend' : 'Send Invoice'}
                            </Button>
                            {invoice.sentAt && (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendReminder(invoice)}
                                disabled={sendingReminderId === invoice.id || invoice.reminderCount >= 3}
                                title={invoice.reminderCount >= 3 ? 'Maximum reminders sent' : 'Send payment reminder'}
                              >
                                {sendingReminderId === invoice.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Bell className="w-4 h-4 mr-2" />
                                )}
                                Remind ({invoice.reminderCount || 0}/3)
                              </Button>
                            )}
                          </>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(invoice)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        {invoice.status !== 'paid' && (
                          <Button 
                            size="sm"
                            variant="glass-primary"
                            onClick={() => handleMarkPaid(invoice)}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Mark Paid
                          </Button>
                        )}
                        {invoice.isRecurring && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRecurring(invoice)}
                            disabled={togglingRecurringId === invoice.id}
                            title={invoice.recurringPaused ? 'Resume recurring invoices' : 'Pause recurring invoices'}
                          >
                            {togglingRecurringId === invoice.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : invoice.recurringPaused ? (
                              <Play className="w-4 h-4 mr-2" />
                            ) : (
                              <Pause className="w-4 h-4 mr-2" />
                            )}
                            {invoice.recurringPaused ? 'Resume' : 'Pause'}
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Client Pay Button */}
                    {!isAdmin && (invoice.status === 'pending' || invoice.status === 'sent' || isOverdue(invoice)) && (
                      <div className="mt-4 pt-4 border-t">
                        <Button 
                          onClick={() => openPaymentDialog(invoice)}
                          variant="glass-primary"
                          className="w-full"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now - {formatCurrency(invoice.totalAmount)}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {(!overdueInvoices || overdueInvoices.length === 0) ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No overdue invoices</h3>
                <p className="text-[var(--text-secondary)] text-center">
                  All invoices are up to date. Great job!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have {(overdueInvoices || []).length} overdue invoice{(overdueInvoices || []).length !== 1 ? 's' : ''} requiring attention.
                </AlertDescription>
              </Alert>
              
              {(overdueInvoices || []).map((invoice) => (
                <Card key={invoice.id} className="border-red-200 bg-red-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{invoice.invoiceNumber}</h4>
                          <p className="text-[var(--text-secondary)]">{invoice.projectName}</p>
                          <p className="text-sm text-red-600 font-medium">
                            {invoice.daysOverdue} days overdue
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(invoice.totalAmount)}
                        </p>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Due: {formatDate(invoice.dueDate)}
                        </p>
                        {isAdmin ? (
                          <Button 
                            size="sm"
                            variant="glass-primary"
                            onClick={() => handleMarkPaid(invoice)}
                            className="mt-2"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Mark Paid
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => openPaymentDialog(invoice)}
                            className="mt-2 bg-red-600 hover:bg-red-700 text-white"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {/* Date Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="report_start_date">Start Date</Label>
                  <Input
                    id="report_start_date"
                    type="date"
                    value={reportDateFilters.start_date}
                    onChange={(e) => setReportDateFilters(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="report_end_date">End Date</Label>
                  <Input
                    id="report_end_date"
                    type="date"
                    value={reportDateFilters.end_date}
                    onChange={(e) => setReportDateFilters(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
                <div className="flex space-x-2 pt-6">
                  <Button 
                    onClick={() => fetchFinancialReport(reportDateFilters)} 
                    disabled={reportsLoading}
                  >
                    {reportsLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load Report'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setReportDateFilters({ start_date: '', end_date: '' })
                      fetchFinancialReport({})
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Load prompt if no data */}
          {!financialReport && !reportsLoading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Financial Reports</h3>
                <p className="text-[var(--text-secondary)] text-center mb-4">
                  Click "Load Report" to view detailed financial analytics
                </p>
                <Button 
                  variant="glass-primary"
                  onClick={() => fetchFinancialReport(reportDateFilters)}
                  disabled={reportsLoading}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Load Financial Report
                </Button>
              </CardContent>
            </Card>
          )}

          {financialReport && (
            <>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(financialReport.summary?.total_revenue || 0)}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">Total Revenue</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(financialReport.summary?.avg_invoice_value || 0)}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">Avg Invoice Value</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(financialReport.summary?.overdue_amount || 0)}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">Overdue Amount</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {financialReport.summary?.avg_payment_days || 0}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">Avg Payment Days</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Monthly Revenue Trend
                  </CardTitle>
                  <CardDescription>Revenue breakdown by month</CardDescription>
                </CardHeader>
                <CardContent>
                  {financialReport.breakdown?.monthly_revenue?.length > 0 ? (
                    <AreaChart
                      data={financialReport.breakdown.monthly_revenue}
                      index="month_name"
                      categories={['revenue']}
                      colors={['emerald']}
                      valueFormatter={(v) => formatCurrency(v)}
                      className="h-72"
                      showLegend={false}
                      showGridLines={true}
                    />
                  ) : (
                    <div className="h-72 flex items-center justify-center text-[var(--text-tertiary)]">
                      No monthly revenue data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invoice Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Status Distribution</CardTitle>
                    <CardDescription>Breakdown by payment status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {financialReport.breakdown?.status_distribution?.length > 0 ? (
                      <DonutChart
                        data={financialReport.breakdown.status_distribution.map(s => ({
                          name: s.status?.charAt(0).toUpperCase() + s.status?.slice(1) || 'Unknown',
                          count: s.count || 0
                        }))}
                        index="name"
                        category="count"
                        colors={['emerald', 'amber', 'rose', 'gray']}
                        className="h-64"
                        showLabel={true}
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-[var(--text-tertiary)]">
                        No status data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Client</CardTitle>
                    <CardDescription>Top clients by revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {financialReport.breakdown?.top_clients?.length > 0 ? (
                      <BarChart
                        data={financialReport.breakdown.top_clients.slice(0, 5)}
                        index="client_name"
                        categories={['total_revenue']}
                        colors={['blue']}
                        valueFormatter={(v) => formatCurrency(v)}
                        className="h-64"
                        showLegend={false}
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-[var(--text-tertiary)]">
                        No client revenue data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details and status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditInvoice} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="edit_project_id">Project</Label>
              <Select 
                value={formData.project_id || 'none'} 
                onValueChange={(value) => handleFormChange('project_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.filter(project => project.id).map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_amount">Amount ($)</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_tax_rate">Tax Rate (%)</Label>
                <Input
                  id="edit_tax_rate"
                  type="number"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) => handleFormChange('tax_rate', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_due_date">Due Date</Label>
              <Input
                id="edit_due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleFormChange('due_date', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleFormChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Invoice description"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedInvoice(null)
                  resetForm()
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="glass-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Invoice'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Payment Dialog (for clients) */}
      <InvoicePaymentDialog
        invoice={invoiceToPay}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}

export default Billing
