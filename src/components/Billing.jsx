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
  Download
} from 'lucide-react'
import useBillingStore from '@/lib/billing-store'
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'
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
    getStatusColor,
    formatCurrency,
    formatDate,
    isOverdue,
    getDaysOverdue,
    isLoading, 
    error, 
    clearError 
  } = useBillingStore()
  
  const hasFetchedRef = useRef(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [clients, setClients] = useState([])
  const [formData, setFormData] = useState({
    contactId: '',
    project_id: '',
    amount: '',
    tax_rate: '0',
    due_date: '',
    description: '',
    status: 'pending'
  })
  const [statusFilter, setStatusFilter] = useState('')

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
      status: 'pending'
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
      description: formData.description || null
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
      project_id: invoice.project_id?.toString() || '',
      amount: invoice.amount?.toString() || '',
      tax_rate: ((invoice.tax_amount / invoice.amount) * 100).toFixed(2) || '0',
      due_date: invoice.due_date || '',
      description: invoice.description || '',
      status: invoice.status || 'pending'
    })
    setIsEditDialogOpen(true)
  }

  const handleMarkPaid = async (invoice) => {
    if (window.confirm(`Mark invoice ${invoice.invoice_number} as paid?`)) {
      await markInvoicePaid(invoice.id)
    }
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
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-gray-600">Manage invoices and billing information</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]">
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
                      {clients.map((client) => (
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
                    value={formData.project_id} 
                    onValueChange={(value) => handleFormChange('project_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
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
                    disabled={isLoading || !formData.contactId || !formData.amount || !formData.due_date}
                    className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Invoice'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(summary.amounts.total_amount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(summary.amounts.pending_amount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Paid</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(summary.amounts.paid_amount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(summary.amounts.overdue_amount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
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
              {summary?.recent_invoices?.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No invoices yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {summary?.recent_invoices?.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[#4bbf39]/10 rounded-lg flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-[#4bbf39]" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">{invoice.project_title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
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
              <Loader2 className="h-8 w-8 animate-spin text-[#4bbf39]" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-500 text-center mb-4">
                  {statusFilter 
                    ? `No invoices with status "${statusFilter}".`
                    : "No invoices have been created yet."
                  }
                </p>
                {isAdmin && !statusFilter && (
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
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
                          <Receipt className="w-6 h-6 text-[#4bbf39]" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{invoice.invoice_number}</h4>
                          <p className="text-gray-600">{invoice.project_title}</p>
                          <p className="text-sm text-gray-500">{invoice.company_name}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(invoice.total_amount)}</p>
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
                        <p className="text-sm text-gray-500 mt-1">
                          Due: {formatDate(invoice.due_date)}
                        </p>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <div className="flex space-x-2 mt-4 pt-4 border-t">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(invoice)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        {invoice.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => handleMarkPaid(invoice)}
                            className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Mark Paid
                          </Button>
                        )}
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No overdue invoices</h3>
                <p className="text-gray-500 text-center">
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
                          <h4 className="font-semibold text-lg">{invoice.invoice_number}</h4>
                          <p className="text-gray-600">{invoice.project_title}</p>
                          <p className="text-sm text-red-600 font-medium">
                            {invoice.days_overdue} days overdue
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {formatDate(invoice.due_date)}
                        </p>
                        {isAdmin && (
                          <Button 
                            size="sm"
                            onClick={() => handleMarkPaid(invoice)}
                            className="mt-2 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Mark Paid
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
                value={formData.project_id} 
                onValueChange={(value) => handleFormChange('project_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
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
                disabled={isLoading}
                className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
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
    </div>
  )
}

export default Billing
