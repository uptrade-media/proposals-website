/**
 * AllOrganizationsPanel - Admin view for managing all organizations and their users
 * 
 * Features:
 * - List all organizations with user counts
 * - Expand to see projects and users per organization
 * - Organization settings (branding, theme, preferences)
 * - Quick invite users to org or specific project
 * - Search and filter organizations
 */
import { useState, useEffect, useRef, useCallback } from 'react'
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
  Globe,
  MailCheck,
  Send,
  Settings,
  Palette,
  Save,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { adminApi, filesApi } from '@/lib/portal-api'
import InviteUserDialog from '../dialogs/InviteUserDialog'

// Default brand colors (Uptrade)
const DEFAULT_BRAND_COLOR_1 = '#4bbf39'
const DEFAULT_BRAND_COLOR_2 = '#39bfb0'

// Allowed image types for logo upload
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml'
]
const MAX_LOGO_SIZE = 5 * 1024 * 1024 // 5MB

// Timezone options
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'UTC', label: 'UTC' },
]

// Date format options
const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
]

export default function AllOrganizationsPanel() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOrg, setExpandedOrg] = useState(null)
  const [orgMembers, setOrgMembers] = useState({})
  const [loadingMembers, setLoadingMembers] = useState({})
  const [expandedTab, setExpandedTab] = useState('projects') // 'projects', 'users', or 'settings'
  
  // Organization settings state
  const [orgSettings, setOrgSettings] = useState({})
  const [savingSettings, setSavingSettings] = useState({})
  
  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState({})
  const [logoPreview, setLogoPreview] = useState({})
  const [dragOver, setDragOver] = useState({})
  const logoInputRefs = useRef({})
  
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
      const response = await adminApi.listTenants()
      const payload = response?.data ?? []
      const orgList = Array.isArray(payload)
        ? payload
        : payload.organizations || payload.tenants || payload.items || []
      setOrganizations(Array.isArray(orgList) ? orgList : [])
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrgMembers = async (orgId, force = false) => {
    // Only skip if already loaded AND not forcing
    if (orgMembers[orgId] && !force) return
    
    setLoadingMembers(prev => ({ ...prev, [orgId]: true }))
    try {
      const response = await adminApi.listOrgMembers(orgId)
      setOrgMembers(prev => ({
        ...prev,
        [orgId]: response.data.members || response.data || []
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
      // Initialize org settings from the org data
      const org = organizations.find(o => o.id === orgId)
      if (org) {
        setOrgSettings(prev => ({
          ...prev,
          [orgId]: {
            name: org.name || '',
            domain: org.domain || '',
            logoUrl: org.logo_url || '',
            brandColor1: org.theme?.brandColor1 || org.theme?.primaryColor || DEFAULT_BRAND_COLOR_1,
            brandColor2: org.theme?.brandColor2 || org.theme?.secondaryColor || DEFAULT_BRAND_COLOR_2,
            timezone: org.theme?.timezone || 'America/New_York',
            dateFormat: org.theme?.dateFormat || 'MM/DD/YYYY',
            hideUptradeBranding: org.theme?.hideUptradeBranding || false,
            emailFromName: org.theme?.emailFromName || '',
          }
        }))
      }
      // Projects are already nested in the org, just fetch members
      await fetchOrgMembers(orgId)
    }
  }

  // Update local org settings
  const updateOrgSetting = (orgId, key, value) => {
    setOrgSettings(prev => ({
      ...prev,
      [orgId]: {
        ...prev[orgId],
        [key]: value
      }
    }))
  }

  // Save org settings to API
  const saveOrgSettings = async (orgId) => {
    setSavingSettings(prev => ({ ...prev, [orgId]: true }))
    try {
      const settings = orgSettings[orgId]
      await adminApi.updateOrgSettings(orgId, {
        name: settings.name,
        domain: settings.domain,
        logoUrl: settings.logoUrl,
        theme: {
          brandColor1: settings.brandColor1,
          brandColor2: settings.brandColor2,
          primaryColor: settings.brandColor1, // Keep in sync
        },
        displayPreferences: {
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
        },
        whiteLabel: {
          hideUptradeBranding: settings.hideUptradeBranding,
          emailFromName: settings.emailFromName,
        }
      })
      toast.success('Organization settings saved')
      
      // Refresh organizations to get updated data
      await fetchOrganizations()
    } catch (error) {
      console.error('Failed to save org settings:', error)
      toast.error(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setSavingSettings(prev => ({ ...prev, [orgId]: false }))
    }
  }

  // Reset org settings to defaults
  const resetOrgSettings = (orgId) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setOrgSettings(prev => ({
        ...prev,
        [orgId]: {
          name: org.name || '',
          domain: org.domain || '',
          logoUrl: org.logo_url || '',
          brandColor1: DEFAULT_BRAND_COLOR_1,
          brandColor2: DEFAULT_BRAND_COLOR_2,
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          hideUptradeBranding: false,
          emailFromName: '',
        }
      }))
      // Clear logo preview when resetting
      setLogoPreview(prev => ({ ...prev, [orgId]: null }))
    }
  }

  // Logo upload handlers
  const handleLogoUpload = useCallback(async (orgId, file) => {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPEG, GIF, WebP, or SVG)')
      return
    }
    
    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Logo file must be smaller than 5MB')
      return
    }
    
    // Create preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(prev => ({ ...prev, [orgId]: e.target.result }))
    }
    reader.readAsDataURL(file)
    
    setUploadingLogo(prev => ({ ...prev, [orgId]: true }))
    
    try {
      // Convert to base64
      const base64Reader = new FileReader()
      const base64Data = await new Promise((resolve, reject) => {
        base64Reader.onload = () => resolve(base64Reader.result.split(',')[1])
        base64Reader.onerror = reject
        base64Reader.readAsDataURL(file)
      })
      
      // Upload to files API
      const response = await filesApi.uploadFile({
        filename: `org-logo-${orgId}-${Date.now()}.${file.name.split('.').pop()}`,
        mimeType: file.type,
        fileSize: file.size,
        base64Data,
        category: 'logos',
        isPublic: true
      })
      
      const uploadedUrl = response.data?.url || response.data?.file?.public_url || response.data?.file?.url
      
      if (uploadedUrl) {
        // Update org settings with new logo URL
        updateOrgSetting(orgId, 'logoUrl', uploadedUrl)
        toast.success('Logo uploaded successfully')
      } else {
        throw new Error('No URL returned from upload')
      }
    } catch (error) {
      console.error('Failed to upload logo:', error)
      toast.error(error.response?.data?.error || 'Failed to upload logo')
      // Clear preview on error
      setLogoPreview(prev => ({ ...prev, [orgId]: null }))
    } finally {
      setUploadingLogo(prev => ({ ...prev, [orgId]: false }))
    }
  }, [])
  
  const handleLogoDrop = useCallback((orgId, e) => {
    e.preventDefault()
    setDragOver(prev => ({ ...prev, [orgId]: false }))
    
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      handleLogoUpload(orgId, files[0])
    }
  }, [handleLogoUpload])
  
  const handleLogoDragOver = useCallback((orgId, e) => {
    e.preventDefault()
    setDragOver(prev => ({ ...prev, [orgId]: true }))
  }, [])
  
  const handleLogoDragLeave = useCallback((orgId, e) => {
    e.preventDefault()
    setDragOver(prev => ({ ...prev, [orgId]: false }))
  }, [])
  
  const handleLogoFileSelect = useCallback((orgId, e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleLogoUpload(orgId, file)
    }
    // Reset input so same file can be selected again
    if (e.target) e.target.value = ''
  }, [handleLogoUpload])
  
  const removeLogo = useCallback((orgId) => {
    updateOrgSetting(orgId, 'logoUrl', '')
    setLogoPreview(prev => ({ ...prev, [orgId]: null }))
  }, [])

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
      await adminApi.addOrgMember(inviteOrgId, {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        accessLevel: formData.accessLevel,
        projectIds: formData.projectIds || []
      })
      
      toast.success(`Invite sent to ${formData.email}`)
      setShowInviteDialog(false)
      
      // Force refetch members list
      await fetchOrgMembers(inviteOrgId, true)
      
      // Keep org expanded and switch to users tab to show the new pending user
      setExpandedOrg(inviteOrgId)
      setExpandedTab('users')
      
      // Refresh org list to update counts
      await fetchOrganizations()
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message || 'Failed to send invite'
      toast.error(errorMsg)
    } finally {
      setIsInviting(false)
    }
  }

  const handleResendInvite = async (orgId, contactId, memberEmail) => {
    try {
      await adminApi.updateOrgMember(orgId, contactId, { action: 'resend-invite' })
      
      toast.success(`Invite resent to ${memberEmail}`)
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message || 'Failed to resend invite'
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Failed to resend invite')
    }
  }

  const handleRemoveMember = async (orgId, contactId, memberName) => {
    if (!confirm(`Remove ${memberName} from this organization?`)) return
    
    try {
      await adminApi.removeOrgMember(orgId, contactId)
      
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
                        <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-[var(--glass-bg)]">
                          <Settings className="h-4 w-4" />
                          Settings
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
                      {orgMembers[org.id].map((member) => {
                        const isPending = member.contact?.account_setup === 'false'
                        
                        return (
                        <div 
                          key={member.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                        >
                          {/* Avatar */}
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${
                            isPending 
                              ? 'from-amber-500 to-orange-500' 
                              : 'from-[var(--brand-primary)] to-[var(--brand-secondary)]'
                          } flex items-center justify-center text-white font-semibold relative`}>
                            {member.contact?.name?.charAt(0)?.toUpperCase() || 
                             member.contact?.email?.charAt(0)?.toUpperCase() || '?'}
                            {isPending && (
                              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 border-2 border-[var(--glass-bg)]" />
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[var(--text-primary)] truncate">
                                {member.contact?.name || member.contact?.email || 'Unknown'}
                              </p>
                              {isPending && (
                                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                  <MailCheck className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </div>
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
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {isPending && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                onClick={() => handleResendInvite(
                                  org.id,
                                  member.contact?.id,
                                  member.contact?.email
                                )}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Resend
                              </Button>
                            )}
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
                        </div>
                        )
                      })}
                    </div>
                  )}
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="mt-4 space-y-6 p-4">
                      {/* Logo Upload Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <ImageIcon className="h-4 w-4" />
                          <h4 className="font-medium">Organization Logo</h4>
                        </div>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Upload your organization's logo. Accepts PNG, JPEG, GIF, WebP, or SVG files up to 5MB.
                        </p>
                        
                        <div className="flex items-start gap-6">
                          {/* Logo Preview */}
                          <div className="flex-shrink-0">
                            {(logoPreview[org.id] || orgSettings[org.id]?.logoUrl) ? (
                              <div className="relative group">
                                <div className="w-24 h-24 rounded-xl border-2 border-[var(--glass-border)] bg-[var(--glass-bg)] flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={logoPreview[org.id] || orgSettings[org.id]?.logoUrl} 
                                    alt="Organization logo" 
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <button
                                  onClick={() => removeLogo(org.id)}
                                  className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove logo"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] flex items-center justify-center">
                                <Building2 className="h-8 w-8 text-[var(--text-tertiary)]" />
                              </div>
                            )}
                          </div>
                          
                          {/* Upload Area */}
                          <div className="flex-1">
                            <input
                              ref={(el) => logoInputRefs.current[org.id] = el}
                              type="file"
                              accept={ALLOWED_IMAGE_TYPES.join(',')}
                              onChange={(e) => handleLogoFileSelect(org.id, e)}
                              className="hidden"
                            />
                            <div
                              onDrop={(e) => handleLogoDrop(org.id, e)}
                              onDragOver={(e) => handleLogoDragOver(org.id, e)}
                              onDragLeave={(e) => handleLogoDragLeave(org.id, e)}
                              onClick={() => logoInputRefs.current[org.id]?.click()}
                              className={`
                                relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all
                                ${dragOver[org.id] 
                                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' 
                                  : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--glass-bg)]'
                                }
                              `}
                            >
                              {uploadingLogo[org.id] ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
                                  <p className="text-sm text-[var(--text-secondary)]">Uploading...</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <Upload className="h-8 w-8 text-[var(--text-tertiary)]" />
                                  <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                      Click to upload or drag and drop
                                    </p>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                      PNG, JPEG, GIF, WebP, or SVG (max 5MB)
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Brand Colors Section */}
                      <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <Palette className="h-4 w-4" />
                          <h4 className="font-medium">Brand Colors</h4>
                        </div>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Define your organization's brand colors. These will be applied across the portal UI for your team.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Brand Color 1 */}
                          <div className="space-y-2">
                            <Label htmlFor={`brand-color-1-${org.id}`} className="text-sm text-[var(--text-secondary)]">
                              Primary Brand Color
                            </Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                id={`brand-color-1-${org.id}`}
                                value={orgSettings[org.id]?.brandColor1 || DEFAULT_BRAND_COLOR_1}
                                onChange={(e) => updateOrgSetting(org.id, 'brandColor1', e.target.value)}
                                className="w-12 h-10 rounded border border-[var(--border-primary)] cursor-pointer bg-transparent"
                              />
                              <input
                                type="text"
                                value={orgSettings[org.id]?.brandColor1 || DEFAULT_BRAND_COLOR_1}
                                onChange={(e) => updateOrgSetting(org.id, 'brandColor1', e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] font-mono"
                                placeholder="#4bbf39"
                              />
                            </div>
                          </div>
                          
                          {/* Brand Color 2 */}
                          <div className="space-y-2">
                            <Label htmlFor={`brand-color-2-${org.id}`} className="text-sm text-[var(--text-secondary)]">
                              Secondary Brand Color
                            </Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                id={`brand-color-2-${org.id}`}
                                value={orgSettings[org.id]?.brandColor2 || DEFAULT_BRAND_COLOR_2}
                                onChange={(e) => updateOrgSetting(org.id, 'brandColor2', e.target.value)}
                                className="w-12 h-10 rounded border border-[var(--border-primary)] cursor-pointer bg-transparent"
                              />
                              <input
                                type="text"
                                value={orgSettings[org.id]?.brandColor2 || DEFAULT_BRAND_COLOR_2}
                                onChange={(e) => updateOrgSetting(org.id, 'brandColor2', e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] font-mono"
                                placeholder="#39bfb0"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Color Preview */}
                        <div className="p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
                          <p className="text-xs text-[var(--text-tertiary)] mb-2">Preview</p>
                          <div 
                            className="h-8 rounded-lg"
                            style={{
                              background: `linear-gradient(135deg, ${orgSettings[org.id]?.brandColor1 || DEFAULT_BRAND_COLOR_1} 0%, ${orgSettings[org.id]?.brandColor2 || DEFAULT_BRAND_COLOR_2} 100%)`
                            }}
                          />
                        </div>
                      </div>

                      {/* Display Preferences Section */}
                      <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <Settings className="h-4 w-4" />
                          <h4 className="font-medium">Display Preferences</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Timezone */}
                          <div className="space-y-2">
                            <Label className="text-sm text-[var(--text-secondary)]">
                              Timezone
                            </Label>
                            <Select
                              value={orgSettings[org.id]?.timezone || 'America/Chicago'}
                              onValueChange={(value) => updateOrgSetting(org.id, 'timezone', value)}
                            >
                              <SelectTrigger className="bg-[var(--bg-tertiary)] border-[var(--border-primary)]">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                              <SelectContent>
                                {TIMEZONES.map((tz) => (
                                  <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Date Format */}
                          <div className="space-y-2">
                            <Label className="text-sm text-[var(--text-secondary)]">
                              Date Format
                            </Label>
                            <Select
                              value={orgSettings[org.id]?.dateFormat || 'MM/DD/YYYY'}
                              onValueChange={(value) => updateOrgSetting(org.id, 'dateFormat', value)}
                            >
                              <SelectTrigger className="bg-[var(--bg-tertiary)] border-[var(--border-primary)]">
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                {DATE_FORMATS.map((fmt) => (
                                  <SelectItem key={fmt.value} value={fmt.value}>
                                    {fmt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* White-Label Section */}
                      <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <Building2 className="h-4 w-4" />
                          <h4 className="font-medium">White-Label Options</h4>
                        </div>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Customize how your organization appears to your team members.
                        </p>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm text-[var(--text-secondary)]">
                                Hide Uptrade Branding
                              </Label>
                              <p className="text-xs text-[var(--text-tertiary)]">
                                Remove "Powered by Uptrade" from footers and emails
                              </p>
                            </div>
                            <Switch
                              checked={orgSettings[org.id]?.hideUptradeBranding || false}
                              onCheckedChange={(checked) => updateOrgSetting(org.id, 'hideUptradeBranding', checked)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm text-[var(--text-secondary)]">
                              Email From Name
                            </Label>
                            <input
                              type="text"
                              value={orgSettings[org.id]?.emailFromName || ''}
                              onChange={(e) => updateOrgSetting(org.id, 'emailFromName', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)]"
                              placeholder={org.name || 'Organization Name'}
                            />
                            <p className="text-xs text-[var(--text-tertiary)]">
                              The name that appears in the "From" field for emails sent on behalf of this org
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Save/Reset Actions */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-primary)]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetOrgSettings(org.id)}
                          disabled={savingSettings[org.id]}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reset to Defaults
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
                          onClick={() => saveOrgSettings(org.id)}
                          disabled={savingSettings[org.id]}
                        >
                          {savingSettings[org.id] ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Save Settings
                            </>
                          )}
                        </Button>
                      </div>
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
