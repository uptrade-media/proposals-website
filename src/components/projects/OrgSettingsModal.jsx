/**
 * OrgSettingsModal - Modal for managing organization settings
 * 
 * Extracted from AllOrganizationsPanel for reuse in Projects module.
 * Features:
 * - Branding (logo, colors)
 * - Theme preferences
 * - Timezone & date format
 * - Module access settings
 * - Signal AI toggle (Uptrade admins only)
 */
import { useState, useRef, useCallback } from 'react'
import { 
  Save, RotateCcw, Upload, X, Loader2,
  Palette, Building2, Image as ImageIcon, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { adminApi, filesApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'

// Uptrade admin detection
const UPTRADE_ORG_SLUGS = ['uptrade-media']
const UPTRADE_ORG_TYPES = ['agency']

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

export default function OrgSettingsModal({ 
  organization, 
  open, 
  onOpenChange,
  onSettingsSaved
}) {
  const { user, currentOrg } = useAuthStore()
  const [activeTab, setActiveTab] = useState('branding')
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const logoInputRef = useRef(null)
  
  // Check if current user is Uptrade admin (can toggle Signal for any org)
  const isUptradeAdmin = user?.role === 'admin' || 
    user?.isSuperAdmin || 
    UPTRADE_ORG_SLUGS.includes(currentOrg?.slug) ||
    UPTRADE_ORG_TYPES.includes(currentOrg?.org_type)
  
  // Preferences are stored in theme.preferences JSONB
  const orgPrefs = organization?.theme?.preferences || {}
  
  // Settings state
  const [settings, setSettings] = useState(() => ({
    logoUrl: organization?.logo_url || organization?.theme?.logoUrl || '',
    brandColor1: organization?.theme?.brandColor1 || organization?.theme?.primaryColor || DEFAULT_BRAND_COLOR_1,
    brandColor2: organization?.theme?.brandColor2 || organization?.theme?.secondaryColor || DEFAULT_BRAND_COLOR_2,
    timezone: orgPrefs.timezone || 'America/New_York',
    dateFormat: orgPrefs.dateFormat || 'MM/DD/YYYY',
    darkMode: organization?.theme?.darkMode || false,
    compactMode: organization?.theme?.compactMode || false,
    emailNotifications: orgPrefs.emailNotifications !== false,
    weeklyDigest: orgPrefs.weeklyDigest !== false,
    // Signal settings (admin only)
    signalEnabled: organization?.signal_enabled || false,
    // Rate limiting / token budget
    isRateLimited: true, // Default to rate limited for new orgs
    budgetTokens: null, // null = unlimited
    budgetPeriod: 'monthly',
  }))

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleLogoUpload = async (file) => {
    if (!file) return
    
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPEG, GIF, WebP, or SVG)')
      return
    }
    
    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Logo file must be under 5MB')
      return
    }
    
    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => setLogoPreview(e.target.result)
    reader.readAsDataURL(file)
    
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', `organizations/${organization.id}/branding`)
      formData.append('public', 'true')
      
      const response = await filesApi.upload(formData)
      const logoUrl = response.data?.url || response.data?.publicUrl
      
      if (logoUrl) {
        updateSetting('logoUrl', logoUrl)
        toast.success('Logo uploaded successfully')
      }
    } catch (error) {
      console.error('Failed to upload logo:', error)
      toast.error('Failed to upload logo')
      setLogoPreview(null)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleLogoUpload(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        logoUrl: settings.logoUrl,
        theme: {
          brandColor1: settings.brandColor1,
          brandColor2: settings.brandColor2,
          primaryColor: settings.brandColor1,
          secondaryColor: settings.brandColor2,
          darkMode: settings.darkMode,
          compactMode: settings.compactMode,
        },
        preferences: {
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          emailNotifications: settings.emailNotifications,
          weeklyDigest: settings.weeklyDigest,
        },
      }
      
      // Include Signal settings if user is Uptrade admin
      if (isUptradeAdmin) {
        payload.signal_enabled = settings.signalEnabled
        // Set signal_enabled_at if just enabled
        if (settings.signalEnabled && !organization?.signal_enabled) {
          payload.signal_enabled_at = new Date().toISOString()
        }
        // Include token budget settings
        if (settings.signalEnabled) {
          payload.token_budget = {
            is_rate_limited: settings.isRateLimited,
            budget_tokens: settings.budgetTokens,
            budget_period: settings.budgetPeriod,
          }
        }
      }
      
      await adminApi.updateOrgSettings(organization.id, payload)
      toast.success('Organization settings saved')
      onSettingsSaved?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save org settings:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save settings'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings({
      logoUrl: '',
      brandColor1: DEFAULT_BRAND_COLOR_1,
      brandColor2: DEFAULT_BRAND_COLOR_2,
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      darkMode: false,
      compactMode: false,
      emailNotifications: true,
      weeklyDigest: true,
      signalEnabled: false,
      isRateLimited: true,
      budgetTokens: null,
      budgetPeriod: 'monthly',
    })
    setLogoPreview(null)
    toast.info('Settings reset to defaults')
  }

  if (!organization) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {organization.name} Settings
          </DialogTitle>
          <DialogDescription>
            Manage organization branding, theme, and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0">
          <TabsList className={cn("grid w-full", isUptradeAdmin ? "grid-cols-4" : "grid-cols-3")}>
            <TabsTrigger value="branding" className="gap-1.5">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-1.5">
              <ImageIcon className="h-4 w-4" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            {isUptradeAdmin && (
              <TabsTrigger value="signal" className="gap-1.5">
                <Zap className="h-4 w-4" />
                Signal AI
              </TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-1 mt-4 pr-4 -mr-4">
            <TabsContent value="branding" className="mt-0 space-y-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label>Organization Logo</Label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => logoInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    "hover:border-primary hover:bg-primary/5"
                  )}
                >
                  {uploadingLogo ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : logoPreview || settings.logoUrl ? (
                    <div className="relative w-32 h-32 mx-auto">
                      <img
                        src={logoPreview || settings.logoUrl}
                        alt={`${organization.name} logo`}
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLogoPreview(null)
                          updateSetting('logoUrl', '')
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-6">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Drop a logo here or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPEG, GIF, WebP, or SVG (max 5MB)
                      </p>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(',')}
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                  />
                </div>
              </div>

              <Separator />

              {/* Brand Colors */}
              <div className="space-y-4">
                <Label>Brand Colors</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.brandColor1}
                        onChange={(e) => updateSetting('brandColor1', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={settings.brandColor1}
                        onChange={(e) => updateSetting('brandColor1', e.target.value)}
                        className="font-mono text-sm"
                        placeholder="#4bbf39"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.brandColor2}
                        onChange={(e) => updateSetting('brandColor2', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={settings.brandColor2}
                        onChange={(e) => updateSetting('brandColor2', e.target.value)}
                        className="font-mono text-sm"
                        placeholder="#39bfb0"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Preview */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Preview:</span>
                  <div
                    className="h-8 w-24 rounded"
                    style={{
                      background: `linear-gradient(135deg, ${settings.brandColor1} 0%, ${settings.brandColor2} 100%)`
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="theme" className="mt-0 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable dark theme for this organization
                    </p>
                  </div>
                  <Switch
                    checked={settings.darkMode}
                    onCheckedChange={(checked) => updateSetting('darkMode', checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Use denser UI layout
                    </p>
                  </div>
                  <Switch
                    checked={settings.compactMode}
                    onCheckedChange={(checked) => updateSetting('compactMode', checked)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="mt-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => updateSetting('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select
                    value={settings.dateFormat}
                    onValueChange={(value) => updateSetting('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
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

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Digest</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive weekly summary emails
                    </p>
                  </div>
                  <Switch
                    checked={settings.weeklyDigest}
                    onCheckedChange={(checked) => updateSetting('weeklyDigest', checked)}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* Signal AI Tab - Uptrade Admin Only */}
            {isUptradeAdmin && (
              <TabsContent value="signal" className="mt-0 space-y-6">
                <div className="space-y-4">
                  {/* Signal Enable Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <Label className="text-base font-medium">Enable Signal AI</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enables AI features for all projects in this organization
                      </p>
                    </div>
                    <Switch
                      checked={settings.signalEnabled}
                      onCheckedChange={(checked) => updateSetting('signalEnabled', checked)}
                    />
                  </div>
                  
                  {/* Signal Enabled - Show Rate Limiting Controls */}
                  {settings.signalEnabled && (
                    <>
                      <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <Label className="text-sm font-medium">Enabled Features</Label>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">Echo AI Chat</Badge>
                          <Badge variant="secondary">Sync Signal</Badge>
                          <Badge variant="secondary">AI Skills</Badge>
                          <Badge variant="secondary">Knowledge Base</Badge>
                          <Badge variant="secondary">Memory & Learning</Badge>
                        </div>
                        {organization?.signal_enabled_at && (
                          <p className="text-xs text-muted-foreground">
                            Signal enabled since {new Date(organization.signal_enabled_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Rate Limiting Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Rate Limiting</Label>
                          <p className="text-xs text-muted-foreground">
                            Enforce token budget limits for this organization
                          </p>
                        </div>
                        <Switch
                          checked={settings.isRateLimited}
                          onCheckedChange={(checked) => updateSetting('isRateLimited', checked)}
                        />
                      </div>
                      
                      {/* Token Budget Controls */}
                      {settings.isRateLimited && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Token Budget</Label>
                            <Input
                              type="number"
                              placeholder="Unlimited"
                              value={settings.budgetTokens || ''}
                              onChange={(e) => updateSetting('budgetTokens', e.target.value ? parseInt(e.target.value) : null)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Leave empty for unlimited
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Reset Period</Label>
                            <Select 
                              value={settings.budgetPeriod || 'monthly'} 
                              onValueChange={(value) => updateSetting('budgetPeriod', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      
                      {/* Unlimited Warning */}
                      {!settings.isRateLimited && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                          <p className="text-sm text-amber-700 dark:text-amber-400">
                            ⚠️ Rate limiting is disabled. This organization has unlimited AI access.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {!settings.signalEnabled && (
                    <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground">
                      <p className="text-sm">
                        Enable Signal AI to unlock AI-powered features for this organization's projects.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex justify-between mt-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
