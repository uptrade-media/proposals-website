/**
 * UptradeTeamPanel - Internal Uptrade team management
 * 
 * Features:
 * - View all team members with metrics
 * - Add new team members (admin, manager, sales_rep, developer)
 * - Edit team member details
 * - Activate/deactivate members
 * - Resend invites
 */
import { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Loader2,
  TrendingUp,
  FileText,
  Target,
  Crown,
  Shield,
  Briefcase,
  Code
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import useTeamStore from '../store'
import useAuthStore from '@/lib/auth-store'
import TeamMemberCard from '../cards/TeamMemberCard'
import InviteTeamMemberDialog from '../dialogs/InviteTeamMemberDialog'

// Stats card component
function StatCard({ icon: Icon, value, label, color = 'brand' }) {
  const colorClasses = {
    brand: 'from-[var(--brand-primary)] to-[var(--brand-secondary)]',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600'
  }

  return (
    <Card className="bg-card border-[var(--glass-border)]">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-sm text-[var(--text-tertiary)]">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function UptradeTeamPanel() {
  const { user } = useAuthStore()
  const { 
    teamMembers, 
    teamSummary, 
    loading, 
    fetchTeamMembers, 
    createTeamMember,
    updateTeamMember,
    resendTeamInvite,
    setTeamMemberStatus 
  } = useTeamStore()
  
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // Load team members on mount
  useEffect(() => {
    fetchTeamMembers().catch(err => {
      console.error('Failed to load team:', err)
      toast.error('Failed to load team members')
    })
  }, [])

  const handleInvite = async (formData) => {
    setIsSubmitting(true)
    try {
      await createTeamMember(formData)
      toast.success(`Invite sent to ${formData.email}`)
      setShowInviteDialog(false)
    } catch (error) {
      toast.error(error.message || 'Failed to send invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendInvite = async (member) => {
    try {
      await resendTeamInvite(member.id)
      toast.success(`Invite resent to ${member.email}`)
    } catch (error) {
      toast.error('Failed to resend invite')
    }
  }

  const handleStatusChange = async (member, newStatus) => {
    try {
      await setTeamMemberStatus(member.id, newStatus)
      toast.success(`${member.name} is now ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleEdit = (member) => {
    // TODO: Open edit dialog
    toast.info('Edit dialog coming soon')
  }

  // Filter members by role for tabs
  const filteredMembers = activeTab === 'all' 
    ? teamMembers 
    : teamMembers.filter(m => m.teamRole === activeTab)

  const activeMembers = teamMembers.filter(m => m.teamStatus === 'active')
  const pendingMembers = teamMembers.filter(m => m.teamStatus === 'pending')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Uptrade Team</h2>
          <p className="text-[var(--text-secondary)]">
            Manage your internal team members and their roles
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Stats */}
      {teamSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            value={teamSummary.activeMembers}
            label="Active Members"
            color="brand"
          />
          <StatCard
            icon={TrendingUp}
            value={teamSummary.totalAudits}
            label="Total Audits"
            color="blue"
          />
          <StatCard
            icon={FileText}
            value={teamSummary.totalProposals}
            label="Total Proposals"
            color="purple"
          />
          <StatCard
            icon={Target}
            value={teamSummary.totalAccepted}
            label="Deals Won"
            color="green"
          />
        </div>
      )}

      {/* Role Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            All ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-2">
            <Crown className="h-4 w-4" />
            Admins ({teamSummary?.admins || 0})
          </TabsTrigger>
          <TabsTrigger value="manager" className="gap-2">
            <Shield className="h-4 w-4" />
            Managers ({teamSummary?.managers || 0})
          </TabsTrigger>
          <TabsTrigger value="sales_rep" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Sales ({teamSummary?.salesReps || 0})
          </TabsTrigger>
          <TabsTrigger value="developer" className="gap-2">
            <Code className="h-4 w-4" />
            Developers
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                <p className="text-[var(--text-secondary)]">
                  {activeTab === 'all' ? 'No team members yet' : `No ${activeTab.replace('_', ' ')}s`}
                </p>
                <Button className="mt-4" onClick={() => setShowInviteDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Pending invites section */}
              {activeTab === 'all' && pendingMembers.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[var(--text-tertiary)] mb-3">
                    Pending Invites ({pendingMembers.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingMembers.map((member) => (
                      <TeamMemberCard
                        key={member.id}
                        member={member}
                        currentUserId={user?.id}
                        onEdit={handleEdit}
                        onResendInvite={handleResendInvite}
                        onStatusChange={handleStatusChange}
                        showMetrics={false}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Active members */}
              <div className="space-y-2">
                {(activeTab === 'all' ? activeMembers : filteredMembers.filter(m => m.teamStatus === 'active')).map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    currentUserId={user?.id}
                    onEdit={handleEdit}
                    onResendInvite={handleResendInvite}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <InviteTeamMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onSubmit={handleInvite}
        isLoading={isSubmitting}
      />
    </div>
  )
}
