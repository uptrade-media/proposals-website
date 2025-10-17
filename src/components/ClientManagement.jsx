import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  Edit,
  Loader2,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Phone,
  FileText,
  Tag,
  History,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'

export default function ClientManagement() {
  const { user } = useAuthStore()
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [subscriptionFilter, setSubscriptionFilter] = useState('all') // all, subscribed, unsubscribed
  
  // Add client dialog
  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [isAddingClient, setIsAddingClient] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    website: '',
    source: ''
  })
  
  // Edit client dialog
  const [isEditClientOpen, setIsEditClientOpen] = useState(false)
  const [isEditingClient, setIsEditingClient] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Activity log
  const [activityLog, setActivityLog] = useState([])
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  
  // Subscription toggle
  const [isTogglingSubscription, setIsTogglingSubscription] = useState(null)
  
  // Add note dialog
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [noteText, setNoteText] = useState('')

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <XCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="font-semibold">Access Denied</p>
              <p className="text-sm text-gray-600 mt-2">Admin privileges required.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    fetchClients()
  }, [subscriptionFilter, searchQuery])

  const fetchClients = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (subscriptionFilter !== 'all') {
        params.append('subscribed', subscriptionFilter === 'subscribed' ? 'true' : 'false')
      }
      
      const response = await api.get(`/.netlify/functions/clients-list?${params.toString()}`)
      setClients(response.data.clients || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
      toast.error('Failed to load clients')
      setClients([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchActivityLog = async (clientId) => {
    setIsLoadingActivity(true)
    try {
      const response = await api.get(`/.netlify/functions/clients-activity-log?clientId=${clientId}&limit=20`)
      setActivityLog(response.data.activity || [])
    } catch (err) {
      console.error('Failed to fetch activity log:', err)
      toast.error('Failed to load activity log')
      setActivityLog([])
    } finally {
      setIsLoadingActivity(false)
    }
  }

  const handleAddClient = async (e) => {
    e.preventDefault()
    
    if (!newClient.name.trim() || !newClient.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    setIsAddingClient(true)
    try {
      await api.post('/.netlify/functions/admin-clients-create', newClient)
      toast.success('Client added successfully')
      setNewClient({ name: '', email: '', company: '', phone: '', source: '' })
      setIsAddClientOpen(false)
      fetchClients()
    } catch (err) {
      console.error('Failed to add client:', err)
      toast.error(err.response?.data?.error || 'Failed to add client')
    } finally {
      setIsAddingClient(false)
    }
  }

  const handleEditClient = async (e) => {
    e.preventDefault()
    
    if (!editingClient.name.trim() || !editingClient.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    setIsEditingClient(true)
    try {
      await api.put(`/.netlify/functions/clients-update`, {
        id: editingClient.id,
        name: editingClient.name,
        email: editingClient.email,
        company: editingClient.company,
        phone: editingClient.phone,
        source: editingClient.source,
        notes: editingClient.notes,
        tags: editingClient.tags
      })
      toast.success('Client updated successfully')
      setIsEditClientOpen(false)
      fetchClients()
      if (selectedClient?.id === editingClient.id) {
        setSelectedClient(editingClient)
      }
    } catch (err) {
      console.error('Failed to update client:', err)
      toast.error(err.response?.data?.error || 'Failed to update client')
    } finally {
      setIsEditingClient(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!clientToDelete) return
    
    setIsDeleting(true)
    try {
      await api.delete(`/.netlify/functions/clients-delete`, {
        data: { id: clientToDelete.id }
      })
      toast.success('Client archived successfully')
      setDeleteConfirmOpen(false)
      setClientToDelete(null)
      if (selectedClient?.id === clientToDelete.id) {
        setSelectedClient(null)
      }
      fetchClients()
    } catch (err) {
      console.error('Failed to archive client:', err)
      toast.error(err.response?.data?.error || 'Failed to archive client')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleSubscription = async (client) => {
    setIsTogglingSubscription(client.id)
    try {
      const newStatus = !client.subscribed
      await api.post(`/.netlify/functions/clients-subscribe-toggle`, {
        id: client.id,
        subscribed: newStatus
      })
      toast.success(`Client ${newStatus ? 'subscribed' : 'unsubscribed'} successfully`)
      
      // Update local state
      setClients(clients.map(c => 
        c.id === client.id ? { ...c, subscribed: newStatus } : c
      ))
      
      if (selectedClient?.id === client.id) {
        setSelectedClient({ ...selectedClient, subscribed: newStatus })
      }
    } catch (err) {
      console.error('Failed to toggle subscription:', err)
      toast.error(err.response?.data?.error || 'Failed to toggle subscription')
    } finally {
      setIsTogglingSubscription(null)
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    
    if (!noteText.trim()) {
      toast.error('Note cannot be empty')
      return
    }

    setIsAddingNote(true)
    try {
      await api.post(`/.netlify/functions/clients-add-note`, {
        clientId: selectedClient.id,
        note: noteText
      })
      toast.success('Note added successfully')
      setNoteText('')
      setIsAddNoteOpen(false)
      
      // Refresh client data
      const response = await api.get(`/.netlify/functions/clients-get?id=${selectedClient.id}`)
      setSelectedClient(response.data.client)
      fetchActivityLog(selectedClient.id)
    } catch (err) {
      console.error('Failed to add note:', err)
      toast.error(err.response?.data?.error || 'Failed to add note')
    } finally {
      setIsAddingNote(false)
    }
  }

  const openClientDetails = async (client) => {
    setSelectedClient(client)
    await fetchActivityLog(client.id)
  }

  const filteredClients = clients.filter(client => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      return (
        client.name?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search) ||
        client.company?.toLowerCase().includes(search)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-gray-600 mt-1">Manage contacts, subscriptions, and CRM data</p>
        </div>
        <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Create a new client contact</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={newClient.company}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={newClient.website}
                  onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={newClient.source} onValueChange={(value) => setNewClient({ ...newClient, source: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="How did they find us?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddClientOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingClient}>
                  {isAddingClient && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Client
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Subscription status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="subscribed">Subscribed</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Clients List */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Clients ({filteredClients.length})</CardTitle>
              <CardDescription>Showing {filteredClients.length} of {clients.length} total</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : filteredClients.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No clients found"
                  description="Add your first client to get started"
                />
              ) : (
                <div className="space-y-2">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => openClientDetails(client)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedClient?.id === client.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{client.name}</h3>
                            {client.subscribed ? (
                              <Badge className="bg-green-100 text-green-800">Subscribed</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">Unsubscribed</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{client.email}</p>
                          {client.company && (
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <Building2 className="h-3 w-3" />
                              {client.company}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>{new Date(client.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Client Details Panel */}
        <div>
          {selectedClient ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="edit">Edit</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedClient.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-mono text-sm">{selectedClient.email}</p>
                    </div>
                    {selectedClient.phone && (
                      <div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Phone
                        </p>
                        <p className="text-sm">{selectedClient.phone}</p>
                      </div>
                    )}
                    {selectedClient.company && (
                      <div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Company
                        </p>
                        <p className="text-sm">{selectedClient.company}</p>
                      </div>
                    )}
                    {selectedClient.website && (
                      <div>
                        <p className="text-sm text-gray-600">Website</p>
                        <a 
                          href={selectedClient.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {selectedClient.website}
                        </a>
                      </div>
                    )}
                    {selectedClient.source && (
                      <div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Source
                        </p>
                        <p className="text-sm capitalize">{selectedClient.source}</p>
                      </div>
                    )}
                    
                    {/* Subscription Toggle */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">Newsletter</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleSubscription(selectedClient)}
                          disabled={isTogglingSubscription === selectedClient.id}
                        >
                          {isTogglingSubscription === selectedClient.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : selectedClient.subscribed ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedClient.subscribed ? 'Subscribed' : 'Unsubscribed'}
                      </p>
                    </div>

                    {/* Notes */}
                    {selectedClient.notes && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Notes
                        </p>
                        <p className="text-sm mt-2 p-2 bg-gray-100 rounded whitespace-pre-wrap">
                          {selectedClient.notes}
                        </p>
                      </div>
                    )}

                    <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full mt-4" variant="outline" size="sm">
                          {selectedClient.notes ? 'Update Note' : 'Add Note'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Internal Note</DialogTitle>
                          <DialogDescription>Add a note for your team</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddNote} className="space-y-4">
                          <Textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add your note here..."
                            className="min-h-24"
                          />
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddNoteOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isAddingNote}>
                              {isAddingNote && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Save Note
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingClient(selectedClient)
                          setIsEditClientOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setClientToDelete(selectedClient)
                          setDeleteConfirmOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Activity Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingActivity ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : activityLog.length === 0 ? (
                      <p className="text-sm text-gray-500">No activity yet</p>
                    ) : (
                      <div className="space-y-3">
                        {activityLog.map((activity) => (
                          <div key={activity.id} className="pb-3 border-b last:border-b-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {activity.activity_type.replace(/_/g, ' ')}
                                </p>
                                {activity.description && (
                                  <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {new Date(activity.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Edit Tab */}
              <TabsContent value="edit">
                {editingClient && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Edit Client</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleEditClient} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Name</Label>
                          <Input
                            id="edit-name"
                            value={editingClient.name || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={editingClient.email || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-company">Company</Label>
                          <Input
                            id="edit-company"
                            value={editingClient.company || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-phone">Phone</Label>
                          <Input
                            id="edit-phone"
                            value={editingClient.phone || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-website">Website</Label>
                          <Input
                            id="edit-website"
                            type="url"
                            value={editingClient.website || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, website: e.target.value })}
                            placeholder="https://example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-source">Source</Label>
                          <Select 
                            value={editingClient.source || ''} 
                            onValueChange={(value) => setEditingClient({ ...editingClient, source: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              <SelectItem value="website">Website</SelectItem>
                              <SelectItem value="referral">Referral</SelectItem>
                              <SelectItem value="inbound">Inbound</SelectItem>
                              <SelectItem value="outreach">Outreach</SelectItem>
                              <SelectItem value="event">Event</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-notes">Notes</Label>
                          <Textarea
                            id="edit-notes"
                            value={editingClient.notes || ''}
                            onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                            placeholder="Internal notes"
                            className="min-h-20"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setIsEditClientOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isEditingClient}>
                            {isEditingClient && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Select a client to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Archive Client"
        description={`Are you sure you want to archive ${clientToDelete?.name}? This action cannot be undone.`}
        onConfirm={handleDeleteClient}
        isLoading={isDeleting}
        isDangerous
      />

      {/* Edit Client Dialog */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information</DialogDescription>
          </DialogHeader>
          {editingClient && (
            <form onSubmit={handleEditClient} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dialog-name">Name</Label>
                <Input
                  id="edit-dialog-name"
                  value={editingClient.name || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dialog-email">Email</Label>
                <Input
                  id="edit-dialog-email"
                  type="email"
                  value={editingClient.email || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dialog-company">Company</Label>
                <Input
                  id="edit-dialog-company"
                  value={editingClient.company || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dialog-phone">Phone</Label>
                <Input
                  id="edit-dialog-phone"
                  value={editingClient.phone || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditClientOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditingClient}>
                  {isEditingClient && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
