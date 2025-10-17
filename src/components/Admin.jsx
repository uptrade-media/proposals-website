import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import {
  Plus,
  FileText,
  Send,
  Upload,
  Users,
  DollarSign,
  MessageSquare,
  FolderOpen,
  Loader2,
  Trash2,
  Edit,
  Eye,
  Mail,
  Download,
  Settings,
  Shield,
  BookOpen
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'
import BlogManagement from './BlogManagement'

export default function Admin() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('proposals')
  const [isLoading, setIsLoading] = useState(false)
  const hasFetchedClientsRef = useRef(false)
  const hasFetchedProposalsRef = useRef(false)

  // Proposals state
  const [proposals, setProposals] = useState([])
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false)
  const [proposalForm, setProposalForm] = useState({
    title: '',
    clientEmail: '',
    mdxContent: '',
    slug: ''
  })

  // Invoices state
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    clientEmail: '',
    amount: '',
    dueDate: '',
    description: '',
    projectId: ''
  })

  // Messages state
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)
  const [messageForm, setMessageForm] = useState({
    clientEmail: '',
    subject: '',
    message: ''
  })

  // Files state
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false)
  const [fileUpload, setFileUpload] = useState({
    clientEmail: '',
    category: 'contract',
    file: null
  })

  // Clients state
  const [clients, setClients] = useState([])
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    company: ''
  })

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            Access denied. Admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Fetch clients on mount - only once
  useEffect(() => {
    if (hasFetchedClientsRef.current) return
    
    console.log('[Admin] Fetching clients')
    hasFetchedClientsRef.current = true
    fetchClients()
  }, [])

  // Fetch proposals when tab changes - only once per tab
  useEffect(() => {
    if (activeTab === 'proposals' && !hasFetchedProposalsRef.current) {
      console.log('[Admin] Fetching proposals')
      hasFetchedProposalsRef.current = true
      fetchProposals()
    }
  }, [activeTab])

  const fetchClients = async () => {
    try {
      const response = await api.get('/.netlify/functions/admin-clients-list')
      setClients(response.data.clients || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
      // Set empty array to prevent retries
      setClients([])
    }
  }

  // Handle proposal creation
  const handleCreateProposal = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // First get the contact ID by email
      const contactResponse = await api.get(`/.netlify/functions/admin-clients-get?email=${proposalForm.clientEmail}`)
      const contactId = contactResponse.data.client.id

      const response = await api.post('/.netlify/functions/proposals-create', {
        contactId,
        title: proposalForm.title,
        mdxContent: proposalForm.mdxContent,
        slug: proposalForm.slug,
        status: 'draft'
      })

      toast.success('Proposal created successfully!')
      setIsProposalDialogOpen(false)
      setProposalForm({ title: '', clientEmail: '', mdxContent: '', slug: '' })
      
      // Refresh proposals list
      fetchProposals()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create proposal')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProposals = async () => {
    try {
      const response = await api.get('/.netlify/functions/proposals-list')
      setProposals(response.data.proposals || [])
    } catch (err) {
      console.error('Failed to fetch proposals:', err)
      // Set empty array to prevent retries
      setProposals([])
    }
  }

  // Handle invoice creation
  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // First get the contact ID by email
      const contactResponse = await api.get(`/.netlify/functions/admin-clients-get?email=${invoiceForm.clientEmail}`)
      const contactId = contactResponse.data.client.id

      const response = await api.post('/.netlify/functions/invoices-create', {
        contactId,
        projectId: invoiceForm.projectId || null,
        amount: parseFloat(invoiceForm.amount),
        dueDate: invoiceForm.dueDate,
        description: invoiceForm.description
      })

      toast.success('Invoice created and sent to client!')
      setIsInvoiceDialogOpen(false)
      setInvoiceForm({ clientEmail: '', amount: '', dueDate: '', description: '', projectId: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create invoice')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle message sending
  const handleSendMessage = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await api.post('/.netlify/functions/admin-message-send', {
        clientEmail: messageForm.clientEmail,
        subject: messageForm.subject,
        message: messageForm.message
      })

      toast.success('Message sent!')
      setIsMessageDialogOpen(false)
      setMessageForm({ clientEmail: '', subject: '', message: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', fileUpload.file)
      formData.append('clientEmail', fileUpload.clientEmail)
      formData.append('category', fileUpload.category)

      const response = await api.post('/.netlify/functions/admin-file-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success('File uploaded and client notified!')
      setIsFileDialogOpen(false)
      setFileUpload({ clientEmail: '', category: 'contract', file: null })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload file')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle client creation
  const handleCreateClient = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await api.post('/.netlify/functions/admin-client-create', {
        name: clientForm.name,
        email: clientForm.email,
        company: clientForm.company
      })

      toast.success('Client created! Account setup email sent.')
      setIsClientDialogOpen(false)
      setClientForm({ name: '', email: '', company: '' })
      fetchClients()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create client')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage proposals, clients, and system settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Management Console</CardTitle>
          <CardDescription>
            Use the tabs below to manage different aspects of the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Proposals</CardTitle>
                  <CardDescription>Create and manage client proposals</CardDescription>
                </div>
                <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]">
                      <Plus className="w-4 h-4 mr-2" />
                      New Proposal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Proposal</DialogTitle>
                      <DialogDescription>
                        Create an MDX proposal and assign it to a client
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateProposal} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="proposalTitle">Proposal Title</Label>
                        <Input
                          id="proposalTitle"
                          placeholder="Q4 2025 Digital Marketing Proposal"
                          value={proposalForm.title}
                          onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="proposalSlug">Slug (URL)</Label>
                        <Input
                          id="proposalSlug"
                          placeholder="client-name-q4-2025"
                          value={proposalForm.slug}
                          onChange={(e) => setProposalForm({ ...proposalForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                          required
                        />
                        <p className="text-xs text-gray-500">
                          Client will access at: /p/{proposalForm.slug || 'your-slug'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="proposalClient">Client Email</Label>
                        <Select
                          value={proposalForm.clientEmail}
                          onValueChange={(value) => setProposalForm({ ...proposalForm, clientEmail: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.email}>
                                {client.name} ({client.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="proposalContent">MDX Content</Label>
                        <Textarea
                          id="proposalContent"
                          placeholder="Paste your MDX proposal content here..."
                          value={proposalForm.mdxContent}
                          onChange={(e) => setProposalForm({ ...proposalForm, mdxContent: e.target.value })}
                          rows={15}
                          className="font-mono text-sm"
                          required
                        />
                        <p className="text-xs text-gray-500">
                          Use MDX syntax with custom components like &lt;ExecutiveSummary&gt;, &lt;PricingSection&gt;, etc.
                        </p>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsProposalDialogOpen(false)}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create & Send'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <p className="text-sm text-gray-500">No proposals yet</p>
              ) : (
                <div className="space-y-2">
                  {proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{proposal.title}</h4>
                        <p className="text-sm text-gray-500">
                          {proposal.client?.name} ({proposal.client?.email})
                        </p>
                        <p className="text-xs text-gray-400">
                          Slug: /p/{proposal.slug}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={proposal.status === 'accepted' ? 'default' : 'outline'}>
                          {proposal.status}
                        </Badge>
                        {proposal.viewed && (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Viewed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Send invoices to clients</CardDescription>
                </div>
                <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]">
                      <Plus className="w-4 h-4 mr-2" />
                      New Invoice
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Invoice</DialogTitle>
                      <DialogDescription>
                        Send an invoice to a client
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateInvoice} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoiceClient">Client</Label>
                        <Select
                          value={invoiceForm.clientEmail}
                          onValueChange={(value) => setInvoiceForm({ ...invoiceForm, clientEmail: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.email}>
                                {client.name} ({client.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invoiceAmount">Amount</Label>
                        <Input
                          id="invoiceAmount"
                          type="number"
                          step="0.01"
                          placeholder="5000.00"
                          value={invoiceForm.amount}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invoiceDueDate">Due Date</Label>
                        <Input
                          id="invoiceDueDate"
                          type="date"
                          value={invoiceForm.dueDate}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invoiceDescription">Description</Label>
                        <Textarea
                          id="invoiceDescription"
                          placeholder="Website redesign - Phase 1"
                          value={invoiceForm.description}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                          rows={3}
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsInvoiceDialogOpen(false)}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create & Send'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Recent invoices will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Messages</CardTitle>
                  <CardDescription>Send messages to clients</CardDescription>
                </div>
                <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]">
                      <Plus className="w-4 h-4 mr-2" />
                      New Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Message</DialogTitle>
                      <DialogDescription>
                        Send a message to a client
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSendMessage} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="messageClient">Client</Label>
                        <Select
                          value={messageForm.clientEmail}
                          onValueChange={(value) => setMessageForm({ ...messageForm, clientEmail: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.email}>
                                {client.name} ({client.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="messageSubject">Subject</Label>
                        <Input
                          id="messageSubject"
                          placeholder="Project Update"
                          value={messageForm.subject}
                          onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="messageContent">Message</Label>
                        <Textarea
                          id="messageContent"
                          placeholder="Your message here..."
                          value={messageForm.message}
                          onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                          rows={6}
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsMessageDialogOpen(false)}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Send Message'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Message history will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Files</CardTitle>
                  <CardDescription>Upload files for clients</CardDescription>
                </div>
                <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload File</DialogTitle>
                      <DialogDescription>
                        Upload a file and share with a client
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFileUpload} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fileClient">Client</Label>
                        <Select
                          value={fileUpload.clientEmail}
                          onValueChange={(value) => setFileUpload({ ...fileUpload, clientEmail: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.email}>
                                {client.name} ({client.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fileCategory">Category</Label>
                        <Select
                          value={fileUpload.category}
                          onValueChange={(value) => setFileUpload({ ...fileUpload, category: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="deliverable">Deliverable</SelectItem>
                            <SelectItem value="report">Report</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fileInput">File</Label>
                        <Input
                          id="fileInput"
                          type="file"
                          onChange={(e) => setFileUpload({ ...fileUpload, file: e.target.files[0] })}
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsFileDialogOpen(false)}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading || !fileUpload.file}
                          className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Upload & Share'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Uploaded files will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Clients</CardTitle>
                  <CardDescription>Manage client accounts</CardDescription>
                </div>
                <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Client</DialogTitle>
                      <DialogDescription>
                        Create a new client account
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateClient} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Full Name</Label>
                        <Input
                          id="clientName"
                          placeholder="John Doe"
                          value={clientForm.name}
                          onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">Email</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          placeholder="john@company.com"
                          value={clientForm.email}
                          onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientCompany">Company</Label>
                        <Input
                          id="clientCompany"
                          placeholder="Company Name"
                          value={clientForm.company}
                          onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsClientDialogOpen(false)}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Client'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {clients.length === 0 ? (
                  <p className="text-sm text-gray-500">No clients yet</p>
                ) : (
                  clients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-sm text-gray-500">{client.email}</p>
                        {client.company && (
                          <p className="text-xs text-gray-400">{client.company}</p>
                        )}
                      </div>
                      <Badge variant={client.accountSetup ? 'default' : 'outline'}>
                        {client.accountSetup ? 'Active' : 'Pending Setup'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blog Tab */}
        <TabsContent value="blog" className="space-y-4">
          <BlogManagement />
        </TabsContent>
      </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
