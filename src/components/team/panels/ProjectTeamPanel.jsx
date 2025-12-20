/**
 * ProjectTeamPanel - View and manage project team members
 * 
 * Features:
 * - View project members and their roles
 * - See assigned Uptrade employees
 * - Add users to project (if org-level)
 * - Remove users from project
 */
import { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Loader2,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import useTeamStore from '../store'
import useAuthStore from '@/lib/auth-store'
import ProjectMemberCard from '../cards/ProjectMemberCard'

export default function ProjectTeamPanel({ projectId, projectName }) {
  const { user, accessLevel } = useAuthStore()
  const { 
    projectMembers,
    loading, 
    fetchProjectMembers,
    removeProjectMember
  } = useTeamStore()
  
  const [showAddDialog, setShowAddDialog] = useState(false)
  const hasOrgAccess = accessLevel === 'organization' || user?.role === 'admin'

  // Load project members on mount
  useEffect(() => {
    if (projectId) {
      fetchProjectMembers(projectId).catch(err => {
        console.error('Failed to load project members:', err)
        toast.error('Failed to load team members')
      })
    }
  }, [projectId])

  const handleRemove = async (member) => {
    if (!confirm(`Remove ${member.contact?.name || member.contact?.email} from this project?`)) {
      return
    }

    try {
      await removeProjectMember(projectId, member.contact?.id)
      toast.success('User removed from project')
    } catch (error) {
      toast.error('Failed to remove user')
    }
  }

  const members = projectMembers[projectId] || []
  const uptradeTeam = members.filter(m => m.role === 'uptrade_assigned')
  const projectUsers = members.filter(m => m.role !== 'uptrade_assigned')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {projectName ? `${projectName} Team` : 'Project Team'}
          </h2>
          <p className="text-[var(--text-secondary)]">
            Team members and Uptrade contacts for this project
          </p>
        </div>
        {hasOrgAccess && (
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Uptrade Team Section */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-green-400" />
                Uptrade Team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {uptradeTeam.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                  No Uptrade team member assigned to this project
                </p>
              ) : (
                uptradeTeam.map((member) => (
                  <ProjectMemberCard
                    key={member.id}
                    member={member}
                    showRemove={false}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Project Users Section */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Project Members
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {projectUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Users className="h-10 w-10 text-[var(--text-tertiary)] mb-3" />
                  <p className="text-sm text-[var(--text-tertiary)]">No project members yet</p>
                  {hasOrgAccess && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setShowAddDialog(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Add Member
                    </Button>
                  )}
                </div>
              ) : (
                projectUsers.map((member) => (
                  <ProjectMemberCard
                    key={member.id}
                    member={member}
                    onRemove={hasOrgAccess ? handleRemove : undefined}
                    showRemove={hasOrgAccess}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TODO: Add member dialog */}
    </div>
  )
}
