// src/components/signal/SignalProfileEditor.jsx
// Edit client profile snapshot - brand, services, tone, contact info, CTA rules
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  MessageSquare,
  MapPin,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Target,
  ShieldAlert,
  UserCheck,
  Save,
  Loader2,
  Plus,
  X,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Check,
  Gauge
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSignalStore } from '@/lib/signal-store'
import { getIndustryOptions, applyIndustryTemplate } from '@/lib/signal-industry-templates'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

// =============================================================================
// TOKEN COUNTING - Estimate tokens from profile content
// =============================================================================
const RECOMMENDED_MAX_TOKENS = 1500
const WARNING_THRESHOLD = 1200

/**
 * Estimate token count from text (roughly 4 characters per token for English)
 * This is a simple heuristic that works well for most content.
 */
function estimateTokens(text) {
  if (!text) return 0
  // Remove extra whitespace and count
  const cleaned = String(text).replace(/\s+/g, ' ').trim()
  return Math.ceil(cleaned.length / 4)
}

/**
 * Calculate total tokens for entire profile snapshot
 */
function calculateProfileTokens(profile) {
  let totalChars = 0
  
  // String fields
  const stringFields = ['brandName', 'shortDescription', 'address', 'phone', 'email', 'pricingModel', 'bookingFlow']
  stringFields.forEach(field => {
    if (profile[field]) totalChars += String(profile[field]).length
  })
  
  // Array fields (joined)
  const arrayFields = ['toneRules', 'primaryServices', 'serviceCategories', 'serviceArea', 'ctaRules', 'doNotOffer', 'complianceNotes', 'requiredFields', 'optionalFields', 'qualifyingQuestions']
  arrayFields.forEach(field => {
    if (Array.isArray(profile[field])) {
      totalChars += profile[field].join(' ').length
    }
  })
  
  // Hours object
  if (profile.hours) {
    totalChars += Object.values(profile.hours).filter(Boolean).join(' ').length
  }
  
  return Math.ceil(totalChars / 4)
}

const SECTION_ICONS = {
  identity: Building2,
  tone: MessageSquare,
  location: MapPin,
  conversion: Target,
  constraints: ShieldAlert,
  leads: UserCheck
}

