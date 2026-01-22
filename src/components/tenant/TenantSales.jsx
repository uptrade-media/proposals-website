/**
 * Tenant Sales - Manage sales for tenant's own website
 * 
 * This component shows tenant-specific data:
 * - Leads/Form Submissions from their website
 * - Their customers (contacts linked to their tenant_id)
 * - Invoices they've created for their customers
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
  DialogDescription,
  DialogFooter
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
  ClipboardList,
  Users,
  Receipt,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Globe,
  Clock,
  User,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import { useFormsStore } from '@/lib/forms-store'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'
import api from '@/lib/api'

// Status badge component
function StatusBadge({ status, type = 'lead' }) {
  const leadConfig = {
    new: { label: 'New', className: 'bg-blue-500' },
    contacted: { label: 'Contacted', className: 'bg-yellow-500' },
    qualified: { label: 'Qualified', className: 'bg-green-500' },
    converted: { label: 'Converted', className: 'bg-emerald-600' },
    spam: { label: 'Spam', className: 'bg-red-500' }
  }
  
  const invoiceConfig = {
    draft: { label: 'Draft', className: 'bg-gray-500' },
    sent: { label: 'Sent', className: 'bg-blue-500' },
    viewed: { label: 'Viewed', className: 'bg-yellow-500' },
    paid: { label: 'Paid', className: 'bg-green-500' },
    overdue: { label: 'Overdue', className: 'bg-red-500' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-400' }
  }

  const config = type === 'invoice' ? invoiceConfig : leadConfig
  const statusConfig = config[status] || { label: status, className: 'bg-gray-500' }

  return (
    <Badge className={cn('text-white', statusConfig.className)}>
      {statusConfig.label}
    </Badge>
  )
}

// Quick stats cards
function SalesStats({ stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalLeads || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats.newLeads || 0} new this week
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCustomers || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeCustomers || 0} active
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(stats.totalRevenue || 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            ${(stats.monthlyRevenue || 0).toLocaleString()} this month
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.conversionRate || 0}%</div>
          <p className="text-xs text-muted-foreground">
            Leads to customers
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Leads Tab Content
function LeadsTab({ tenantId }) {
  const { 
    submissions, 
    pagination, 
    isLoadingSubmissions, 
    fetchSubmissions,
    updateSubmission 
  } = useFormsStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedLead, setSelectedLead] = useState(null)

  useEffect(() => {
    if (tenantId) {
      fetchSubmissions({ tenantId, status: statusFilter !== 'all' ? statusFilter : undefined })
    }
  }, [tenantId, statusFilter, fetchSubmissions])

  const handleSearch = () => {
    fetchSubmissions({ tenantId, search: searchQuery, status: statusFilter !== 'all' ? statusFilter : undefined })
  }

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateSubmission(id, { status })
      toast.success('Lead status updated')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingSubmissions ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              submissions.map(lead => (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedLead(lead)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{lead.name || 'Unknown'}</span>
                      <span className="text-sm text-muted-foreground">{lead.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                      {lead.source_page || lead.form?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </span>
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
                        <DropdownMenuItem asChild>
                          <a href={`mailto:${lead.email}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </a>
                        </DropdownMenuItem>
                        {lead.phone && (
                          <DropdownMenuItem asChild>
                            <a href={`tel:${lead.phone}`}>
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateStatus(lead.id, 'contacted')
                        }}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Contacted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleUpdateStatus(lead.id, 'qualified')
                        }}>
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          Mark Qualified
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedLead?.name || selectedLead?.email}
            </DialogTitle>
            <DialogDescription>
              Submitted {selectedLead && formatDistanceToNow(new Date(selectedLead.created_at), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedLead.email}</p>
                  </div>
                </div>
                {selectedLead.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedLead.phone}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedLead.message && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm">{selectedLead.message}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2">
                <StatusBadge status={selectedLead.status} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${selectedLead.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </a>
                  </Button>
                  {selectedLead.phone && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${selectedLead.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Customers Tab Content
function CustomersTab({ tenantId }) {
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (tenantId) {
      fetchCustomers()
    }
  }, [tenantId])

  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      const response = await ecommerceApi.listTenantCustomers(tenantId)
      setCustomers(response.data.customers || [])
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      toast.error('Failed to load customers')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c => 
    !searchQuery || 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Customers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  {customers.length === 0 ? 'No customers yet' : 'No matching customers'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.name || 'Unknown'}</span>
                      <span className="text-sm text-muted-foreground">{customer.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{customer.company || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                      {customer.status || 'active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    ${(customer.total_spent || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`mailto:${customer.email}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Receipt className="h-4 w-4 mr-2" />
                          Create Invoice
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

// Invoices Tab Content
function InvoicesTab({ tenantId }) {
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (tenantId) {
      fetchInvoices()
    }
  }, [tenantId, statusFilter])

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'all') params.status = statusFilter
      
      const response = await ecommerceApi.listTenantInvoices(tenantId, params)
      setInvoices(response.data.invoices || [])
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Invoices Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">#{invoice.invoice_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{invoice.customer?.name || 'Unknown'}</span>
                      <span className="text-sm text-muted-foreground">{invoice.customer?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${(invoice.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} type="invoice" />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Reminder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

// Main TenantSales Component
export default function TenantSales() {
  const { currentOrg } = useAuthStore()
  const [activeTab, setActiveTab] = useState('leads')
  const [stats, setStats] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const tenantId = currentOrg?.id

  // Fetch stats on mount
  useEffect(() => {
    if (tenantId) {
      fetchStats()
    }
  }, [tenantId])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await ecommerceApi.getTenantSalesStats(tenantId)
      setStats(response.data.stats || {})
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentOrg) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Organization Selected</h2>
        <p className="text-muted-foreground max-w-md">
          Select an organization from the switcher above to view your sales data.
          This section shows leads, customers, and invoices for your own website.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Sales</h1>
          <p className="text-muted-foreground">
            Manage leads, customers, and invoices for {currentOrg.name}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <SalesStats stats={stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="leads" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-6">
          <LeadsTab tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          <CustomersTab tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <InvoicesTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
