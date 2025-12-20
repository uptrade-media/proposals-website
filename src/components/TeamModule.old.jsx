/**
 * TeamModule - Unified Team & User Management Module
 * 
 * This module adapts based on context:
 * 
 * 1. UPTRADE ADMIN VIEW (no org context):
 *    - Full Uptrade team management (sales reps, managers, devs)
 *    - Assign team members to client projects
 *    - View all organizations' user lists
 * 
 * 2. ORGANIZATION VIEW (org context, admin or org-level user):
 *    - Manage organization users (org-level vs project-level access)
 *    - Invite new users to org or specific projects
 *    - If "team" feature enabled: Sales team capabilities
 * 
 * 3. PROJECT VIEW (project context):
 *    - View project team members
 *    - See assigned Uptrade employees
 *    - Invite users to this project (if org-level user)
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  UserPlus,
  Shield,
  Crown,
  Briefcase,
  Mail,
  Building2,
  FolderOpen,
  MoreHorizontal,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Loader2,
  Eye,
  UserCog,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'

// Access level configuration
const ACCESS_LEVELS = {
  organization: {
    label: 'Organization',
    description: 'Full access to all projects, billing, and proposals',
    icon: Building2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10'
  },
  project: {
    label: 'Project Only',
    description: 'Access limited to assigned projects',
    icon: FolderOpen,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10'
  }
}

// Role configuration for project members
const PROJECT_ROLES = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-400' },
  admin: { label: 'Admin', icon: Shield, color: 'text-purple-400' },
  member: { label: 'Member', icon: Users, color: 'text-blue-400' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-gray-400' },
  uptrade_assigned: { label: 'Uptrade Team', icon: Briefcase, color: 'text-green-400' }
}

// User row component
function UserRow({ user, currentUserId, onEdit, onRemove, showAccessLevel = true }) {
  const isCurrentUser = user.contact?.id === currentUserId
  const accessConfig = ACCESS_LEVELS[user.access_level] || ACCESS_LEVELS.project
  const AccessIcon = accessConfig.icon

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] transition-all group">
      {/* Avatar */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white font-semibold">
          {user.contact?.avatar ? (
            <img src={user.contact.avatar} alt={user.contact.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            user.contact?.name?.charAt(0)?.toUpperCase() || '?'
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[var(--text-primary)] truncate">{user.contact?.name || 'Unknown'}</p>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-xs">You</Badge>
          )}
        </div>
        <p className="text-sm text-[var(--text-tertiary)] truncate">{user.contact?.email}</p>
      </div>

      {/* Access Level Badge */}
      {showAccessLevel && (
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
          accessConfig.bgColor, accessConfig.color
        )}>
          <AccessIcon className="h-3.5 w-3.5" />
          {accessConfig.label}
        </div>
      )}

      {/* Role Badge */}
      <Badge variant="outline" className="capitalize">
        {user.role}
      </Badge>

      {/* Actions */}
      {!isCurrentUser && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit?.(user)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Access
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500"
              onClick={() => onRemove?.(user)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Remove User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// Project member row for project-level view
function ProjectMemberRow({ member, onRemove }) {
  const roleConfig = PROJECT_ROLES[member.role] || PROJECT_ROLES.member
  const RoleIcon = roleConfig.icon

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-[var(--glass-bg)]/50 border border-[var(--glass-border)]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white text-sm font-semibold">
        {member.contact?.avatar ? (
          <img src={member.contact.avatar} alt={member.contact.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          member.contact?.name?.charAt(0)?.toUpperCase() || '?'
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[var(--text-primary)] truncate">{member.contact?.name}</p>
        <p className="text-xs text-[var(--text-tertiary)] truncate">{member.contact?.email}</p>
      </div>
      <div className={cn("flex items-center gap-1 text-xs font-medium", roleConfig.color)}>
        <RoleIcon className="h-3.5 w-3.5" />
        {roleConfig.label}
      </div>
      {member.role !== 'uptrade_assigned' && member.role !== 'owner' && (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onRemove?.(member)}>
          <XCircle className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        </Button>
      )}
    </div>
  )
}

// Invite Dialog Component
function InviteUserDialog({ open, onOpenChange, organizationId, projects, onSuccess }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [accessLevel, setAccessLevel] = useState('organization')
  const [selectedProjects, setSelectedProjects] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!email) {
      toast.error('Email is required')
      return
    }

    if (accessLevel === 'project' && selectedProjects.length === 0) {
      toast.error('Please select at least one project')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/.netlify/functions/admin-org-members', {
        email,
        name,
        accessLevel,
        projectIds: accessLevel === 'project' ? selectedProjects : []
      }, {
        params: { organizationId }
      })

      toast.success(`Invitation sent to ${email}`)
      onSuccess?.()
      onOpenChange(false)
      setEmail('')
      setName('')
      setAccessLevel('organization')
      setSelectedProjects([])
    } catch (error) {
      console.error('Error inviting user:', error)
      toast.error(error.response?.data?.error || 'Failed to invite user')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Add a new user to your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Access Level</Label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-400" />
                    <span>Organization (Full Access)</span>
                  </div>
                </SelectItem>
                <SelectItem value="project">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-blue-400" />
                    <span>Project Only (Limited)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--text-tertiary)]">
              {accessLevel === 'organization'
                ? 'Can access all projects, billing, and proposals'
                : 'Can only access assigned projects'}
            </p>
          </div>

          {accessLevel === 'project' && projects?.length > 0 && (
            <div className="space-y-2">
              <Label>Assign to Projects</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                {projects.map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-[var(--glass-bg-hover)] cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProjects([...selectedProjects, project.id])
                        } else {
                          setSelectedProjects(selectedProjects.filter(id => id !== project.id))
                        }
                      }}
                    />
                    <span className="text-sm">{project.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Team Module Component
export default function TeamModule() {
  const { user, currentOrg, currentProject, isSuperAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState('users')
  const [members, setMembers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // Determine context
  const isUptradeAdmin = user?.role === 'admin' && !currentOrg
  const isOrgContext = !!currentOrg
  const isProjectContext = !!currentProject
  const organizationId = currentOrg?.id || currentProject?.organization_id

  // Fetch members based on context
  useEffect(() => {
    fetchMembers()
    if (organizationId) {
      fetchProjects()
    }
  }, [organizationId, currentProject?.id])

  const fetchMembers = async () => {
    if (!organizationId && !isUptradeAdmin) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      if (isProjectContext) {
        // Fetch project members
        const res = await api.get('/.netlify/functions/admin-project-members', {
          params: { projectId: currentProject.id }
        })
        setMembers(res.data.members || [])
      } else if (organizationId) {
        // Fetch org members
        const res = await api.get('/.netlify/functions/admin-org-members', {
          params: { organizationId }
        })
        setMembers(res.data.members || [])
      } else if (isUptradeAdmin) {
        // Fetch Uptrade team members (existing team endpoint)
        const res = await api.get('/.netlify/functions/team-list')
        setMembers(res.data.team || [])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      // api module automatically includes X-Organization-Id header
      const res = await api.get('/.netlify/functions/projects-list')
      setProjects(res.data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleRemoveUser = async (member) => {
    if (!confirm(`Remove ${member.contact?.name || member.contact?.email} from the organization?`)) {
      return
    }

    try {
      if (isProjectContext) {
        await api.delete('/.netlify/functions/admin-project-members', {
          params: { projectId: currentProject.id, contactId: member.contact?.id }
        })
      } else {
        await api.delete('/.netlify/functions/admin-org-members', {
          params: { organizationId, contactId: member.contact?.id }
        })
      }
      toast.success('User removed')
      fetchMembers()
    } catch (error) {
      console.error('Error removing user:', error)
      toast.error('Failed to remove user')
    }
  }

  // Render title based on context
  const getTitle = () => {
    if (isUptradeAdmin) return 'Uptrade Team'
    if (isProjectContext) return `${currentProject.title} Team`
    if (isOrgContext) return 'Users'
    return 'Team'
  }

  const getDescription = () => {
    if (isUptradeAdmin) return 'Manage Uptrade Media team members and their assignments'
    if (isProjectContext) return 'View team members and Uptrade contacts for this project'
    if (isOrgContext) return 'Manage who has access to your organization and projects'
    return 'Manage team access and permissions'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{getTitle()}</h1>
          <p className="text-[var(--text-secondary)]">{getDescription()}</p>
        </div>

        {/* Invite button - only for org-level users or admins */}
        {(isUptradeAdmin || (isOrgContext && user?.accessLevel !== 'project')) && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {isUptradeAdmin ? 'Add Team Member' : 'Invite User'}
          </Button>
        )}
      </div>

      {/* Tabs for different views */}
      {isOrgContext && !isProjectContext && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              All Users
            </TabsTrigger>
            <TabsTrigger value="projects">
              <FolderOpen className="h-4 w-4 mr-2" />
              By Project
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              </div>
            ) : members.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                  <p className="text-[var(--text-secondary)]">No users yet</p>
                  <Button className="mt-4" onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite First User
                  </Button>
                </CardContent>
              </Card>
            ) : (
              members.map((member) => (
                <UserRow
                  key={member.id}
                  user={member}
                  currentUserId={user?.id}
                  onRemove={handleRemoveUser}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-4 space-y-4">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {members
                      .filter(m => m.projectMemberships?.some(pm => pm.project?.id === project.id))
                      .map((member) => (
                        <ProjectMemberRow
                          key={member.id}
                          member={{
                            ...member,
                            role: member.projectMemberships?.find(pm => pm.project?.id === project.id)?.role || 'member'
                          }}
                          onRemove={handleRemoveUser}
                        />
                      ))}
                    {!members.some(m => m.projectMemberships?.some(pm => pm.project?.id === project.id)) && (
                      <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                        No project-specific members (org-level users have access)
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Project context - simpler view */}
      {isProjectContext && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : (
            <>
              {/* Uptrade Team */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[var(--text-secondary)]">Uptrade Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {members
                    .filter(m => m.role === 'uptrade_assigned')
                    .map((member) => (
                      <ProjectMemberRow key={member.id} member={member} />
                    ))}
                  {!members.some(m => m.role === 'uptrade_assigned') && (
                    <p className="text-sm text-[var(--text-tertiary)]">No Uptrade team member assigned</p>
                  )}
                </CardContent>
              </Card>

              {/* Project Team */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[var(--text-secondary)]">Project Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {members
                    .filter(m => m.role !== 'uptrade_assigned')
                    .map((member) => (
                      <ProjectMemberRow
                        key={member.id}
                        member={member}
                        onRemove={handleRemoveUser}
                      />
                    ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Uptrade admin - show full team management */}
      {isUptradeAdmin && !isOrgContext && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : (
            members.map((member) => (
              <UserRow
                key={member.id}
                user={{
                  ...member,
                  contact: member,
                  role: member.teamRole || member.role,
                  access_level: 'organization'
                }}
                currentUserId={user?.id}
                showAccessLevel={false}
              />
            ))
          )}
        </div>
      )}

      {/* Invite Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        organizationId={organizationId}
        projects={projects}
        onSuccess={fetchMembers}
      />
    </div>
  )
}