export default function SignalProfileEditor({ 
  projectId, 
  siteId,
  initialProfile,
  onSave,
  className 
}) {
  const { moduleConfig, updateModuleConfig, moduleConfigLoading } = useSignalStore()
  
  const [profile, setProfile] = useState({
    brandName: '',
    shortDescription: '',
    toneRules: [],
    primaryServices: [],
    serviceCategories: [],
    serviceArea: [],
    address: '',
    phone: '',
    email: '',
    hours: { 'mon-fri': '', 'sat': '', 'sun': '' },
    pricingModel: '',
    bookingFlow: '',
    ctaRules: [],
    doNotOffer: [],
    complianceNotes: [],
    requiredFields: ['name', 'email'],
    optionalFields: [],
    qualifyingQuestions: []
  })
  
  const [activeTab, setActiveTab] = useState('identity')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState('')

  // Industry options for dropdown
  const industryOptions = getIndustryOptions()

  // Load initial profile
  useEffect(() => {
    if (initialProfile) {
      setProfile(prev => ({ ...prev, ...initialProfile }))
    } else if (moduleConfig?.profile_snapshot) {
      setProfile(prev => ({ ...prev, ...moduleConfig.profile_snapshot }))
    }
    // Set industry from config
    if (moduleConfig?.industry) {
      setSelectedIndustry(moduleConfig.industry)
    }
  }, [initialProfile, moduleConfig])

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleArrayChange = (field, value) => {
    // Convert comma-separated string to array
    const items = value.split(',').map(s => s.trim()).filter(Boolean)
    handleChange(field, items)
  }

  const handleArrayAdd = (field, value) => {
    if (!value.trim()) return
    setProfile(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()]
    }))
    setHasChanges(true)
  }

  const handleArrayRemove = (field, index) => {
    setProfile(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
    setHasChanges(true)
  }

  const handleHoursChange = (day, value) => {
    setProfile(prev => ({
      ...prev,
      hours: { ...prev.hours, [day]: value }
    }))
    setHasChanges(true)
  }

  // Handle industry change - apply template
  const handleIndustryChange = (industry) => {
    setSelectedIndustry(industry)
    const updatedProfile = applyIndustryTemplate(industry, profile)
    setProfile(updatedProfile)
    setHasChanges(true)
  }

  // Refresh profile from website content
  const handleRefreshFromWebsite = async () => {
    setRefreshing(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      // First, re-extract the profile
      await api.post('/.netlify/functions/signal-profile-extract', {
        projectId,
        siteId
      })
      
      // Then sync to profile_snapshot
      const syncRes = await api.post('/.netlify/functions/signal-profile-sync', {
        projectId,
        siteId,
        forceRefresh: true
      })
      
      if (syncRes.data.synced && syncRes.data.profileSnapshot) {
        // Update local profile with synced data
        setProfile(prev => ({
          ...prev,
          ...syncRes.data.profileSnapshot
        }))
        
        if (syncRes.data.industry) {
          setSelectedIndustry(syncRes.data.industry)
        }
        
        setSuccessMessage(`Profile refreshed! Updated: ${syncRes.data.syncedFields?.join(', ') || 'all fields'}`)
        setHasChanges(true)
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        throw new Error(syncRes.data.message || 'No changes to sync')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to refresh from website')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    
    try {
      await updateModuleConfig(projectId, {
        profile_snapshot: profile,
        industry: selectedIndustry
      })
      setHasChanges(false)
      setSuccessMessage('Profile saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      onSave?.(profile)
    } catch (err) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  // Check if profile was auto-populated
  const isAutoPopulated = moduleConfig?.auto_populated_at
  const autoPopulatedDate = isAutoPopulated 
    ? new Date(moduleConfig.auto_populated_at).toLocaleDateString()
    : null

  // Calculate token count from current profile
  const tokenCount = useMemo(() => calculateProfileTokens(profile), [profile])
  const tokenPercentage = Math.min(100, (tokenCount / RECOMMENDED_MAX_TOKENS) * 100)
  const isOverRecommended = tokenCount > RECOMMENDED_MAX_TOKENS
  const isNearLimit = tokenCount > WARNING_THRESHOLD

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Client Profile Snapshot</CardTitle>
                {isAutoPopulated && (
                  <Badge variant="secondary" className="gap-1 bg-emerald-500/20 text-emerald-400">
                    <Check className="h-3 w-3" />
                    Auto-populated
                  </Badge>
                )}
              </div>
              <CardDescription className="flex items-center gap-2">
                <span>Core knowledge injected into every AI response</span>
                {autoPopulatedDate && (
                  <span className="text-xs text-muted-foreground">
                    • Synced {autoPopulatedDate}
                  </span>
                )}
              </CardDescription>
              
              {/* Token Count Display */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <Gauge className={cn(
                    "h-4 w-4",
                    isOverRecommended ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-emerald-500"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isOverRecommended ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-emerald-500"
                  )}>
                    {tokenCount.toLocaleString()} / {RECOMMENDED_MAX_TOKENS.toLocaleString()} tokens
                  </span>
                </div>
                <Progress 
                  value={tokenPercentage} 
                  className={cn(
                    "w-24 h-2",
                    isOverRecommended && "[&>div]:bg-red-500",
                    isNearLimit && !isOverRecommended && "[&>div]:bg-amber-500",
                    !isNearLimit && "[&>div]:bg-emerald-500"
                  )}
                />
                {isOverRecommended && (
                  <Badge variant="destructive" className="text-xs">
                    Over recommended max
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshFromWebsite}
              disabled={refreshing}
              className="gap-2"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Re-extract from Website
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="mt-4 border-emerald-500/30 bg-emerald-500/10">
            <Check className="h-4 w-4 text-emerald-400" />
            <AlertDescription className="text-emerald-400">{successMessage}</AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
            <TabsTrigger value="identity" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Identity</span>
            </TabsTrigger>
            <TabsTrigger value="tone" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tone</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Location</span>
            </TabsTrigger>
            <TabsTrigger value="conversion" className="gap-1.5">
              <Target className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Conversion</span>
            </TabsTrigger>
            <TabsTrigger value="constraints" className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Constraints</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Leads</span>
            </TabsTrigger>
          </TabsList>

          {/* Identity Tab */}
          <TabsContent value="identity" className="space-y-4">
            <div className="grid gap-4">
              {/* Industry Selector */}
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={selectedIndustry} onValueChange={handleIndustryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an industry for smart defaults..." />
                  </SelectTrigger>
                  <SelectContent>
                    {industryOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecting an industry will pre-fill smart defaults for tone, CTAs, and lead capture
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name</Label>
                <Input
                  id="brandName"
                  value={profile.brandName}
                  onChange={(e) => handleChange('brandName', e.target.value)}
                  placeholder="Acme Roofing"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Textarea
                  id="shortDescription"
                  value={profile.shortDescription}
                  onChange={(e) => handleChange('shortDescription', e.target.value)}
                  placeholder="Tampa Bay's trusted roofing experts since 1985..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  1-2 sentences describing the business
                </p>
              </div>

              <div className="space-y-2">
                <Label>Primary Services</Label>
                <TagInput
                  tags={profile.primaryServices}
                  onAdd={(v) => handleArrayAdd('primaryServices', v)}
                  onRemove={(i) => handleArrayRemove('primaryServices', i)}
                  placeholder="Add a service..."
                />
              </div>

              <div className="space-y-2">
                <Label>Service Categories</Label>
                <TagInput
                  tags={profile.serviceCategories}
                  onAdd={(v) => handleArrayAdd('serviceCategories', v)}
                  onRemove={(i) => handleArrayRemove('serviceCategories', i)}
                  placeholder="Add a category..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Tone Tab */}
          <TabsContent value="tone" className="space-y-4">
            <div className="space-y-2">
              <Label>Tone Rules</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Instructions for how Signal should communicate
              </p>
              <TagInput
                tags={profile.toneRules}
                onAdd={(v) => handleArrayAdd('toneRules', v)}
                onRemove={(i) => handleArrayRemove('toneRules', i)}
                placeholder="e.g., Professional but friendly..."
              />
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-2">Example tone rules:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>"Professional but friendly"</li>
                <li>"Use 'we' and 'our team' instead of 'I'"</li>
                <li>"Avoid technical jargon"</li>
                <li>"Be reassuring about costs and timelines"</li>
                <li>"Match the customer's energy level"</li>
              </ul>
            </div>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Service Area</Label>
                <TagInput
                  tags={profile.serviceArea}
                  onAdd={(v) => handleArrayAdd('serviceArea', v)}
                  onRemove={(i) => handleArrayRemove('serviceArea', i)}
                  placeholder="Add a city or region..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={profile.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 Main St, Tampa, FL 33601"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="(813) 555-0123"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profile.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="info@example.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Business Hours</Label>
                <div className="grid gap-2">
                  {Object.entries(profile.hours || {}).map(([day, hours]) => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-sm w-20 capitalize">{day}:</span>
                      <Input
                        value={hours}
                        onChange={(e) => handleHoursChange(day, e.target.value)}
                        placeholder="9am-5pm or Closed"
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Conversion Tab */}
          <TabsContent value="conversion" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricingModel">Pricing Model</Label>
                <Textarea
                  id="pricingModel"
                  value={profile.pricingModel}
                  onChange={(e) => handleChange('pricingModel', e.target.value)}
                  placeholder="Project-based, starting at $X. Free estimates. Financing available."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookingFlow">Booking Flow</Label>
                <Textarea
                  id="bookingFlow"
                  value={profile.bookingFlow}
                  onChange={(e) => handleChange('bookingFlow', e.target.value)}
                  placeholder="Schedule a free consultation via our online calendar or call..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>CTA Rules</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  When to push specific calls-to-action
                </p>
                <TagInput
                  tags={profile.ctaRules}
                  onAdd={(v) => handleArrayAdd('ctaRules', v)}
                  onRemove={(i) => handleArrayRemove('ctaRules', i)}
                  placeholder="e.g., Always offer free audit..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Constraints Tab */}
          <TabsContent value="constraints" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Do Not Offer</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Services or products Signal should never suggest
                </p>
                <TagInput
                  tags={profile.doNotOffer}
                  onAdd={(v) => handleArrayAdd('doNotOffer', v)}
                  onRemove={(i) => handleArrayRemove('doNotOffer', i)}
                  placeholder="e.g., Logo design, Print materials..."
                />
              </div>

              <div className="space-y-2">
                <Label>Compliance Notes</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Legal disclaimers and required statements
                </p>
                <TagInput
                  tags={profile.complianceNotes}
                  onAdd={(v) => handleArrayAdd('complianceNotes', v)}
                  onRemove={(i) => handleArrayRemove('complianceNotes', i)}
                  placeholder="e.g., Not financial advice, Results may vary..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Required Fields</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Must collect these before creating a lead
                </p>
                <TagInput
                  tags={profile.requiredFields}
                  onAdd={(v) => handleArrayAdd('requiredFields', v)}
                  onRemove={(i) => handleArrayRemove('requiredFields', i)}
                  placeholder="e.g., name, email, phone..."
                />
              </div>

              <div className="space-y-2">
                <Label>Optional Fields</Label>
                <TagInput
                  tags={profile.optionalFields}
                  onAdd={(v) => handleArrayAdd('optionalFields', v)}
                  onRemove={(i) => handleArrayRemove('optionalFields', i)}
                  placeholder="e.g., company, budget, timeline..."
                />
              </div>

              <div className="space-y-2">
                <Label>Qualifying Questions</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Questions to ask to qualify leads
                </p>
                <TagInput
                  tags={profile.qualifyingQuestions}
                  onAdd={(v) => handleArrayAdd('qualifyingQuestions', v)}
                  onRemove={(i) => handleArrayRemove('qualifyingQuestions', i)}
                  placeholder="e.g., What's your monthly ad spend?..."
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Tag Input Component
function TagInput({ tags = [], onAdd, onRemove, placeholder }) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) {
        onAdd(input)
        setInput('')
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        <AnimatePresence>
          {tags.map((tag, index) => (
            <motion.div
              key={`${tag}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge 
                variant="secondary" 
                className="gap-1 pr-1 hover:bg-destructive/20 transition-colors"
              >
                {tag}
                <button
                  onClick={() => onRemove(index)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            if (input.trim()) {
              onAdd(input)
              setInput('')
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
