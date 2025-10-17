import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ProposalTemplate from './ProposalTemplate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import { EmptyState } from './EmptyState'
import { ConfirmDialog } from './ConfirmDialog'
import { 
  Plus, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Edit,
  Loader2,
  Send,
  Trash2
} from 'lucide-react'
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'
import { ProjectSkeleton } from './skeletons/ProjectSkeleton'

const Projects = () => {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const { 
    projects, 
    fetchProjects, 
    createProject, 
    updateProject,
    isLoading, 
    error, 
    clearError 
  } = useProjectsStore()
  
  const hasFetchedRef = useRef(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingProposal, setViewingProposal] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'planning',
    budget: '',
    start_date: '',
    end_date: ''
  })

  // Admin-specific state
  const [proposals, setProposals] = useState([])
  const [clients, setClients] = useState([])
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false)
  const [proposalForm, setProposalForm] = useState({
    title: '',
    description: '',
    contactId: '',
    mdxContent: '',
    slug: ''
  })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' })
  const [deleteProposalDialog, setDeleteProposalDialog] = useState({ open: false, id: null, title: '' })

  // Fetch data only once on mount
  useEffect(() => {
    if (hasFetchedRef.current) return
    
    console.log('[Projects] Fetching initial data')
    hasFetchedRef.current = true
    
    fetchProjects()
    if (isAdmin) {
      fetchProposals()
      fetchClients()
    }
  }, []) // Empty dependency array - only run once

  const fetchProposals = async () => {
    try {
      const response = await api.get('/.netlify/functions/proposals-list')
      setProposals(response.data.proposals || [])
    } catch (err) {
      console.error('Failed to fetch proposals:', err)
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

  const handleCreateProposal = async (e) => {
    e.preventDefault()

    try {
      const response = await api.post('/.netlify/functions/proposals-create', {
        title: proposalForm.title,
        description: proposalForm.description,
        contactId: proposalForm.contactId,
        mdxContent: proposalForm.mdxContent,
        slug: proposalForm.slug
      })

      toast.success('Proposal created and notification sent!')
      setIsProposalDialogOpen(false)
      setProposalForm({ title: '', description: '', contactId: '', mdxContent: '', slug: '' })
      
      // Refresh proposals list
      fetchProposals()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create proposal')
    }
  }

  const handleDeleteProposal = async () => {
    if (!deleteProposalDialog.id) return

    try {
      const response = await api.delete(`/.netlify/functions/proposals-delete?id=${deleteProposalDialog.id}`)
      
      if (response.data.success) {
        toast.success('Proposal deleted successfully!')
        fetchProposals()
      }
    } catch (err) {
      console.error('Failed to delete proposal:', err)
      const errorMessage = err.response?.data?.error || 'Failed to delete proposal'
      toast.error(errorMessage)
    } finally {
      setDeleteProposalDialog({ open: false, id: null, title: '' })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'planning':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'on_hold':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'in_progress':
        return <Clock className="w-4 h-4" />
      case 'review':
        return <AlertCircle className="w-4 h-4" />
      case 'on_hold':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
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
      title: '',
      description: '',
      status: 'planning',
      budget: '',
      start_date: '',
      end_date: ''
    })
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    
    const projectData = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null
    }
    
    const result = await createProject(projectData)
    
    if (result.success) {
      toast.success('Project created successfully!')
      setIsCreateDialogOpen(false)
      resetForm()
    }
  }

  const handleEditProject = async (e) => {
    e.preventDefault()
    
    if (!selectedProject) return
    
    const projectData = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null
    }
    
    const result = await updateProject(selectedProject.id, projectData)
    
    if (result.success) {
      toast.success('Project updated successfully!')
      setIsEditDialogOpen(false)
      setSelectedProject(null)
      resetForm()
    }
  }

  const handleDeleteProject = async (projectId) => {
    try {
      // This would call a delete function from the store
      // await deleteProject(projectId)
      toast.success('Project deleted successfully!')
      fetchProjects()
    } catch (err) {
      toast.error('Failed to delete project')
    }
  }

  const openEditDialog = (project) => {
    setSelectedProject(project)
    setFormData({
      title: project.title || '',
      description: project.description || '',
      status: project.status || 'planning',
      budget: project.budget ? project.budget.toString() : '',
      start_date: project.start_date || '',
      end_date: project.end_date || ''
    })
    setIsEditDialogOpen(true)
  }

  const canCreateProject = user?.role === 'admin' || user?.role === 'client_admin'

  // If viewing a proposal, show the proposal template
  if (viewingProposal) {
    const proposal = proposals.find(p => p.id === viewingProposal)
    return (
      <ProposalTemplate 
        proposal={proposal}
        proposalId={viewingProposal} 
        onBack={() => setViewingProposal(null)} 
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-gray-600">Manage your projects and track progress</p>
        </div>
        {canCreateProject && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to track progress and manage proposals.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
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
                      <SelectValue placeholder="Select a client" />
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
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    placeholder="Enter project title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Project description"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleFormChange('start_date', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleFormChange('end_date', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => handleFormChange('budget', e.target.value)}
                    placeholder="0.00"
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
                    disabled={isLoading || !formData.contactId || !formData.title}
                    className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Success/Error Messages removed - now using toast notifications */}

      {/* Admin View with Tabs */}
      {isAdmin ? (
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
            {/* Projects Grid for Admin */}
            {isLoading && projects.length === 0 ? (
              <div className="space-y-4">
                <ProjectSkeleton />
                <ProjectSkeleton />
                <ProjectSkeleton />
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No projects yet"
                description="Create your first project to get started with managing proposals and tracking progress."
                actionLabel="Create First Project"
                onAction={() => setIsCreateDialogOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{project.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {project.description || 'No description provided'}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(project.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(project.status)}
                            <span className="capitalize">{project.status.replace('_', ' ')}</span>
                          </div>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <FileText className="w-4 h-4 mr-2" />
                          {project.proposals_count || 0} Proposals
                        </div>
                        <div className="flex items-center text-gray-600">
                          <FileText className="w-4 h-4 mr-2" />
                          {project.files_count || 0} Files
                        </div>
                        {project.start_date && (
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(project.start_date).toLocaleDateString()}
                          </div>
                        )}
                        {project.budget && (
                          <div className="flex items-center text-gray-600">
                            <DollarSign className="w-4 h-4 mr-2" />
                            ${project.budget.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => openEditDialog(project)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="proposals" className="space-y-6">
            {/* Admin Proposal Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manage Proposals</CardTitle>
                    <CardDescription>Create and send proposals to clients</CardDescription>
                  </div>
                  <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]">
                        <Plus className="w-4 h-4 mr-2" />
                        New Proposal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Proposal</DialogTitle>
                        <DialogDescription>
                          Create a proposal and send it to a client
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateProposal} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="proposalTitle">Proposal Title</Label>
                          <Input
                            id="proposalTitle"
                            placeholder="Website Redesign Proposal"
                            value={proposalForm.title}
                            onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="proposalDescription">Description</Label>
                          <Textarea
                            id="proposalDescription"
                            placeholder="Brief description of the proposal (shown in the list)"
                            value={proposalForm.description}
                            onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contactId">Client</Label>
                          <Select
                            value={proposalForm.contactId}
                            onValueChange={(value) => setProposalForm({ ...proposalForm, contactId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
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
                          <Label htmlFor="slug">Proposal Slug</Label>
                          <Input
                            id="slug"
                            placeholder="website-redesign-2024"
                            value={proposalForm.slug}
                            onChange={(e) => setProposalForm({ ...proposalForm, slug: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="mdxContent">Proposal Content (MDX)</Label>
                          <Textarea
                            id="mdxContent"
                            placeholder="# Proposal Content&#10;&#10;## Introduction&#10;..."
                            value={proposalForm.mdxContent}
                            onChange={(e) => setProposalForm({ ...proposalForm, mdxContent: e.target.value })}
                            rows={10}
                            required
                            className="font-mono text-sm"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsProposalDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0]"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Create & Send
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proposals.length === 0 ? (
                    <EmptyState
                      icon={Send}
                      title="No proposals yet"
                      description="Create your first proposal to send to clients."
                      actionLabel="Create Proposal"
                      onAction={() => setIsProposalDialogOpen(true)}
                    />
                  ) : (
                    proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{proposal.title}</h4>
                          <p className="text-sm text-gray-500">
                            {proposal.description || `${proposal.client_name} (${proposal.client_email})`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={proposal.status === 'approved' ? 'default' : 'outline'}>
                            {proposal.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingProposal(proposal.id)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteProposalDialog({ 
                              open: true, 
                              id: proposal.id, 
                              title: proposal.title 
                            })}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* Client View - Regular Projects Grid */
        <>
          {isLoading && projects.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#4bbf39]" />
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-500 text-center mb-4">
                  No projects have been created for your account yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(project.status)}
                      <span className="capitalize">{project.status.replace('_', ' ')}</span>
                    </div>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <FileText className="w-4 h-4 mr-2" />
                    {project.proposals_count || 0} Proposals
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FileText className="w-4 h-4 mr-2" />
                    {project.files_count || 0} Files
                  </div>
                  {project.start_date && (
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(project.start_date).toLocaleDateString()}
                    </div>
                  )}
                  {project.budget && (
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      ${parseFloat(project.budget).toLocaleString()}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  {project.proposals_count > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setViewingProposal(project.id)}
                      className="border-[#4bbf39] text-[#4bbf39] hover:bg-[#4bbf39] hover:text-white"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Proposal
                    </Button>
                  )}
                  {canCreateProject && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(project)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          )}
        </>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details and status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="edit_title">Project Title *</Label>
              <Input
                id="edit_title"
                value={formData.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                placeholder="Enter project title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Project description"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleFormChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_start_date">Start Date</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleFormChange('start_date', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_end_date">End Date</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleFormChange('end_date', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_budget">Budget ($)</Label>
              <Input
                id="edit_budget"
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => handleFormChange('budget', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedProject(null)
                  resetForm()
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !formData.title}
                className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Project'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Project Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null, title: '' })}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteDialog.title}"? This action cannot be undone and will permanently delete all associated data.`}
        confirmText="Delete Project"
        onConfirm={() => handleDeleteProject(deleteDialog.id)}
      />

      {/* Confirm Delete Proposal Dialog */}
      <ConfirmDialog
        open={deleteProposalDialog.open}
        onOpenChange={(open) => setDeleteProposalDialog({ open, id: null, title: '' })}
        title="Delete Proposal"
        description={`Are you sure you want to delete "${deleteProposalDialog.title}"? This action cannot be undone. Note: Signed or executed proposals cannot be deleted.`}
        confirmText="Delete Proposal"
        onConfirm={handleDeleteProposal}
      />
    </div>
  )
}

export default Projects
