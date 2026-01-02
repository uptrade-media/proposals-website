// TenantSetupWizard.jsx
// Multi-step wizard for setting up a new tenant from a completed project
// Validates all configurations and ensures a complete setup

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Building2,
  Globe,
  BarChart3,
  FileText,
  Users,
  Mail,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Palette,
  Key,
  Check,
  X,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Shield,
  Code,
  Settings,
  ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

// Modules always included for every tenant (Uptrade internal tools)
const INCLUDED_MODULES = {
  billing: {
    key: 'billing',
    label: 'Billing',
    description: 'Invoices and payment management from Uptrade',
    icon: CreditCard,
  },
  messages: {
    key: 'messages',
    label: 'Messages',
    description: 'Direct messaging with Uptrade team',
    icon: Mail,
  },
  files: {
    key: 'files',
    label: 'Files',
    description: 'Shared file storage and document management',
    icon: FileText,
  },
  proposals: {
    key: 'proposals',
    label: 'Proposals',
    description: 'View and sign proposals from Uptrade',
    icon: ClipboardList,
  },
}

// Selectable tenant business modules
const TENANT_MODULES = {
  analytics: {
    key: 'analytics',
    label: 'Website Analytics',
    description: 'Track visitors, sessions, page views, scroll depth, and user behavior',
    icon: BarChart3,
    recommended: true,
    requiresSetup: ['domain'],
    tables: ['sessions', 'page_views', 'scroll_depth'],
    features: ['Real-time tracking', 'Scroll heatmaps', 'Conversion funnels', 'Traffic sources']
  },
  clients: {
    key: 'clients',
    label: 'Clients CRM',
    description: 'Track leads, contacts, and customer interactions for their business',
    icon: Users,
    recommended: true,
    requiresSetup: [],
    tables: ['contacts', 'activities', 'notes'],
    features: ['Contact management', 'Lead scoring', 'Activity timeline', 'Custom fields']
  },
  seo: {
    key: 'seo',
    label: 'SEO Manager',
    description: 'Search rankings, technical audits, keyword tracking, and optimization',
    icon: TrendingUp,
    recommended: true,
    requiresSetup: ['domain'],
    tables: ['seo_sites', 'seo_pages', 'seo_queries', 'seo_rankings'],
    features: ['Keyword tracking', 'Technical audits', 'GSC integration', 'AI recommendations']
  },
  ecommerce: {
    key: 'ecommerce',
    label: 'E-commerce',
    description: 'Product management, orders, and Shopify integration',
    icon: ShoppingBag,
    recommended: false,
    requiresSetup: ['shopify_store_domain', 'shopify_access_token'],
    tables: ['products', 'orders', 'order_items'],
    features: ['Product sync', 'Order tracking', 'Inventory management', 'Sales analytics']
  },
  forms: {
    key: 'forms',
    label: 'Forms',
    description: 'Create contact forms and collect submissions from their website',
    icon: ClipboardList,
    recommended: false,
    requiresSetup: [],
    tables: ['forms', 'form_submissions'],
    features: ['Form builder', 'Submission tracking', 'Email notifications', 'Spam protection']
  },
  blog: {
    key: 'blog',
    label: 'Blog Manager',
    description: 'Create and manage blog posts with AI-assisted SEO optimization',
    icon: FileText,
    recommended: false,
    requiresSetup: [],
    tables: ['blog_posts'],
    features: ['AI content generation', 'SEO optimization', 'Category management', 'Featured images']
  },
  email_manager: {
    key: 'email_manager',
    label: 'Outreach',
    description: 'Send email campaigns and SMS messages with automation',
    icon: Mail,
    recommended: false,
    requiresSetup: ['resend_api_key', 'resend_from_email'],
    tables: ['email_campaigns', 'email_templates', 'email_tracking', 'sms_campaigns'],
    features: ['Email campaigns', 'SMS messaging', 'Email templates', 'Subscriber lists', 'Analytics']
  },
}

// Wizard steps
const WIZARD_STEPS = [
  { id: 'info', label: 'Basic Info', icon: Building2 },
  { id: 'modules', label: 'Modules', icon: Settings },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'secrets', label: 'API Keys', icon: Key },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
]

