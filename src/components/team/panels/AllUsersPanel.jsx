/**
 * AllUsersPanel - Admin view for managing ALL portal users
 * 
 * Features:
 * - View all portal users across all organizations
 * - Search and filter by name, email, org, role, status
 * - User actions: edit, deactivate, reset password, resend invite
 * - Bulk actions: mass status change, mass invite
 * - Click to expand user details and activity
 */
import { useState, useEffect, useMemo } from 'react'
import { 
  Users, 
  UserPlus, 
  Search,
  Loader2,
  Mail,
  Building2,
  FolderOpen,
  Shield,
  Crown,
  MoreHorizontal,
  Send,
  Ban,
  CheckCircle,
  KeyRound,
  Activity,
  Calendar,
  ExternalLink,
  Filter,
  X,
  ChevronDown,
  Clock,
  UserCog,
  Trash2,
  Eye,
  RefreshCw,
  UserX,
  UserCheck,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import axios from 'axios'
import { getSession } from '@/lib/supabase-auth'
import { formatDistanceToNow } from 'date-fns'
import { OnlineIndicator } from '@/components/ui/online-indicator'
import { usePresence } from '@/lib/use-presence'
import useMessagesStore from '@/lib/messages-store'
import { adminApi } from '@/lib/portal-api'

// Role badge colors
const ROLE_COLORS = {
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  client: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  viewer: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

// Status badge colors
const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  inactive: 'bg-red-500/20 text-red-400 border-red-500/30'
}

// Role icons
const RoleIcon = ({ role }) => {
  switch (role) {
    case 'admin': return <Crown className="h-3 w-3" />
    case 'manager': return <Shield className="h-3 w-3" />
    default: return null
  }
}

export default function AllUsersPanel() {
  // Presence tracking
  const { onlineUsers, isOnline } = usePresence()

  // Data state
  const [users, setUsers] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Selection state for bulk actions
  const [selectedUsers, setSelectedUsers] = useState(new Set())
  const [selectAll, setSelectAll] = useState(false)
  
  // Dialog state
  const [userDetailId, setUserDetailId] = useState(null)
  const [userDetail, setUserDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // Bulk action state
  const [bulkActionDialog, setBulkActionDialog] = useState(null) // 'role', 'org', 'deactivate', 'reactivate', 'resend', 'delete'
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkRoleValue, setBulkRoleValue] = useState('client')
  const [bulkOrgValue, setBulkOrgValue] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  // Edit user state
  const [editUserId, setEditUserId] = useState(null)
  const [editUserData, setEditUserData] = useState(null)
  const [editUserLoading, setEditUserLoading] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: '',
    company: '',
    orgId: ''
  })

  // Fetch all users on mount
  useEffect(() => {
    fetchAllUsers()
  }, [])

  const fetchAllUsers = async () => {
    setLoading(true)
    try {
      const [usersRes, orgsRes] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listTenants()
      ])
      setUsers(usersRes.data?.users || [])
      // API returns { tenants: [...] } or { organizations: [...] }
      const orgs = orgsRes.data?.organizations || orgsRes.data?.tenants || []
      setOrganizations(orgs)
      console.log('[AllUsersPanel] Loaded organizations:', orgs.length)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserDetail = async (userId) => {
    setLoadingDetail(true)
    setUserDetailId(userId)
    try {
      const response = await adminApi.getUser(userId)
      setUserDetail(response.data?.user)
    } catch (error) {
      console.error('Failed to fetch user detail:', error)
      toast.error('Failed to load user details')
    } finally {
      setLoadingDetail(false)
    }
  }

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.company?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      
      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false
      
      // Status filter
      if (statusFilter !== 'all') {
        const userStatus = user.auth_user_id ? 'active' : (user.account_setup === 'false' ? 'pending' : 'inactive')
        if (userStatus !== statusFilter) return false
      }
      
      // Organization filter
      if (orgFilter !== 'all' && user.org_id !== orgFilter) return false
      
      return true
    })
  }, [users, searchQuery, roleFilter, statusFilter, orgFilter])

  // Stats - calculate online count from users (excluding AI contacts)
  const realOnlineCount = useMemo(() => {
    return users.filter(u => {
      const presence = onlineUsers.get(u.id)
      return presence?.status === 'online'
    }).length
  }, [users, onlineUsers])

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.auth_user_id).length,
    pending: users.filter(u => !u.auth_user_id && u.account_setup === 'false').length,
    admins: users.filter(u => u.role === 'admin').length
  }), [users])

  // User actions
  const handleResendInvite = async (user) => {
    try {
      await adminApi.resendSetupEmail(user.id)
      toast.success(`Invite resent to ${user.email}`)
    } catch (error) {
      toast.error('Failed to resend invite')
    }
  }

  const handleDeactivate = async (user) => {
    if (!confirm(`Deactivate ${user.name || user.email}? They will lose access to the portal.`)) return
    
    try {
      await adminApi.updateUser(user.id, {
        action: 'deactivate'
      })
      toast.success('User deactivated')
      fetchAllUsers()
    } catch (error) {
      toast.error('Failed to deactivate user')
    }
  }

  const handleReactivate = async (user) => {
    try {
      await adminApi.updateUser(user.id, {
        action: 'reactivate'
      })
      toast.success('User reactivated')
      fetchAllUsers()
    } catch (error) {
      toast.error('Failed to reactivate user')
    }
  }

  const handleDeleteUser = async (user) => {
    // This will be handled by the confirmation dialog
    setEditUserId(null)
    setEditUserData(null)
    setBulkActionDialog('delete-single')
    setSelectedUsers(new Set([user.id]))
  }

  const handleEditUser = async (user) => {
    setEditUserId(user.id)
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'client',
      company: user.company || '',
      orgId: user.org_id || '' // API expects camelCase
    })
  }

  const handleSaveEdit = async () => {
    if (!editUserId) return
    setEditUserLoading(true)
    try {
      // Send directly as update data (not wrapped in action/data)
      await adminApi.updateUser(editUserId, {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        company: editFormData.company,
        orgId: editFormData.orgId || null
      })
      toast.success('User updated successfully')
      setEditUserId(null)
      fetchAllUsers()
    } catch (error) {
      console.error('Failed to update user:', error)
      toast.error('Failed to update user')
    } finally {
      setEditUserLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    const selectedUsersList = getSelectedUserObjects()
    if (selectedUsersList.length === 0) return
    
    setBulkActionLoading(true)
    try {
      let success = 0, failed = 0
      
      for (const user of selectedUsersList) {
        try {
          await adminApi.deleteUser(user.id)
          success++
        } catch (error) {
          failed++
          console.error(`Failed to delete ${user.email}:`, error)
        }
      }
      
      if (success > 0) toast.success(`Deleted ${success} user(s)`)
      if (failed > 0) toast.error(`Failed to delete ${failed} user(s)`)
      
      setBulkActionDialog(null)
      setSelectedUsers(new Set())
      setDeleteConfirmText('')
      fetchAllUsers()
      
      // Refresh messages store to remove deleted users from conversations/contacts
      useMessagesStore.getState().refreshAll()
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete users')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleResetPassword = async (user) => {
    if (!confirm(`Send password reset email to ${user.email}?`)) return
    
    try {
      await adminApi.updateUser(user.id, {
        action: 'reset-password'
      })
      toast.success('Password reset email sent')
    } catch (error) {
      toast.error('Failed to send reset email')
    }
  }

  // Get selected user objects
  const getSelectedUserObjects = () => {
    return users.filter(u => selectedUsers.has(u.id))
  }

  // Bulk action handlers
  const handleBulkResendInvites = async () => {
    setBulkActionLoading(true)
    const selectedUsersList = getSelectedUserObjects()
    const pendingUsers = selectedUsersList.filter(u => getUserStatus(u) === 'pending')
    
    if (pendingUsers.length === 0) {
      toast.error('No pending users selected')
      setBulkActionLoading(false)
      setBulkActionDialog(null)
      return
    }

    let successCount = 0
    let failCount = 0

    for (const user of pendingUsers) {
      try {
        await adminApi.resendSetupEmail(user.id)
        successCount++
      } catch (error) {
        console.error(`Failed to resend invite to ${user.email}:`, error)
        failCount++
      }
    }

    setBulkActionLoading(false)
    setBulkActionDialog(null)
    setSelectedUsers(new Set())
    setSelectAll(false)

    if (successCount > 0 && failCount === 0) {
      toast.success(`Invites resent to ${successCount} user${successCount > 1 ? 's' : ''}`)
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`Resent ${successCount} invites, ${failCount} failed`)
    } else {
      toast.error('Failed to resend invites')
    }
  }

  const handleBulkDeactivate = async () => {
    setBulkActionLoading(true)
    const selectedUsersList = getSelectedUserObjects()
    const activeUsers = selectedUsersList.filter(u => getUserStatus(u) === 'active')
    
    if (activeUsers.length === 0) {
      toast.error('No active users selected')
      setBulkActionLoading(false)
      setBulkActionDialog(null)
      return
    }

    let successCount = 0
    let failCount = 0

    for (const user of activeUsers) {
      try {
        await adminApi.updateUser(user.id, {
          action: 'deactivate'
        })
        successCount++
      } catch (error) {
        console.error(`Failed to deactivate ${user.email}:`, error)
        failCount++
      }
    }

    setBulkActionLoading(false)
    setBulkActionDialog(null)
    setSelectedUsers(new Set())
    setSelectAll(false)
    fetchAllUsers()

    if (successCount > 0) {
      toast.success(`Deactivated ${successCount} user${successCount > 1 ? 's' : ''}`)
    }
    if (failCount > 0) {
      toast.error(`Failed to deactivate ${failCount} user${failCount > 1 ? 's' : ''}`)
    }
  }

  const handleBulkReactivate = async () => {
    setBulkActionLoading(true)
    const selectedUsersList = getSelectedUserObjects()
    const inactiveUsers = selectedUsersList.filter(u => getUserStatus(u) !== 'active')
    
    if (inactiveUsers.length === 0) {
      toast.error('No inactive users selected')
      setBulkActionLoading(false)
      setBulkActionDialog(null)
      return
    }

    let successCount = 0
    let failCount = 0

    for (const user of inactiveUsers) {
      try {
        await adminApi.updateUser(user.id, {
          action: 'reactivate'
        })
        successCount++
      } catch (error) {
        console.error(`Failed to reactivate ${user.email}:`, error)
        failCount++
      }
    }

    setBulkActionLoading(false)
    setBulkActionDialog(null)
    setSelectedUsers(new Set())
    setSelectAll(false)
    fetchAllUsers()

    if (successCount > 0) {
      toast.success(`Reactivated ${successCount} user${successCount > 1 ? 's' : ''}`)
    }
    if (failCount > 0) {
      toast.error(`Failed to reactivate ${failCount} user${failCount > 1 ? 's' : ''}`)
    }
  }

  const handleBulkChangeRole = async () => {
    if (!bulkRoleValue) {
      toast.error('Please select a role')
      return
    }

    setBulkActionLoading(true)
    const selectedUsersList = getSelectedUserObjects()
    
    let successCount = 0
    let failCount = 0

    for (const user of selectedUsersList) {
      try {
        await adminApi.updateUser(user.id, {
          action: 'update-role',
          role: bulkRoleValue
        })
        successCount++
      } catch (error) {
        console.error(`Failed to change role for ${user.email}:`, error)
        failCount++
      }
    }

    setBulkActionLoading(false)
    setBulkActionDialog(null)
    setSelectedUsers(new Set())
    setSelectAll(false)
    fetchAllUsers()

    if (successCount > 0) {
      toast.success(`Changed role for ${successCount} user${successCount > 1 ? 's' : ''}`)
    }
    if (failCount > 0) {
      toast.error(`Failed to change role for ${failCount} user${failCount > 1 ? 's' : ''}`)
    }
  }

  const handleBulkChangeOrg = async () => {
    if (!bulkOrgValue) {
      toast.error('Please select an organization')
      return
    }

    setBulkActionLoading(true)
    const selectedUsersList = getSelectedUserObjects()
    
    let successCount = 0
    let failCount = 0

    for (const user of selectedUsersList) {
      try {
        await adminApi.updateUser(user.id, {
          action: 'update-org',
          orgId: bulkOrgValue
        })
        successCount++
      } catch (error) {
        console.error(`Failed to change org for ${user.email}:`, error)
        failCount++
      }
    }

    setBulkActionLoading(false)
    setBulkActionDialog(null)
    setSelectedUsers(new Set())
    setSelectAll(false)
    fetchAllUsers()

    if (successCount > 0) {
      toast.success(`Changed organization for ${successCount} user${successCount > 1 ? 's' : ''}`)
    }
    if (failCount > 0) {
      toast.error(`Failed to change organization for ${failCount} user${failCount > 1 ? 's' : ''}`)
    }
  }

  // Get counts for bulk action validation
  const getSelectedCounts = () => {
    const selectedUsersList = getSelectedUserObjects()
    return {
      total: selectedUsersList.length,
      active: selectedUsersList.filter(u => getUserStatus(u) === 'active').length,
      pending: selectedUsersList.filter(u => getUserStatus(u) === 'pending').length,
      inactive: selectedUsersList.filter(u => getUserStatus(u) === 'inactive').length
    }
  }

  // Selection handlers
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    }
    setSelectAll(!selectAll)
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setRoleFilter('all')
    setStatusFilter('all')
    setOrgFilter('all')
  }

  const hasActiveFilters = searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || orgFilter !== 'all'

  // Get user's status
  const getUserStatus = (user) => {
    if (user.auth_user_id) return 'active'
    if (user.account_setup === 'false') return 'pending'
    return 'inactive'
  }

  // Get user's organization name
  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.id === orgId)
    return org?.name || 'No Organization'
  }

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
          <h2 className="text-xl font-bold text-[var(--text-primary)]">All Users</h2>
          <p className="text-[var(--text-secondary)]">
            Manage all portal users across organizations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 bg-[var(--glass-bg)] border-[var(--glass-border)]"
            />
          </div>
          
          {/* Filter toggle */}
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? '' : 'border-[var(--glass-border)]'}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger className="w-48 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]">
                  <SelectValue placeholder="Organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)]">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-emerald-500/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 relative">
              <Users className="h-5 w-5 text-white" />
              {realOnlineCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{realOnlineCount}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Online Now</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.active}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pending}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Pending Invite</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.admins}</p>
              <p className="text-sm text-[var(--text-tertiary)]">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk actions bar */}
      {selectedUsers.size > 0 && (
        <Card className="bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30">
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                {(() => {
                  const counts = getSelectedCounts()
                  return (
                    <>
                      {counts.active > 0 && <Badge variant="outline" className="text-xs py-0">{counts.active} active</Badge>}
                      {counts.pending > 0 && <Badge variant="outline" className="text-xs py-0">{counts.pending} pending</Badge>}
                      {counts.inactive > 0 && <Badge variant="outline" className="text-xs py-0">{counts.inactive} inactive</Badge>}
                    </>
                  )
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setSelectedUsers(new Set()); setSelectAll(false) }}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    Bulk Actions
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setBulkActionDialog('resend')}>
                    <Send className="h-4 w-4 mr-2" />
                    Resend Invites
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                      {getSelectedCounts().pending}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setBulkActionDialog('role')}>
                    <Shield className="h-4 w-4 mr-2" />
                    Change Role
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBulkActionDialog('org')}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Change Organization
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setBulkActionDialog('reactivate')}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Reactivate Users
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                      {getSelectedCounts().pending + getSelectedCounts().inactive}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setBulkActionDialog('deactivate')}
                    className="text-red-400 focus:text-red-400"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate Users
                    <span className="ml-auto text-xs">
                      {getSelectedCounts().active}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setBulkActionDialog('delete')}
                    className="text-red-400 focus:text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Users
                    <span className="ml-auto text-xs">
                      {getSelectedCounts().total}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--glass-border)] bg-black/20">
                <th className="p-3 text-left w-10">
                  <Checkbox 
                    checked={selectAll} 
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">User</th>
                <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Organization</th>
                <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Role</th>
                <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Status</th>
                <th className="p-3 text-left text-sm font-medium text-[var(--text-secondary)]">Last Active</th>
                <th className="p-3 text-right text-sm font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-[var(--text-tertiary)] opacity-50" />
                    <p className="text-[var(--text-secondary)]">
                      {hasActiveFilters ? 'No users match your filters' : 'No users found'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const status = getUserStatus(user)
                  return (
                    <tr 
                      key={user.id} 
                      className="border-b border-[var(--glass-border)]/50 hover:bg-[var(--glass-bg-hover)] transition-colors"
                    >
                      <td className="p-3">
                        <Checkbox 
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => handleSelectUser(user.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-sm">
                                {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            {/* Online indicator */}
                            <div className="absolute -bottom-0.5 -right-0.5">
                              <OnlineIndicator 
                                userId={user.id} 
                                lastSeen={user.last_seen_at}
                                size="xs"
                              />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {user.name || 'No Name'}
                            </p>
                            <p className="text-sm text-[var(--text-tertiary)] truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[var(--text-tertiary)]" />
                          <span className="text-sm text-[var(--text-secondary)]">
                            {getOrgName(user.org_id)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={`${ROLE_COLORS[user.role] || ROLE_COLORS.client} gap-1`}>
                          <RoleIcon role={user.role} />
                          {user.role || 'client'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={STATUS_COLORS[status]}>
                          {status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-[var(--text-tertiary)]">
                          {user.last_sign_in_at 
                            ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                            : 'Never'
                          }
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => fetchUserDetail(user.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleResendInvite(user)}>
                                <Send className="h-4 w-4 mr-2" />
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {status === 'active' ? (
                              <DropdownMenuItem 
                                onClick={() => handleDeactivate(user)}
                                className="text-red-400 focus:text-red-400"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleReactivate(user)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={!!userDetailId} onOpenChange={() => { setUserDetailId(null); setUserDetail(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View and manage user information</DialogDescription>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : userDetail ? (
            <div className="space-y-6">
              {/* User header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={userDetail.avatar} />
                  <AvatarFallback className="bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xl">
                    {userDetail.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {userDetail.name || 'No Name'}
                  </h3>
                  <p className="text-[var(--text-secondary)]">{userDetail.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={ROLE_COLORS[userDetail.role] || ROLE_COLORS.client}>
                      {userDetail.role}
                    </Badge>
                    <Badge className={STATUS_COLORS[getUserStatus(userDetail)]}>
                      {getUserStatus(userDetail)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-[var(--text-tertiary)]">Company</p>
                  <p className="text-[var(--text-primary)]">{userDetail.company || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[var(--text-tertiary)]">Organization</p>
                  <p className="text-[var(--text-primary)]">{getOrgName(userDetail.org_id)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[var(--text-tertiary)]">Phone</p>
                  <p className="text-[var(--text-primary)]">{userDetail.phone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[var(--text-tertiary)]">Created</p>
                  <p className="text-[var(--text-primary)]">
                    {userDetail.created_at 
                      ? new Date(userDetail.created_at).toLocaleDateString()
                      : '-'
                    }
                  </p>
                </div>
              </div>

              {/* Activity section */}
              {userDetail.activity && userDetail.activity.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-[var(--text-secondary)]">Recent Activity</h4>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {userDetail.activity.map((item, i) => (
                        <div 
                          key={i}
                          className="flex items-start gap-3 p-2 rounded-lg bg-[var(--glass-bg-inset)]"
                        >
                          <Activity className="h-4 w-4 text-[var(--text-tertiary)] mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--text-primary)]">{item.description}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Bulk Resend Invites Dialog */}
      <Dialog open={bulkActionDialog === 'resend'} onOpenChange={() => setBulkActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-[var(--brand-primary)]" />
              Resend Invites
            </DialogTitle>
            <DialogDescription>
              Resend account setup emails to pending users
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[var(--text-primary)]">
              This will resend setup invitations to <strong>{getSelectedCounts().pending}</strong> pending user{getSelectedCounts().pending !== 1 ? 's' : ''}.
            </p>
            {getSelectedCounts().pending === 0 && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-400">
                  No pending users in your selection. Only users who haven't completed account setup will receive invites.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkResendInvites} 
              disabled={bulkActionLoading || getSelectedCounts().pending === 0}
            >
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resend {getSelectedCounts().pending} Invite{getSelectedCounts().pending !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Change Role Dialog */}
      <Dialog open={bulkActionDialog === 'role'} onOpenChange={() => setBulkActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[var(--brand-primary)]" />
              Change Role
            </DialogTitle>
            <DialogDescription>
              Update the role for {selectedUsers.size} selected user{selectedUsers.size !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={bulkRoleValue} onValueChange={setBulkRoleValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-purple-400" />
                      Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      Manager
                    </div>
                  </SelectItem>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-400" />
                      Client
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleBulkChangeRole} disabled={bulkActionLoading}>
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Change Organization Dialog */}
      <Dialog open={bulkActionDialog === 'org'} onOpenChange={() => setBulkActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--brand-primary)]" />
              Change Organization
            </DialogTitle>
            <DialogDescription>
              Move {selectedUsers.size} selected user{selectedUsers.size !== 1 ? 's' : ''} to a different organization
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>New Organization</Label>
              <Select value={bulkOrgValue} onValueChange={setBulkOrgValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleBulkChangeOrg} disabled={bulkActionLoading || !bulkOrgValue}>
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Move {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reactivate Dialog */}
      <Dialog open={bulkActionDialog === 'reactivate'} onOpenChange={() => setBulkActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              Reactivate Users
            </DialogTitle>
            <DialogDescription>
              Restore access for deactivated or pending users
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[var(--text-primary)]">
              This will reactivate <strong>{getSelectedCounts().pending + getSelectedCounts().inactive}</strong> user{(getSelectedCounts().pending + getSelectedCounts().inactive) !== 1 ? 's' : ''}.
            </p>
            {(getSelectedCounts().pending + getSelectedCounts().inactive) === 0 && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-400">
                  No inactive users in your selection. All selected users are already active.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkReactivate} 
              disabled={bulkActionLoading || (getSelectedCounts().pending + getSelectedCounts().inactive) === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reactivate Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Deactivate Dialog */}
      <Dialog open={bulkActionDialog === 'deactivate'} onOpenChange={() => setBulkActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <UserX className="h-5 w-5" />
              Deactivate Users
            </DialogTitle>
            <DialogDescription>
              This action will remove portal access for selected users
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm text-red-400 font-medium">Warning: This action cannot be easily undone</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {getSelectedCounts().active} user{getSelectedCounts().active !== 1 ? 's' : ''} will lose access to the portal immediately.
                </p>
              </div>
            </div>
            {getSelectedCounts().active === 0 && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-400">
                  No active users in your selection. Only active users can be deactivated.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleBulkDeactivate} 
              disabled={bulkActionLoading || getSelectedCounts().active === 0}
            >
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate {getSelectedCounts().active} User{getSelectedCounts().active !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkActionDialog === 'delete' || bulkActionDialog === 'delete-single'} onOpenChange={() => { setBulkActionDialog(null); setDeleteConfirmText('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Delete Users Permanently
            </DialogTitle>
            <DialogDescription>
              This action is irreversible and will delete ALL user data
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm text-red-400 font-medium">⚠️ DANGER: This action cannot be undone</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} will be permanently deleted along with:
                </p>
                <ul className="text-sm text-[var(--text-secondary)] mt-2 list-disc list-inside space-y-1">
                  <li>All messages and conversations</li>
                  <li>Project and organization memberships</li>
                  <li>Tasks and assignments</li>
                  <li>Files and uploads</li>
                  <li>Activity history</li>
                  <li>Auth account (if exists)</li>
                </ul>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkActionDialog(null); setDeleteConfirmText('') }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDelete} 
              disabled={bulkActionLoading || deleteConfirmText !== 'DELETE'}
            >
              {bulkActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''} Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUserId} onOpenChange={() => { setEditUserId(null); setEditFormData({ name: '', email: '', role: '', company: '', orgId: '' }) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Edit User
            </DialogTitle>
            <DialogDescription>
              Update user profile information
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
                className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email address"
                className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={editFormData.company}
                onChange={(e) => setEditFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Company name"
                className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editFormData.role} onValueChange={(v) => setEditFormData(prev => ({ ...prev, role: v }))}>
                <SelectTrigger className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={editFormData.orgId || 'none'} onValueChange={(v) => setEditFormData(prev => ({ ...prev, orgId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Organization</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditUserId(null); setEditFormData({ name: '', email: '', role: '', company: '', orgId: '' }) }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={editUserLoading || !editFormData.name || !editFormData.email}
            >
              {editUserLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
