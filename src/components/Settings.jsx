// Settings.jsx - Module toggles and org settings
import { useState, useEffect, useRef } from 'react'
import useAuthStore, { useOrgFeatures } from '@/lib/auth-store'
import { getSession } from '@/lib/supabase-auth'
import { 
  Settings as SettingsIcon, 
  ToggleLeft, 
  ToggleRight, 
  Search, 
  ShoppingCart, 
  BarChart3, 
  FileText,
  Users,
  MessageSquare,
  DollarSign,
  FolderOpen,
  Shield,
  Trophy,
  ClipboardList,
  BookOpen,
  Briefcase,
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Upload,
  Camera,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { filesApi, adminApi } from '@/lib/portal-api'
import ContactAvatar from '@/components/ui/ContactAvatar'

// All available modules with their metadata
const AVAILABLE_MODULES = [
  {
    key: 'seo',
    label: 'SEO',
    description: 'Track search rankings, crawl pages, identify optimization opportunities',
    icon: Search,
    category: 'marketing'
  },
  {
    key: 'ecommerce',
    label: 'Ecommerce',
    description: 'Shopify store integration - manage products, inventory, and orders',
    icon: ShoppingCart,
    category: 'sales'
  },
  {
    key: 'my_sales',
    label: 'My Sales',
    description: 'Track form submissions, leads, and customers from your website',
    icon: ShoppingCart,
    category: 'sales'
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'View traffic and performance analytics',
    icon: BarChart3,
    category: 'marketing'
  },
  {
    key: 'proposals',
    label: 'Proposals',
    description: 'Create and manage client proposals',
    icon: FileText,
    category: 'core'
  },
  {
    key: 'billing',
    label: 'Billing',
    description: 'Invoices and payment management',
    icon: DollarSign,
    category: 'core'
  },
  {
    key: 'files',
    label: 'Files',
    description: 'File storage and sharing',
    icon: FolderOpen,
    category: 'core'
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'Internal messaging system',
    icon: MessageSquare,
    category: 'core'
  },
  {
    key: 'team',
    label: 'Team',
    description: 'Team member management',
    icon: Shield,
    category: 'admin'
  },
  {
    key: 'team_metrics',
    label: 'Team Metrics',
    description: 'Sales team performance tracking',
    icon: Trophy,
    category: 'admin'
  },
  {
    key: 'forms',
    label: 'Forms',
    description: 'Form builder and submissions',
    icon: ClipboardList,
    category: 'marketing'
  },
  {
    key: 'blog',
    label: 'Blog',
    description: 'Blog post management',
    icon: BookOpen,
    category: 'content'
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    description: 'Portfolio/case study management',
    icon: Briefcase,
    category: 'content'
  },
  {
    key: 'email',
    label: 'Outreach',
    description: 'Email and SMS campaign management',
    icon: Mail,
    category: 'marketing'
  }
]

const CATEGORIES = {
  core: { label: 'Core Modules', order: 1 },
  marketing: { label: 'Marketing', order: 2 },
  sales: { label: 'Sales', order: 3 },
  admin: { label: 'Administration', order: 4 },
  content: { label: 'Content', order: 5 }
}

export default function Settings() {
  const { currentOrg, currentProject, isSuperAdmin, setOrganization, user, updateUser } = useAuthStore()
  const { features } = useOrgFeatures()
  const [localFeatures, setLocalFeatures] = useState({})
  const [saving, setSaving] = useState(null) // Which module is currently saving
  const [saveStatus, setSaveStatus] = useState({}) // { moduleKey: 'success' | 'error' }
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const avatarInputRef = useRef(null)
  const logoInputRef = useRef(null)
  
  // When in project context, use project as the "org" for settings
  const activeContext = currentProject || currentOrg
  
  // Check if viewing a project-based tenant (e.g., GWA)
  // Admin users in Uptrade Media org should see admin view even when project selected
  const isUptradeMediaOrg = currentOrg?.slug === 'uptrade-media' || currentOrg?.domain === 'uptrademedia.com' || currentOrg?.org_type === 'agency'
  const isProjectTenant = (activeContext?.isProjectTenant === true || !!currentProject) && !isUptradeMediaOrg
  
  // Handle avatar upload
  const handleAvatarUpload = async (event, type) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Maximum size is 5MB.')
      return
    }

    const isUserAvatar = type === 'user'
    if (isUserAvatar) setUploadingAvatar(true)
    else setUploadingLogo(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        try {
          const { data: { session } } = await getSession()
          if (!session?.access_token) throw new Error('Not authenticated')

          const res = await filesApi.uploadBase64({
            image: reader.result,
            type: isUserAvatar ? 'user' : 'org',
            targetId: currentOrg.id
          })

          if (res.data.success) {
            // Update local state
            if (isUserAvatar) {
              updateUser({ avatar: res.data.url })
            } else {
              setOrganization({ ...currentOrg, logo_url: res.data.url })
            }
            
            alert(`${isUserAvatar ? 'Avatar' : 'Logo'} updated successfully!`)
          }
        } catch (error) {
          console.error('Upload error:', error)
          alert(`Failed to upload ${isUserAvatar ? 'avatar' : 'logo'}: ${error.response?.data?.error || error.message}`)
        } finally {
          if (isUserAvatar) setUploadingAvatar(false)
          else setUploadingLogo(false)
        }
      }
      reader.onerror = () => {
        alert('Failed to read file')
        if (isUserAvatar) setUploadingAvatar(false)
        else setUploadingLogo(false)
      }
    } catch (error) {
      console.error('File reading error:', error)
      if (isUserAvatar) setUploadingAvatar(false)
      else setUploadingLogo(false)
    }
  }
  
  // Initialize local features from current context
  useEffect(() => {
    if (activeContext?.features) {
      setLocalFeatures(activeContext.features)
    }
  }, [activeContext])

  // Toggle a feature
  const toggleFeature = async (moduleKey) => {
    if (!activeContext) return
    
    const newValue = !localFeatures[moduleKey]
    
    // Optimistically update local state
    setLocalFeatures(prev => ({ ...prev, [moduleKey]: newValue }))
    setSaving(moduleKey)
    setSaveStatus(prev => ({ ...prev, [moduleKey]: null }))
    
    try {
      // Get session token for auth header
      const { data: { session } } = await getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      const res = await adminApi.updateTenant(currentOrg.id, {
        features: { [moduleKey]: newValue }
      })
      
      // Update the auth store with new org data
      if (res.data.organization) {
        setOrganization(res.data.organization)
      }
      
      setSaveStatus(prev => ({ ...prev, [moduleKey]: 'success' }))
      
      // Clear success status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [moduleKey]: null }))
      }, 2000)
    } catch (error) {
      console.error('Failed to update feature:', error)
      // Revert on error
      setLocalFeatures(prev => ({ ...prev, [moduleKey]: !newValue }))
      setSaveStatus(prev => ({ ...prev, [moduleKey]: 'error' }))
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [moduleKey]: null }))
      }, 3000)
    } finally {
      setSaving(null)
    }
  }

  // Group modules by category
  const groupedModules = AVAILABLE_MODULES.reduce((acc, module) => {
    const cat = module.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(module)
    return acc
  }, {})

  // Sort categories
  const sortedCategories = Object.keys(groupedModules).sort(
    (a, b) => CATEGORIES[a].order - CATEGORIES[b].order
  )

  if (!activeContext) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <Info className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-4" />
          <h2 className="text-lg font-medium text-[var(--text-primary)]">No Organization Selected</h2>
          <p className="text-[var(--text-secondary)] mt-2">Select an organization to manage settings.</p>
        </div>
      </div>
    )
  }

  // For project tenants, show a simplified settings view without module toggles
  if (isProjectTenant) {
    // Get enabled features for display
    const enabledFeatures = activeContext.features || []
    const enabledModules = AVAILABLE_MODULES.filter(m => 
      enabledFeatures.includes(m.key)
    )
    
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
            <p className="text-[var(--text-secondary)] text-sm">
              {activeContext.name} • Account Settings
            </p>
          </div>
        </div>

        {/* Organization Info */}
        <div className="bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)] rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Organization Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Organization</p>
              <p className="text-[var(--text-primary)] font-medium">{activeContext.name}</p>
            </div>
            {activeContext.domain && (
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Website</p>
                <a 
                  href={`https://${activeContext.domain}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--accent-primary)] hover:underline font-medium"
                >
                  {activeContext.domain}
                </a>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Plan</p>
              <p className="text-[var(--text-primary)] font-medium capitalize">{activeContext.plan || 'Managed'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Status</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400">
                {activeContext.status || 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Active Modules (Read Only) */}
        <div className="bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Active Modules</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            These modules are included in your plan. Contact Uptrade Media to add or remove modules.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {enabledModules.map(module => {
              const Icon = module.icon
              return (
                <div 
                  key={module.key}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--glass-border)]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[var(--accent-primary)]" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{module.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8 pt-6 border-t border-[var(--glass-border)] text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Need to change your plan or modules?{' '}
            <a href="mailto:support@uptrademedia.com" className="text-[var(--accent-primary)] hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {currentOrg.name} • Manage visible modules and features
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)] rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[var(--text-primary)]">
              Toggle modules on or off to customize your sidebar navigation. 
              Disabled modules will be hidden from the menu but data is preserved.
            </p>
            {isSuperAdmin && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                As a super admin, you can see all modules regardless of toggle state.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="mb-8 bg-[var(--surface-secondary)] border border-[var(--glass-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Profile & Branding</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* User Avatar */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
              Your Avatar
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <ContactAvatar 
                  contact={user}
                  size="xl"
                  className="w-20 h-20"
                />
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarUpload(e, 'user')}
                  className="hidden"
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center gap-2"
                  )}
                >
                  <Camera className="w-4 h-4" />
                  {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </button>
                <p className="text-xs text-[var(--text-tertiary)]">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Organization Logo (Admin Only) */}
          {(currentOrg.role === 'admin' || isSuperAdmin) && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                Organization Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center overflow-hidden">
                    {currentOrg.logo_url ? (
                      <img src={currentOrg.logo_url} alt={currentOrg.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-[var(--text-tertiary)]" />
                    )}
                  </div>
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAvatarUpload(e, 'org')}
                    className="hidden"
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "flex items-center gap-2"
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </button>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Square format recommended. Max 5MB.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Module Toggles by Category */}
      <div className="space-y-8">
        {sortedCategories.map(category => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
              {CATEGORIES[category].label}
            </h3>
            <div className="space-y-2">
              {groupedModules[category].map(module => {
                const Icon = module.icon
                const isEnabled = localFeatures[module.key] === true
                const isSaving = saving === module.key
                const status = saveStatus[module.key]
                
                return (
                  <div 
                    key={module.key}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-all duration-200",
                      isEnabled 
                        ? "bg-[var(--glass-bg)] border-[var(--accent-primary)]/30"
                        : "bg-[var(--surface-secondary)] border-[var(--glass-border)]",
                      "hover:border-[var(--accent-primary)]/50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                        isEnabled 
                          ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                          : "bg-[var(--surface-primary)] text-[var(--text-tertiary)]"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className={cn(
                          "font-medium transition-colors",
                          isEnabled ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                        )}>
                          {module.label}
                        </h4>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Status indicator */}
                      {status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-500 animate-in fade-in" />
                      )}
                      {status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500 animate-in fade-in" />
                      )}
                      
                      {/* Toggle button */}
                      <button
                        onClick={() => toggleFeature(module.key)}
                        disabled={isSaving}
                        className={cn(
                          "relative w-14 h-8 rounded-full transition-colors duration-200",
                          isEnabled 
                            ? "bg-[var(--accent-primary)]" 
                            : "bg-[var(--surface-primary)] border border-[var(--glass-border)]",
                          isSaving && "opacity-50 cursor-wait"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 flex items-center justify-center",
                          isEnabled ? "translate-x-7" : "translate-x-1"
                        )}>
                          {isSaving ? (
                            <Loader2 className="w-3 h-3 text-[var(--accent-primary)] animate-spin" />
                          ) : isEnabled ? (
                            <ToggleRight className="w-3 h-3 text-[var(--accent-primary)]" />
                          ) : (
                            <ToggleLeft className="w-3 h-3 text-[var(--text-tertiary)]" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-8 pt-6 border-t border-[var(--glass-border)]">
        <p className="text-xs text-[var(--text-tertiary)] text-center">
          Changes are saved automatically. Refresh the page to see updated navigation.
        </p>
      </div>
    </div>
  )
}
