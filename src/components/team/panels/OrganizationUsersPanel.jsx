/**
 * OrganizationUsersPanel - View and manage organization team
 * 
 * Features:
 * - View all organization members + assigned Uptrade contacts
 * - Add users with org or project level access (if canManage)
 * - Edit user access levels and project assignments (if canManage)
 * - Send messages to team members
 * - Remove users from organization (if canManage)
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  UserPlus, 
  Loader2,
  Building2,
  FolderOpen,
  MessageSquare,
  Headphones
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import useTeamStore from '../store'
import useAuthStore from '@/lib/auth-store'
import UserCard from '../cards/UserCard'
import ProjectMemberCard from '../cards/ProjectMemberCard'
import InviteUserDialog from '../dialogs/InviteUserDialog'
import EditUserDialog from '../dialogs/EditUserDialog'

export default function OrganizationUsersPanel({ organizationId, organizationName, canManage = true }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    orgMembers, 
    projects,
    assignedUptradeTeam,
    loading, 
    fetchOrgMembers,
    fetchProjects,
    fetchAssignedUptradeTeam,
    addOrgMember,
    updateOrgMember,
    removeOrgMember
  } = useTeamStore()
  
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // Load members and projects on mount
  useEffect(() => {
    if (organizationId) {
      fetchOrgMembers(organizationId).catch(err => {
        console.error('Failed to load members:', err)
        toast.error('Failed to load organization members')
      })
      fetchProjects(organizationId).catch(err => {
        console.error('Failed to load projects:', err)
      })
      fetchAssignedUptradeTeam(organizationId).catch(err => {
        console.error('Failed to load Uptrade team:', err)
      })
    }
  }, [organizationId])

  const handleInvite = async (formData) => {
    if (!canManage) return
    setIsSubmitting(true)
    try {
      await addOrgMember(organizationId, formData)
      toast.success(`Invite sent to ${formData.email}`)
      setShowInviteDialog(false)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (member) => {
    if (!canManage) return
    setSelectedUser(member)
    setShowEditDialog(true)
  }

  const handleEditSubmit = async (formData) => {
    if (!canManage || !selectedUser?.contact?.id) return

    setIsSubmitting(true)
    try {
      await updateOrgMember(organizationId, selectedUser.contact.id, {
        role: formData.role,
        accessLevel: formData.accessLevel,
        projectIds: formData.projectIds
      })
      toast.success('User updated')
      setShowEditDialog(false)
      setSelectedUser(null)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (member) => {
    if (!canManage) return
    if (!confirm(`Remove ${member.contact?.name || member.contact?.email} from the organization?`)) {
      return
    }

    try {
      await removeOrgMember(organizationId, member.contact?.id)
      toast.success('User removed')
    } catch (error) {
      toast.error('Failed to remove user')
    }
  }

  // Filter members by access level
  const orgLevelMembers = orgMembers.filter(m => m.access_level === 'organization')
  const projectLevelMembers = orgMembers.filter(m => m.access_level === 'project')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Team</h2>
          <p className="text-[var(--text-secondary)]">
            {canManage 
              ? `Manage who has access to ${organizationName || 'your organization'}` 
              : `Team members with access to ${organizationName || 'your organization'}`}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)]">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{orgMembers.length}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Your Team</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{orgLevelMembers.length}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Org-Level</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{projectLevelMembers.length}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Project-Only</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <Headphones className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{assignedUptradeTeam.length}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Uptrade Team</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            Your Team ({orgMembers.length})
          </TabsTrigger>
          <TabsTrigger value="uptrade" className="gap-2">
            <Headphones className="h-4 w-4" />
            Uptrade Team ({assignedUptradeTeam.length})
          </TabsTrigger>
          <TabsTrigger value="by-project" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            By Project
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : orgMembers.length === 0 ? (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                <p className="text-[var(--text-secondary)]">No users yet</p>
                {canManage && (
                  <Button className="mt-4" onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite First User
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orgMembers.map((member) => (
                <UserCard
                  key={member.id}
                  user={member}
                  currentUserId={user?.id}
                  onEdit={canManage ? handleEdit : undefined}
                  onRemove={canManage ? handleRemove : undefined}
                  onMessage={(member) => {
                    // Navigate to messages with this contact
                    navigate(`/p/messages?contact=${member.contact?.id}`)
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="uptrade" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : assignedUptradeTeam.length === 0 ? (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Headphones className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                <p className="text-[var(--text-secondary)]">No Uptrade team members assigned yet</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-2">
                  Your Uptrade Media contacts will appear here once assigned to your projects.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignedUptradeTeam.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] transition-all group"
                >
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-lg">
                    {member.name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">
                      {member.name || member.email || 'Unknown'}
                    </p>
                    <p className="text-sm text-[var(--text-tertiary)] truncate">{member.email}</p>
                    <p className="text-xs text-amber-500 font-medium mt-0.5">Uptrade Media</p>
                  </div>
                  
                  {/* Message Action */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/p/messages?contact=${member.id}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-project" className="mt-4 space-y-4">
          {projects.length === 0 ? (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                <p className="text-[var(--text-secondary)]">No projects yet</p>
              </CardContent>
            </Card>
          ) : (
            projects.map((project) => {
              const projectUsers = orgMembers.filter(m => 
                m.projectMemberships?.some(pm => pm.project?.id === project.id)
              )
              
              return (
                <Card key={project.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      {canManage && (
                        <Button variant="outline" size="sm">
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {projectUsers.length === 0 ? (
                      <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                        No project-specific users (org-level users have access)
                      </p>
                    ) : (
                      projectUsers.map((member) => (
                        <ProjectMemberCard
                          key={member.id}
                          member={{
                            ...member,
                            contact: member.contact,
                            role: member.projectMemberships?.find(pm => pm.project?.id === project.id)?.role || 'member'
                          }}
                          onRemove={handleRemove}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onSubmit={handleInvite}
        projects={projects}
        organizationName={organizationName}
        isLoading={isSubmitting}
      />

      <EditUserDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={selectedUser}
        projects={projects}
        onSubmit={handleEditSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
}