// Validation helpers
const validateDomain = (domain) => {
  if (!domain) return { valid: false, error: 'Domain is required' }
  // Remove protocol if included
  const cleaned = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
  if (!domainRegex.test(cleaned)) {
    return { valid: false, error: 'Invalid domain format (e.g., example.com)' }
  }
  return { valid: true, cleaned }
}

const validateSlug = (slug) => {
  if (!slug) return { valid: false, error: 'Slug is required' }
  if (slug.length < 2) return { valid: false, error: 'Slug must be at least 2 characters' }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug must be lowercase letters, numbers, and hyphens only' }
  }
  return { valid: true }
}

const validateEmail = (email) => {
  if (!email) return { valid: false, error: 'Email is required' }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  return { valid: true }
}

export default function TenantSetupWizard({ 
  open, 
  onOpenChange, 
  project = null,
  onComplete 
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationResults, setValidationResults] = useState({})
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState(null)
  
  // Form state
  const [form, setForm] = useState({
    // Basic info
    name: '',
    slug: '',
    domain: '',
    adminEmail: '',
    adminName: '',
    
    // Selectable business modules (Uptrade modules are always included)
    modules: {
      analytics: true,
      clients: true,
      seo: true,
      ecommerce: false,
      forms: false,
      blog: false,
      email_manager: false,
    },
    
    // Branding
    theme: {
      primaryColor: '#4bbf39',
      logoUrl: '',
      faviconUrl: '',
    },
    
    // Secrets (only store temporarily for submission)
    secrets: {
      resend_api_key: '',
      resend_from_email: '',
      shopify_store_domain: '',
      shopify_access_token: '',
      square_access_token: '',
      square_location_id: '',
      square_environment: 'sandbox',
    },
  })
  
  // Initialize from project if provided
  useEffect(() => {
    if (project && open) {
      const contact = project.contact || {}
      setForm(prev => ({
        ...prev,
        name: project.title || '',
        slug: generateSlug(project.title || ''),
        domain: project.tenant_domain || contact.website || '',
        adminEmail: contact.email || '',
        adminName: contact.name || '',
        modules: project.tenant_modules || prev.modules,
        theme: {
          ...prev.theme,
          primaryColor: project.tenant_theme_color || '#4bbf39',
        },
      }))
      setCurrentStep(0)
    }
  }, [project, open])
  
  // Generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }
  
  // Auto-generate slug when name changes
  const handleNameChange = (name) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }))
    setSlugAvailable(null)
  }
  
  // Check if slug is available
  const checkSlugAvailability = async (slug) => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null)
      return
    }
    
    setSlugChecking(true)
    try {
      const response = await api.get(`/.netlify/functions/admin-tenants-check-slug?slug=${slug}`)
      setSlugAvailable(response.data.available)
    } catch {
      setSlugAvailable(null)
    } finally {
      setSlugChecking(false)
    }
  }
  
  // Debounced slug check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.slug) {
        checkSlugAvailability(form.slug)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.slug])
  
  // Calculate enabled modules
  const enabledModules = useMemo(() => {
    return Object.entries(form.modules)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => TENANT_MODULES[key])
      .filter(Boolean)
  }, [form.modules])
  
  // Calculate required secrets based on enabled modules
  const requiredSecrets = useMemo(() => {
    const secrets = new Set()
    enabledModules.forEach(module => {
      module.requiresSetup?.forEach(secret => {
        if (secret !== 'domain') { // domain is in basic info
          secrets.add(secret)
        }
      })
    })
    return Array.from(secrets)
  }, [enabledModules])
  
  // Validate current step
  const validateStep = (stepId) => {
    const errors = {}
    
    switch (stepId) {
      case 'info':
        const nameValid = form.name.length >= 2
        const slugValidation = validateSlug(form.slug)
        const domainValidation = validateDomain(form.domain)
        const emailValidation = form.adminEmail ? validateEmail(form.adminEmail) : { valid: true }
        
        if (!nameValid) errors.name = 'Name must be at least 2 characters'
        if (!slugValidation.valid) errors.slug = slugValidation.error
        if (slugAvailable === false) errors.slug = 'This slug is already taken'
        if (!domainValidation.valid) errors.domain = domainValidation.error
        if (!emailValidation.valid) errors.adminEmail = emailValidation.error
        break
        
      case 'modules':
        const hasModule = Object.values(form.modules).some(v => v)
        if (!hasModule) errors.modules = 'Select at least one module'
        break
        
      case 'branding':
        // Branding is optional but validate color format
        if (form.theme.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(form.theme.primaryColor)) {
          errors.primaryColor = 'Invalid color format (use hex like #4bbf39)'
        }
        break
        
      case 'secrets':
        // Validate required secrets based on enabled modules
        requiredSecrets.forEach(secretKey => {
          if (!form.secrets[secretKey]) {
            errors[secretKey] = `${secretKey.replace(/_/g, ' ')} is required for selected modules`
          }
        })
        break
    }
    
    return { valid: Object.keys(errors).length === 0, errors }
  }
  
  // Check if step is complete
  const isStepComplete = (stepId) => {
    const { valid } = validateStep(stepId)
    return valid
  }
  
  // Calculate overall progress
  const progress = useMemo(() => {
    let completed = 0
    WIZARD_STEPS.forEach(step => {
      if (isStepComplete(step.id)) completed++
    })
    return Math.round((completed / WIZARD_STEPS.length) * 100)
  }, [form, slugAvailable])
  
  // Navigate steps
  const goToStep = (stepIndex) => {
    if (stepIndex < currentStep || isStepComplete(WIZARD_STEPS[currentStep].id)) {
      setCurrentStep(stepIndex)
    }
  }
  
  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      const validation = validateStep(WIZARD_STEPS[currentStep].id)
      if (validation.valid) {
        setCurrentStep(prev => prev + 1)
      } else {
        setValidationResults(validation.errors)
      }
    }
  }
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }
  
  // Submit wizard
  const handleSubmit = async () => {
    // Final validation of all steps
    const allErrors = {}
    WIZARD_STEPS.forEach(step => {
      if (step.id !== 'review') {
        const { errors } = validateStep(step.id)
        Object.assign(allErrors, errors)
      }
    })
    
    if (Object.keys(allErrors).length > 0) {
      setValidationResults(allErrors)
      toast.error('Please fix all errors before submitting')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Prepare the payload
      const payload = {
        // If coming from a project, include projectId
        projectId: project?.id,
        
        // Basic info
        name: form.name,
        slug: form.slug,
        domain: form.domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        adminEmail: form.adminEmail || undefined,
        adminName: form.adminName || undefined,
        
        // Convert modules object to features format
        features: form.modules,
        
        // Branding
        theme: form.theme,
        
        // Secrets (only if provided)
        secrets: Object.fromEntries(
          Object.entries(form.secrets).filter(([_, v]) => v)
        ),
        
        // Plan defaults to free for now
        plan: 'starter',
      }
      
      // Call the setup API
      const response = await api.post('/.netlify/functions/tenant-setup-wizard', payload)
      
      if (response.data.success) {
        toast.success('🎉 Tenant created successfully!')
        onComplete?.(response.data)
        onOpenChange(false)
      } else {
        throw new Error(response.data.error || 'Failed to create tenant')
      }
    } catch (error) {
      console.error('Tenant setup error:', error)
      toast.error(error.response?.data?.error || error.message || 'Failed to create tenant')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Render step content
  const renderStepContent = () => {
    const step = WIZARD_STEPS[currentStep]
    
    switch (step.id) {
      case 'info':
        return <BasicInfoStep form={form} setForm={setForm} errors={validationResults} 
                              handleNameChange={handleNameChange} slugChecking={slugChecking}
                              slugAvailable={slugAvailable} />
      case 'modules':
        return <ModulesStep form={form} setForm={setForm} modules={TENANT_MODULES} />
      case 'branding':
        return <BrandingStep form={form} setForm={setForm} />
      case 'secrets':
        return <SecretsStep form={form} setForm={setForm} requiredSecrets={requiredSecrets}
                            enabledModules={enabledModules} />
      case 'review':
        return <ReviewStep form={form} modules={TENANT_MODULES} 
                           enabledModules={enabledModules} project={project} />
      default:
        return null
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            {project ? 'Convert to Web App' : 'Create New Tenant'}
          </DialogTitle>
          <DialogDescription>
            {project 
              ? `Set up "${project.title}" as a tenant with their own portal access`
              : 'Configure a new tenant organization with access to portal modules'
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Setup Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Step indicators */}
        <div className="flex items-center justify-between px-2">
          {WIZARD_STEPS.map((step, index) => {
            const StepIcon = step.icon
            const isActive = index === currentStep
            const isComplete = isStepComplete(step.id)
            const isPast = index < currentStep
            
            return (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : isPast || isComplete
                      ? 'text-emerald-600 hover:bg-emerald-50/50 cursor-pointer'
                      : 'text-[var(--text-tertiary)]'
                }`}
                disabled={!isPast && !isComplete && index > currentStep}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive 
                    ? 'bg-emerald-100'
                    : isComplete || isPast
                      ? 'bg-emerald-100'
                      : 'bg-[var(--glass-border)]'
                }`}>
                  {isComplete && !isActive ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-xs font-medium">{step.label}</span>
              </button>
            )
          })}
        </div>
        
        <Separator />
        
        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <Separator />
        
        {/* Navigation */}
        <DialogFooter className="flex items-center justify-between gap-4 sm:justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0 || isSubmitting}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            
            {currentStep === WIZARD_STEPS.length - 1 ? (
              <Button 
                variant="glass-primary" 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                Create Tenant
              </Button>
            ) : (
              <Button 
                variant="glass-primary" 
                onClick={nextStep}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Step Components
// ============================================

function BasicInfoStep({ form, setForm, errors, handleNameChange, slugChecking, slugAvailable }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Organization Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Client Company"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>
        
        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => setForm(prev => ({ 
                ...prev, 
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
              }))}
              placeholder="my-client-company"
              className={errors.slug ? 'border-red-500' : ''}
            />
            {slugChecking && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />}
            {!slugChecking && slugAvailable === true && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
            {!slugChecking && slugAvailable === false && (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Used in URLs: portal.uptrademedia.com/{form.slug || 'slug'}
          </p>
          {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
        </div>
        
        {/* Domain */}
        <div className="space-y-2">
          <Label htmlFor="domain">Website Domain *</Label>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--text-tertiary)]" />
            <Input
              id="domain"
              value={form.domain}
              onChange={(e) => setForm(prev => ({ ...prev, domain: e.target.value }))}
              placeholder="example.com"
              className={errors.domain ? 'border-red-500' : ''}
            />
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            The client's website where tracking will be installed
          </p>
          {errors.domain && <p className="text-sm text-red-500">{errors.domain}</p>}
        </div>
        
        <Separator />
        
        {/* Admin User (Optional) */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Admin User (Optional)</h4>
            <p className="text-xs text-[var(--text-tertiary)]">
              Set up an admin user who will have access to this tenant's portal
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">Name</Label>
              <Input
                id="adminName"
                value={form.adminName}
                onChange={(e) => setForm(prev => ({ ...prev, adminName: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                placeholder="john@example.com"
                className={errors.adminEmail ? 'border-red-500' : ''}
              />
              {errors.adminEmail && <p className="text-sm text-red-500">{errors.adminEmail}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModulesStep({ form, setForm, modules }) {
  const toggleModule = (key) => {
    setForm(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [key]: !prev.modules[key]
      }
    }))
  }
  
  return (
    <div className="space-y-6">
      {/* Always Included - Uptrade Modules */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          Always Included
        </h4>
        <p className="text-xs text-[var(--text-tertiary)] mb-3">
          These core modules are included with every tenant for Uptrade to manage the relationship.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.values(INCLUDED_MODULES).map((module) => {
            const ModuleIcon = module.icon
            return (
              <div
                key={module.key}
                className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200"
              >
                <ModuleIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">{module.label}</span>
              </div>
            )
          })}
        </div>
      </div>
      
      <Separator />
      
      {/* Selectable Business Modules */}
      <div>
        <h4 className="text-sm font-medium mb-1">Business Modules</h4>
        <p className="text-sm text-[var(--text-secondary)]">
          Select which features this tenant can use for their business. You can change these later.
        </p>
      </div>
      
      <div className="grid gap-3">
        {Object.values(modules).map((module) => {
          const ModuleIcon = module.icon
          const isEnabled = form.modules[module.key]
          
          return (
            <div
              key={module.key}
              onClick={() => toggleModule(module.key)}
              className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                isEnabled 
                  ? 'border-emerald-200 bg-emerald-50/50' 
                  : 'border-[var(--glass-border)] hover:border-[var(--text-tertiary)]'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isEnabled ? 'bg-emerald-100' : 'bg-[var(--glass-bg)]'
              }`}>
                <ModuleIcon className={`w-5 h-5 ${isEnabled ? 'text-emerald-600' : 'text-[var(--text-tertiary)]'}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{module.label}</span>
                  {module.recommended && (
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  )}
                  {module.requiresSetup?.length > 0 && (
                    <Badge variant="outline" className="text-xs">Requires Setup</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{module.description}</p>
                
                {isEnabled && module.features && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {module.features.slice(0, 4).map((feature, i) => (
                      <Badge key={i} variant="outline" className="text-xs font-normal">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <Switch
                checked={isEnabled}
                onCheckedChange={() => toggleModule(module.key)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BrandingStep({ form, setForm }) {
  const presetColors = ['#4bbf39', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#14b8a6', '#64748b']
  
  return (
    <div className="space-y-6">
      {/* Primary Color */}
      <div className="space-y-4">
        <div>
          <Label>Brand Color</Label>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Used for buttons, links, and accents throughout the portal
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={form.theme.primaryColor}
            onChange={(e) => setForm(prev => ({
              ...prev,
              theme: { ...prev.theme, primaryColor: e.target.value }
            }))}
            className="w-12 h-12 rounded-lg border cursor-pointer"
          />
          <Input
            value={form.theme.primaryColor}
            onChange={(e) => setForm(prev => ({
              ...prev,
              theme: { ...prev.theme, primaryColor: e.target.value }
            }))}
            className="w-28"
          />
        </div>
        
        <div className="flex gap-2">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => setForm(prev => ({
                ...prev,
                theme: { ...prev.theme, primaryColor: color }
              }))}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                form.theme.primaryColor === color 
                  ? 'border-[var(--text-primary)] scale-110' 
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      
      <Separator />
      
      {/* Logo URL */}
      <div className="space-y-2">
        <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
        <Input
          id="logoUrl"
          value={form.theme.logoUrl}
          onChange={(e) => setForm(prev => ({
            ...prev,
            theme: { ...prev.theme, logoUrl: e.target.value }
          }))}
          placeholder="https://example.com/logo.png"
        />
        <p className="text-xs text-[var(--text-tertiary)]">
          Square logo, at least 200x200px. PNG or SVG recommended.
        </p>
        
        {form.theme.logoUrl && (
          <div className="mt-2 p-4 bg-[var(--glass-bg)] rounded-lg flex items-center justify-center">
            <img 
              src={form.theme.logoUrl} 
              alt="Logo preview" 
              className="max-h-16 max-w-full object-contain"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        )}
      </div>
      
      {/* Favicon URL */}
      <div className="space-y-2">
        <Label htmlFor="faviconUrl">Favicon URL (Optional)</Label>
        <Input
          id="faviconUrl"
          value={form.theme.faviconUrl}
          onChange={(e) => setForm(prev => ({
            ...prev,
            theme: { ...prev.theme, faviconUrl: e.target.value }
          }))}
          placeholder="https://example.com/favicon.ico"
        />
      </div>
    </div>
  )
}

function SecretsStep({ form, setForm, requiredSecrets, enabledModules }) {
  if (requiredSecrets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
        <h4 className="text-lg font-medium mb-2">No API Keys Required</h4>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">
          The modules you've selected don't require any external API keys. 
          You can proceed to the review step.
        </p>
      </div>
    )
  }
  
  const secretConfig = {
    resend_api_key: { label: 'Resend API Key', type: 'password', help: 'Get from resend.com/api-keys', module: 'Email Campaigns' },
    resend_from_email: { label: 'From Email', type: 'email', help: 'Verified sender email in Resend', module: 'Email Campaigns' },
    shopify_store_domain: { label: 'Shopify Store Domain', type: 'text', help: 'yourstore.myshopify.com', module: 'E-commerce' },
    shopify_access_token: { label: 'Shopify Access Token', type: 'password', help: 'From Shopify Admin > Apps', module: 'E-commerce' },
    square_access_token: { label: 'Square Access Token', type: 'password', help: 'From Square Developer Dashboard', module: 'Billing' },
    square_location_id: { label: 'Square Location ID', type: 'text', help: 'Your Square location ID', module: 'Billing' },
  }
  
  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="w-4 h-4" />
        <AlertDescription>
          API keys are encrypted and stored securely. They're never exposed in the frontend.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
        {requiredSecrets.map((secretKey) => {
          const config = secretConfig[secretKey]
          if (!config) return null
          
          return (
            <div key={secretKey} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={secretKey}>{config.label}</Label>
                <Badge variant="outline" className="text-xs">{config.module}</Badge>
              </div>
              <Input
                id={secretKey}
                type={config.type}
                value={form.secrets[secretKey] || ''}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  secrets: { ...prev.secrets, [secretKey]: e.target.value }
                }))}
                placeholder={`Enter ${config.label.toLowerCase()}`}
              />
              <p className="text-xs text-[var(--text-tertiary)]">{config.help}</p>
            </div>
          )
        })}
      </div>
      
      <div className="p-4 bg-[var(--glass-bg)] rounded-lg">
        <p className="text-sm text-[var(--text-secondary)]">
          💡 <strong>Tip:</strong> You can skip this step and add API keys later from the tenant settings.
          Some features won't work until the required keys are configured.
        </p>
      </div>
    </div>
  )
}

function ReviewStep({ form, modules, enabledModules, project }) {
  const [copied, setCopied] = useState(false)
  
  const trackingScript = `<!-- Uptrade Portal Analytics -->
<script>
  window.UPTRADE_CONFIG = {
    orgSlug: '${form.slug}',
    domain: '${form.domain}'
  };
</script>
<script src="https://portal.uptrademedia.com/tracking.js" defer></script>`
  
  const copyScript = () => {
    navigator.clipboard.writeText(trackingScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="p-4 bg-[var(--glass-bg)] rounded-lg space-y-2">
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">Organization</h4>
          <p className="font-semibold">{form.name}</p>
          <p className="text-sm text-[var(--text-secondary)]">/{form.slug}</p>
        </div>
        
        <div className="p-4 bg-[var(--glass-bg)] rounded-lg space-y-2">
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">Domain</h4>
          <p className="font-semibold">{form.domain || 'Not set'}</p>
          {form.adminEmail && (
            <p className="text-sm text-[var(--text-secondary)]">Admin: {form.adminEmail}</p>
          )}
        </div>
      </div>
      
      {/* Enabled Modules */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Enabled Modules ({enabledModules.length})</h4>
        <div className="flex flex-wrap gap-2">
          {enabledModules.map((module) => {
            const ModuleIcon = module.icon
            return (
              <Badge key={module.key} variant="secondary" className="gap-1 py-1 px-2">
                <ModuleIcon className="w-3 h-3" />
                {module.label}
              </Badge>
            )
          })}
        </div>
      </div>
      
      {/* Branding Preview */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Branding</h4>
        <div className="flex items-center gap-4">
          <div 
            className="w-8 h-8 rounded-lg"
            style={{ backgroundColor: form.theme.primaryColor }}
          />
          <span className="text-sm font-mono">{form.theme.primaryColor}</span>
          {form.theme.logoUrl && (
            <img 
              src={form.theme.logoUrl} 
              alt="Logo" 
              className="h-8 object-contain"
            />
          )}
        </div>
      </div>
      
      <Separator />
      
      {/* Tracking Script Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Code className="w-4 h-4" />
            Tracking Script
          </h4>
          <Button variant="ghost" size="sm" onClick={copyScript} className="gap-1">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <pre className="p-3 bg-[var(--bg-primary)] rounded-lg text-xs overflow-x-auto border">
          <code>{trackingScript}</code>
        </pre>
        <p className="text-xs text-[var(--text-tertiary)]">
          Add this script to the client's website to enable analytics tracking.
        </p>
      </div>
      
      {/* Conversion note */}
      {project && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            Project <strong>"{project.title}"</strong> will be converted to a tenant.
            The project will be marked as a web app and the client will receive portal access.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
