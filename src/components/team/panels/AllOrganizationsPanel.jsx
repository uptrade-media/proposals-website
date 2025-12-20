/**
 * AllOrganizationsPanel - Admin view for managing all organizations and their users
 * 
 * Features:
 * - List all organizations with user counts
 * - Expand to see projects and users per organization
 * - Quick invite users to org or specific project
 * - Search and filter organizations
 */
import { useState, useEffect } from 'react'
import { 
  Building2, 
  Users, 
  UserPlus, 
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  ExternalLink,
  FolderOpen,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import axios from 'axios'
import { getSession } from '@/lib/supabase-auth'
import InviteUserDialog from '../dialogs/InviteUserDialog'

export default function AllOrganizationsPanel() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOrg, setExpandedOrg] = useState(null)
  const [orgMembers, setOrgMembers] = useState({})
  const [loadingMembers, setLoadingMembers] = useState({})
  const [expandedTab, setExpandedTab] = useState('projects') // 'projects' or 'users'
  
  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteOrgId, setInviteOrgId] = useState(null)
  const [inviteOrgName, setInviteOrgName] = useState('')
  const [inviteOrgProjects, setInviteOrgProjects] = useState([])
  const [isInviting, setIsInviting] = useState(false)

  // Fetch all organizations on mount
  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await getSession()
      const response = await axios.get('/.netlify/functions/admin-tenants-list', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      setOrganizations(response.data.organizations || [])
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrgMembers = async (orgId) => {
    if (orgMembers[orgId]) return // Already loaded
    
    setLoadingMembers(prev => ({ ...prev, [orgId]: true }))
    try {
      const response = await axios.get('/.netlify/functions/admin-org-members', {
        params: { organizationId: orgId }
      })
      setOrgMembers(prev => ({
        ...prev,
        [orgId]: response.data.members || []
      }))
    } catch (error) {
      console.error('Failed to fetch org members:', error)
      toast.error('Failed to load organization members')
    } finally {
      setLoadingMembers(prev => ({ ...prev, [orgId]: false }))
    }
  }

  // Get projects for an org directly from the organizations state (already nested)
  const getOrgProjects = (orgId) => {
    const org = organizations.find(o => o.id === orgId)
    return org?.projects || []
  }

  const handleExpandOrg = async (orgId) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null)
    } else {
      setExpandedOrg(orgId)
      setExpandedTab('projects') // Default to projects tab
      // Projects are already nested in the org, just fetch members
      await fetchOrgMembers(orgId)
    }
  }

  const handleInviteClick = async (org) => {
    setInviteOrgId(org.id)
    setInviteOrgName(org.name)
    // Use nested projects from the org directly
    setInviteOrgProjects(org.projects || [])
    setShowInviteDialog(true)
  }

  const handleInviteSubmit = async (formData) => {
    setIsInviting(true)
    try {
      await axios.post('/.netlify/functions/admin-org-members', {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        accessLevel: formData.accessLevel,
        projectIds: formData.projectIds || []
      }, {
        params: { organizationId: inviteOrgId }
      })
      
      toast.success(`Invite sent to ${formData.email}`)
      setShowInviteDialog(false)
      
      // Refresh members for this org
      setOrgMembers(prev => ({ ...prev, [inviteOrgId]: undefined }))
      if (expandedOrg === inviteOrgId) {
        await fetchOrgMembers(inviteOrgId)
      }
      
      // Refresh org list to update counts
      await fetchOrganizations()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send invite')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (orgId, contactId, memberName) => {
    if (!confirm(`Remove ${memberName} from this organization?`)) return
    
    try {
      await axios.delete('/.netlify/functions/admin-org-members', {
        params: { organizationId: orgId, contactId }
      })
      
      toast.success('User removed from organization')
      
      // Refresh members
      setOrgMembers(prev => ({
        ...prev,
        [orgId]: prev[orgId]?.filter(m => m.contact?.id !== contactId)
      }))
      
      // Refresh org list to update counts
      await fetchOrganizations()
    } catch (error) {
      toast.error('Failed to remove user')
    }
  }

  // Filter organizations by search
  const filteredOrgs = organizations.filter(org => 
    !searchQuery || 
    org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Organizations</h2>
          <p className="text-[var(--text-secondary)]">
            Manage users across all client organizations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 bg-[var(--glass-bg)] border-[var(--glass-border)]"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{organizations.length}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Organizations</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)]">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {organizations.reduce((sum, org) => sum + (org.userCount || 0), 0)}
              </p>
              <p className="text-sm text-[var(--text-tertiary)]">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {organizations.reduce((sum, org) => sum + (org.projects?.length || 0), 0)}
              </p>
              <p className="text-sm text-[var(--text-tertiary)]">Total Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {organizations.reduce((sum, org) => sum + (org.projects?.filter(p => p.is_tenant).length || 0), 0)}
              </p>
              <p className="text-sm text-[var(--text-tertiary)]">Web Apps</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <div className="space-y-3">
        {filteredOrgs.length === 0 ? (
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
              <p className="text-[var(--text-secondary)]">
                {searchQuery ? 'No organizations match your search' : 'No organizations yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrgs.map((org) => (
            <Card 
              key={org.id} 
              className="bg-[var(--glass-bg)] border-[var(--glass-border)] overflow-hidden"
            >
              {/* Organization Header Row */}
              <div 
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--glass-bg-hover)] transition-colors"
                onClick={() => handleExpandOrg(org.id)}
              >
                {/* Expand Arrow */}
                <div className="text-[var(--text-tertiary)]">
                  {expandedOrg === org.id ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
                
                {/* Org Icon */}
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                </div>
                
                {/* Org Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--text-primary)] truncate">
                      {org.name}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {org.plan || 'free'}
                    </Badge>
                    {org.status === 'active' ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {org.status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
                    <span>{org.slug}</span>
                    {org.domain && (
                      <>
                        <span>•</span>
                        <a 
                          href={`https://${org.domain}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-[var(--brand-primary)] flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {org.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Project Count */}
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <FolderOpen className="h-4 w-4" />
                  <span className="font-medium">{org.projects?.length || 0}</span>
                  <span className="text-[var(--text-tertiary)]">projects</span>
                </div>
                
                {/* User Count */}
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{org.userCount || 0}</span>
                  <span className="text-[var(--text-tertiary)]">users</span>
                </div>
                
                {/* Actions */}
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleInviteClick(org)
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Invite
                </Button>
              </div>
              
              {/* Expanded Content - Projects & Users Tabs */}
              {expandedOrg === org.id && (
                <div className="border-t border-[var(--glass-border)] bg-black/20">
                  <Tabs value={expandedTab} onValueChange={setExpandedTab} className="w-full">
                    <div className="border-b border-[var(--glass-border)] px-4 pt-2">
                      <TabsList className="bg-transparent">
                        <TabsTrigger value="projects" className="gap-2 data-[state=active]:bg-[var(--glass-bg)]">
                          <FolderOpen className="h-4 w-4" />
                          Projects ({org.projects?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-[var(--glass-bg)]">
                          <Users className="h-4 w-4" />
                          Users ({orgMembers[org.id]?.length || 0})
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    
                    {/* Projects Tab */}
                    <TabsContent value="projects" className="mt-0">
                      {!org.projects || org.projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <FolderOpen className="h-8 w-8 text-[var(--text-tertiary)] mb-2" />
                          <p className="text-sm text-[var(--text-secondary)]">No projects in this organization</p>
                        </div>
                      ) : (
                        <div className="p-4 space-y-2">
                          {org.projects.map((project) => (
                            <div 
                              key={project.id}
                              className="flex items-center gap-4 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                            >
                              {/* Project Icon */}
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                project.is_tenant 
                                  ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30'
                                  : 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30'
                              }`}>
                                {project.is_tenant ? (
                                  <Globe className="h-5 w-5 text-emerald-400" />
                                ) : (
                                  <FolderOpen className="h-5 w-5 text-blue-400" />
                                )}
                              </div>
                              
                              {/* Project Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-[var(--text-primary)] truncate">
                                    {project.name || project.title}
                                  </p>
                                  {project.is_tenant && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                      Web App
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                                  {project.tenant_domain && (
                                    <a 
                                      href={`https://${project.tenant_domain}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="hover:text-[var(--brand-primary)] flex items-center gap-1"
                                    >
                                      <Globe className="h-3 w-3" />
                                      {project.tenant_domain}
                                    </a>
                                  )}
                                  {project.status && (
                                    <Badge variant="outline" className="text-xs">
                                      {project.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Project Features */}
                              {project.tenant_features && Array.isArray(project.tenant_features) && project.tenant_features.length > 0 && (
                                <div className="flex gap-1">
                                  {project.tenant_features.slice(0, 3).map((feature) => (
                                    <Badge key={feature} variant="secondary" className="text-xs">
                                      {feature}
                                    </Badge>
                                  ))}
                                  {project.tenant_features.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{project.tenant_features.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              {/* Invite to Project */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setInviteOrgId(org.id)
                                  setInviteOrgName(org.name)
                                  setInviteOrgProjects([project]) // Pre-select this project
                                  setShowInviteDialog(true)
                                }}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Invite
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    {/* Users Tab */}
                    <TabsContent value="users" className="mt-0">
                  {loadingMembers[org.id] ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
                    </div>
                  ) : !orgMembers[org.id] || orgMembers[org.id].length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Users className="h-8 w-8 text-[var(--text-tertiary)] mb-2" />
                      <p className="text-sm text-[var(--text-secondary)]">No users in this organization</p>
                      <Button 
                        size="sm" 
                        className="mt-3"
                        onClick={() => handleInviteClick(org)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Invite First User
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {orgMembers[org.id].map((member) => (
                        <div 
                          key={member.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                        >
                          {/* Avatar */}
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white font-semibold">
                            {member.contact?.name?.charAt(0)?.toUpperCase() || 
                             member.contact?.email?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {member.contact?.name || member.contact?.email || 'Unknown'}
                            </p>
                            <p className="text-sm text-[var(--text-tertiary)] truncate">
                              {member.contact?.email}
                            </p>
                          </div>
                          
                          {/* Badges */}
                          <Badge 
                            variant="outline" 
                            className={
                              member.access_level === 'organization' 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }
                          >
                            {member.access_level === 'organization' ? 'Organization' : 'Project'}
                          </Badge>
                          <Badge variant="outline">
                            {member.role || 'member'}
                          </Badge>
                          
                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleRemoveMember(
                              org.id, 
                              member.contact?.id,
                              member.contact?.name || member.contact?.email
                            )}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Invite Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onSubmit={handleInviteSubmit}
        projects={inviteOrgProjects}
        organizationName={inviteOrgName}
        isLoading={isInviting}
      />
    </div>
  )
}
