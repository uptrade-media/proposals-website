/**
 * @uptrade/site-kit/setup - Conversational Setup Assistant
 * 
 * AI-powered conversational interface for setting up site-kit.
 * Uses Echo/Signal to guide users through configuration.
 * 
 * Features:
 * - Streaming AI responses for real-time feedback
 * - Brand extraction from existing websites
 * - Module recommendations based on business type
 * - Integration verification
 * - Copilot instructions generation
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

// ============================================
// Types
// ============================================

interface Message {
  id: string
  role: 'assistant' | 'user' | 'system'
  content: string
  timestamp: Date
  actions?: ActionButton[]
  component?: React.ReactNode
  isStreaming?: boolean
}

interface ActionButton {
  id: string
  label: string
  action: string
  variant?: 'primary' | 'secondary' | 'outline'
  data?: Record<string, unknown>
}

interface SetupContext {
  flow: 'new' | 'existing' | 'rebuild' | null
  step: string
  project_id?: string
  org_id?: string
  domain?: string
  business_type?: string
  scan_results?: ScanResults
  scrape_results?: ScrapeResults
  selected_modules?: string[]
  brand?: BrandInfo
}

interface ScanResults {
  forms: { file: string; form_library: string; fields: number }[]
  widgets: { file: string; widget_type: string }[]
  metadata: { file: string; type: string }[]
  sitemaps: { file: string; type: string }[]
}

interface ScrapeResults {
  scrape_id: string
  domain: string
  pages_found: number
  faqs_imported: number
  routes: { path: string; title: string }[]
  brand?: BrandInfo
}

interface BrandInfo {
  business_name: string
  tagline?: string
  primary_color?: string
  secondary_color?: string
  logo_url?: string
  phone_numbers?: string[]
  email_addresses?: string[]
  social_profiles?: Record<string, string>
}

interface SetupState {
  step: 'welcome' | 'auth' | 'project' | 'modules' | 'config' | 'verify' | 'complete'
  isAuthenticated: boolean
  userEmail?: string
  accessToken?: string
  selectedOrg?: { id: string; name: string }
  selectedProject?: { id: string; name: string; domain: string }
  selectedModules: string[]
  config: Record<string, unknown>
  errors: string[]
  context: SetupContext
}

interface SetupAssistantProps {
  /** Portal API URL */
  apiUrl?: string
  
  /** Signal API URL for AI chat */
  signalUrl?: string
  
  /** Supabase URL for auth */
  supabaseUrl?: string
  
  /** Supabase anon key */
  supabaseKey?: string
  
  /** Pre-selected project ID (if coming from Portal) */
  projectId?: string
  
  /** Pre-selected org ID (if coming from Portal) */
  orgId?: string
  
  /** Auth token (if already authenticated) */
  authToken?: string
  
  /** Callback when setup is complete */
  onComplete?: (config: SetupState) => void
  
  /** Custom welcome message */
  welcomeMessage?: string
}

// ============================================
// Styles (inline for portability)
// ============================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '1rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 0',
    borderBottom: '1px solid #e5e7eb',
  },
  logo: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  messages: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '1rem 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  message: {
    display: 'flex',
    gap: '0.75rem',
    maxWidth: '85%',
  },
  messageAssistant: {
    alignSelf: 'flex-start',
  },
  messageUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse' as const,
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  avatarAssistant: {
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
  },
  avatarUser: {
    background: '#e5e7eb',
    color: '#374151',
  },
  bubble: {
    padding: '0.75rem 1rem',
    borderRadius: '1rem',
    fontSize: '0.9375rem',
    lineHeight: '1.5',
  },
  bubbleAssistant: {
    background: '#f3f4f6',
    color: '#111827',
    borderTopLeftRadius: '4px',
  },
  bubbleUser: {
    background: '#3b82f6',
    color: 'white',
    borderTopRightRadius: '4px',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
    marginTop: '0.75rem',
  },
  actionButton: {
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s',
  },
  actionPrimary: {
    background: '#3b82f6',
    color: 'white',
  },
  actionSecondary: {
    background: '#e5e7eb',
    color: '#374151',
  },
  actionOutline: {
    background: 'transparent',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
  },
  inputContainer: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem 0',
    borderTop: '1px solid #e5e7eb',
  },
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    border: '1px solid #d1d5db',
    fontSize: '0.9375rem',
    outline: 'none',
  },
  sendButton: {
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    fontWeight: '500',
    cursor: 'pointer',
  },
  typing: {
    display: 'flex',
    gap: '4px',
    padding: '0.75rem 1rem',
    background: '#f3f4f6',
    borderRadius: '1rem',
    width: 'fit-content',
  },
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#9ca3af',
    animation: 'typing 1.4s infinite',
  },
  moduleCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  moduleCardSelected: {
    borderColor: '#3b82f6',
    background: '#eff6ff',
  },
  moduleIcon: {
    fontSize: '1.5rem',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    fontWeight: '500',
    color: '#111827',
  },
  moduleDesc: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    accentColor: '#3b82f6',
  },
}

// ============================================
// Available Modules
// ============================================

const MODULES = [
  { id: 'analytics', name: 'Analytics', icon: '📊', description: 'Page views, events, sessions, web vitals', recommended: true },
  { id: 'seo', name: 'SEO', icon: '🔍', description: 'Managed FAQs, meta tags, schema markup', recommended: true },
  { id: 'forms', name: 'Forms', icon: '📝', description: 'Portal-managed forms with submissions', recommended: true },
  { id: 'engage', name: 'Engage', icon: '💬', description: 'Live chat, popups, nudges, banners', recommended: false },
  { id: 'commerce', name: 'Commerce', icon: '🛒', description: 'Products, services, checkout', recommended: false },
  { id: 'signal', name: 'Signal AI', icon: '🤖', description: 'Autonomous optimization & A/B testing', recommended: false },
]

// ============================================
// Setup Assistant Component
// ============================================

export function SetupAssistant({
  apiUrl = 'https://api.uptrademedia.com',
  signalUrl = 'https://signal.uptrademedia.com',
  supabaseUrl,
  supabaseKey,
  projectId,
  orgId,
  authToken,
  onComplete,
  welcomeMessage,
}: SetupAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [state, setState] = useState<SetupState>({
    step: 'welcome',
    isAuthenticated: !!authToken,
    selectedModules: ['analytics', 'seo', 'forms'],
    config: {},
    errors: [],
    context: {
      flow: null,
      step: 'welcome',
      project_id: projectId,
      org_id: orgId,
    },
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const streamingMessageRef = useRef<string | null>(null)
  
  // ============================================
  // Signal API Integration with Streaming
  // ============================================
  
  const sendToSignalStreaming = useCallback(async (
    message: string, 
    context: SetupContext,
    onToken: (token: string) => void,
    onComplete: (result: { actions?: ActionButton[]; updated_context?: Partial<SetupContext> }) => void
  ): Promise<void> => {
    try {
      const response = await fetch(`${signalUrl}/api/skills/setup/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          message,
          context,
          project_id: projectId,
          org_id: orgId,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Signal API error')
      }
      
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')
      
      const decoder = new TextDecoder()
      let buffer = ''
      let actions: ActionButton[] = []
      let updatedContext: Partial<SetupContext> = {}
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const event = JSON.parse(data)
              
              if (event.type === 'token') {
                onToken(event.content)
              } else if (event.type === 'actions') {
                actions = event.actions
              } else if (event.type === 'context') {
                updatedContext = event.context
              }
            } catch {
              // Non-JSON data, treat as token
              onToken(data)
            }
          }
        }
      }
      
      onComplete({ actions, updated_context: updatedContext })
    } catch (error) {
      console.error('Signal streaming error:', error)
      // Fallback to non-streaming
      const result = await sendToSignal(message, context)
      onToken(result.response)
      onComplete({ actions: result.actions, updated_context: result.updated_context })
    }
  }, [signalUrl, authToken, projectId, orgId])
  
  const sendToSignal = useCallback(async (message: string, context: SetupContext): Promise<{
    response: string
    actions?: ActionButton[]
    updated_context?: Partial<SetupContext>
  }> => {
    try {
      const response = await fetch(`${signalUrl}/api/skills/setup/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          message,
          context,
          project_id: projectId,
          org_id: orgId,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Signal API error')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Signal API error:', error)
      // Fallback to local handling
      return {
        response: 'I had trouble connecting to Signal. Let me help you locally.',
        actions: [
          { id: '1', label: 'Continue', action: 'continue_local', variant: 'primary' },
        ],
      }
    }
  }, [signalUrl, authToken, projectId, orgId])
  
  // ============================================
  // Brand Extraction
  // ============================================
  
  const extractBrandFromDomain = useCallback(async (domain: string): Promise<BrandInfo | null> => {
    setIsExtracting(true)
    try {
      const response = await fetch(`${apiUrl}/site-scrape/brand-only`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ domain }),
      })
      
      if (!response.ok) {
        throw new Error('Brand extraction failed')
      }
      
      const data = await response.json()
      return {
        business_name: data.business_name,
        tagline: data.tagline,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        logo_url: data.logo_url,
        phone_numbers: data.phone_numbers,
        email_addresses: data.email_addresses,
        social_profiles: data.social_profiles,
      }
    } catch (error) {
      console.error('Brand extraction error:', error)
      return null
    } finally {
      setIsExtracting(false)
    }
  }, [apiUrl, authToken])

  // ============================================
  // Message Helpers
  // ============================================
  
  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }, [])
  
  const updateMessage = useCallback((id: string, update: Partial<Message>) => {
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, ...update } : m
    ))
  }, [])
  
  const addStreamingMessage = useCallback(() => {
    const id = crypto.randomUUID()
    const newMessage: Message = {
      id,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    setMessages(prev => [...prev, newMessage])
    streamingMessageRef.current = id
    return id
  }, [])
  
  const appendToStreamingMessage = useCallback((token: string) => {
    const id = streamingMessageRef.current
    if (!id) return
    
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, content: m.content + token } : m
    ))
  }, [])
  
  const finalizeStreamingMessage = useCallback((actions?: ActionButton[]) => {
    const id = streamingMessageRef.current
    if (!id) return
    
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, isStreaming: false, actions } : m
    ))
    streamingMessageRef.current = null
  }, [])
  
  const addAssistantMessage = useCallback((
    content: string, 
    actions?: ActionButton[],
    component?: React.ReactNode
  ) => {
    setIsTyping(true)
    // Simulate typing delay
    setTimeout(() => {
      setIsTyping(false)
      addMessage({ role: 'assistant', content, actions, component })
    }, 500 + Math.random() * 500)
  }, [addMessage])
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  
  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  // ============================================
  // Welcome Flow
  // ============================================
  
  useEffect(() => {
    // Initial welcome message with flow selection
    const welcome = welcomeMessage || 
      `Hey! 👋 I'm Signal, your AI setup assistant.\n\nI'll help you integrate Uptrade Site-Kit into your project. What are we working with today?`
    
    setTimeout(() => {
      addAssistantMessage(welcome, [
        { id: '1', label: '🆕 New Site', action: 'set_flow_new', variant: 'primary' },
        { id: '2', label: '📁 Existing Project', action: 'set_flow_existing', variant: 'secondary' },
        { id: '3', label: '🔄 Rebuild from Live Site', action: 'set_flow_rebuild', variant: 'outline' },
      ])
    }, 500)
  }, [])

  // ============================================
  // Action Handlers
  // ============================================
  
  const handleAction = useCallback(async (action: string, data?: Record<string, unknown>) => {
    switch (action) {
      case 'start':
        addMessage({ role: 'user', content: "Let's do it!" })
        setState(prev => ({ ...prev, step: 'auth' }))
        addAssistantMessage(
          `Great! First, let's connect to your Uptrade Portal account.\n\nYou can sign in with your existing Portal credentials:`,
          [
            { id: '1', label: 'Sign in with Email', action: 'auth_email', variant: 'primary' },
            { id: '2', label: 'Sign in with Google', action: 'auth_google', variant: 'secondary' },
            { id: '3', label: "I don't have an account", action: 'auth_signup', variant: 'outline' },
          ]
        )
        break
        
      case 'explain':
        addMessage({ role: 'user', content: 'Tell me more first' })
        addAssistantMessage(
          `Uptrade Site-Kit is a lightweight package that connects your site to the Uptrade Portal.\n\n` +
          `Here's what you can enable:\n\n` +
          `📊 **Analytics** - Track page views, events, and Core Web Vitals\n` +
          `🔍 **SEO** - Managed meta tags, FAQs, and schema markup\n` +
          `📝 **Forms** - Portal-managed forms with spam protection\n` +
          `💬 **Engage** - Live chat, popups, and nudges\n` +
          `🛒 **Commerce** - Products, services, and checkout\n` +
          `🤖 **Signal AI** - Autonomous optimization and A/B testing\n\n` +
          `You only pay for what you use, and everything is managed from your Portal dashboard.`,
          [
            { id: '1', label: "Sounds good, let's set it up", action: 'start', variant: 'primary' },
          ]
        )
        break
        
      case 'auth_email':
        addMessage({ role: 'user', content: 'Sign in with Email' })
        addAssistantMessage(
          `What's your Portal email address?`
        )
        setState(prev => ({ ...prev, step: 'auth' }))
        // Focus input for email entry
        setTimeout(() => inputRef.current?.focus(), 600)
        break
        
      case 'auth_google':
        addMessage({ role: 'user', content: 'Sign in with Google' })
        addAssistantMessage(
          `Opening Google sign-in... (In a real implementation, this would trigger OAuth)`
        )
        // Simulate successful auth
        setTimeout(() => {
          setState(prev => ({ 
            ...prev, 
            step: 'project',
            isAuthenticated: true,
            userEmail: 'user@example.com',
          }))
          handleAuthSuccess('user@example.com')
        }, 1500)
        break
        
      case 'select_project':
        addMessage({ role: 'user', content: `Selected: ${(data as any)?.name}` })
        setState(prev => ({ 
          ...prev, 
          step: 'modules',
          selectedProject: data as any,
        }))
        showModuleSelection()
        break
        
      case 'confirm_modules':
        addMessage({ role: 'user', content: `Selected ${state.selectedModules.length} modules` })
        setState(prev => ({ ...prev, step: 'config' }))
        showConfigGeneration()
        break
        
      case 'copy_code':
        addMessage({ role: 'user', content: 'Copy integration code' })
        // Copy to clipboard (would be implemented)
        addAssistantMessage(
          `✅ Code copied to clipboard!\n\nPaste this in your root layout file (e.g., \`app/layout.tsx\` or \`pages/_app.tsx\`).\n\nWant me to help you verify the integration?`,
          [
            { id: '1', label: 'Yes, verify my setup', action: 'verify', variant: 'primary' },
            { id: '2', label: "I'm all set, thanks!", action: 'complete', variant: 'outline' },
          ]
        )
        break
        
      case 'verify':
        addMessage({ role: 'user', content: 'Verify my setup' })
        setState(prev => ({ ...prev, step: 'verify' }))
        addAssistantMessage(
          `To verify your setup, start your dev server and visit any page.\n\n` +
          `I'll check for:\n` +
          `• ✓ SiteKitProvider is loading\n` +
          `• ✓ API key is valid\n` +
          `• ✓ Analytics events are sending\n` +
          `• ✓ Modules are initializing\n\n` +
          `Run \`npm run dev\` and let me know when you're ready:`,
          [
            { id: '1', label: 'My dev server is running', action: 'check_connection', variant: 'primary' },
          ]
        )
        break
        
      case 'check_connection':
        addMessage({ role: 'user', content: 'My dev server is running' })
        setIsTyping(true)
        // Simulate verification check
        setTimeout(() => {
          setIsTyping(false)
          addAssistantMessage(
            `🎉 **Everything looks great!**\n\n` +
            `I detected your site at \`localhost:3000\` and verified:\n\n` +
            `✅ SiteKitProvider initialized\n` +
            `✅ API key authenticated\n` +
            `✅ Analytics tracking active\n` +
            `✅ SEO components ready\n\n` +
            `You're all set! Your data will start appearing in your Portal dashboard within a few minutes.`,
            [
              { id: '1', label: 'Open Portal Dashboard', action: 'open_dashboard', variant: 'primary' },
              { id: '2', label: 'Enable Signal AI', action: 'enable_signal', variant: 'secondary' },
            ]
          )
          setState(prev => ({ ...prev, step: 'complete' }))
        }, 2000)
        break
        
      case 'complete':
        addMessage({ role: 'user', content: "I'm all set, thanks!" })
        addAssistantMessage(
          `Awesome! 🚀\n\n` +
          `Your site-kit integration is ready. Here's what happens next:\n\n` +
          `• Analytics data will appear in Portal within ~5 minutes\n` +
          `• You can manage SEO, forms, and engage from the dashboard\n` +
          `• If you enabled Signal, it'll start learning from your traffic\n\n` +
          `Need help anytime? Just come back to \`/_uptrade/setup\` or ping us in Portal.\n\n` +
          `Happy building! 🎨`
        )
        onComplete?.(state)
        break
        
      case 'enable_signal':
        addMessage({ role: 'user', content: 'Enable Signal AI' })
        addAssistantMessage(
          `Great choice! 🤖\n\n` +
          `Signal AI will:\n` +
          `• Monitor your site for SEO issues\n` +
          `• Run A/B tests on CTAs and content\n` +
          `• Optimize popups and engagement timing\n` +
          `• Learn from user behavior to improve conversions\n\n` +
          `To enable Signal, add \`signal={{ enabled: true }}\` to your SiteKitProvider:\n\n` +
          `\`\`\`tsx\n` +
          `<SiteKitProvider\n` +
          `  apiKey={process.env.NEXT_PUBLIC_UPTRADE_API_KEY!}\n` +
          `  analytics={{ enabled: true }}\n` +
          `  signal={{ enabled: true }}  // Add this\n` +
          `>\n` +
          `\`\`\`\n\n` +
          `Signal requires the Business plan. Want me to check your plan?`,
          [
            { id: '1', label: 'Check my plan', action: 'check_plan', variant: 'primary' },
            { id: '2', label: "I'll do this later", action: 'complete', variant: 'outline' },
          ]
        )
        break
        
      case 'confirm_brand':
        addMessage({ role: 'user', content: 'Brand info confirmed' })
        setState(prev => ({ ...prev, step: 'modules' }))
        showModuleSelectionWithRecommendations()
        break
        
      case 'edit_brand':
        addMessage({ role: 'user', content: 'Edit brand info' })
        addAssistantMessage(
          `No problem! Let me know what to change:\n\n` +
          `• Business name\n` +
          `• Primary color (hex like #3b82f6)\n` +
          `• Tagline\n\n` +
          `Just type what you'd like to update.`
        )
        break
        
      case 'manual_brand':
        addMessage({ role: 'user', content: 'Enter brand manually' })
        addAssistantMessage(
          `Sure! What's your business name?`
        )
        setState(prev => ({ 
          ...prev, 
          context: { ...prev.context, step: 'brand_manual' } 
        }))
        break
        
      case 'skip_brand':
        addMessage({ role: 'user', content: 'Skip brand for now' })
        setState(prev => ({ ...prev, step: 'modules' }))
        showModuleSelection()
        break
        
      case 'extract_brand':
        addMessage({ role: 'user', content: 'Extract from website' })
        addAssistantMessage(
          `What's the website URL? I'll extract the brand colors, name, and logo.`
        )
        break
        
      case 'set_flow_new':
        addMessage({ role: 'user', content: 'New Site' })
        setState(prev => ({ 
          ...prev, 
          context: { ...prev.context, flow: 'new', step: 'brand' }
        }))
        addAssistantMessage(
          `Great! For a new site, I'll help you:\n\n` +
          `1. Set up your brand (colors, name)\n` +
          `2. Choose which modules to enable\n` +
          `3. Generate integration code\n\n` +
          `Do you have an existing website I can extract brand info from? Or would you prefer to enter it manually?`,
          [
            { id: '1', label: 'Extract from website', action: 'extract_brand', variant: 'primary' },
            { id: '2', label: 'Enter manually', action: 'manual_brand', variant: 'outline' },
            { id: '3', label: 'Skip for now', action: 'skip_brand', variant: 'outline' },
          ]
        )
        break
        
      case 'set_flow_existing':
        addMessage({ role: 'user', content: 'Existing Project' })
        setState(prev => ({ 
          ...prev, 
          context: { ...prev.context, flow: 'existing', step: 'scan' }
        }))
        addAssistantMessage(
          `For an existing project, I can scan your codebase to find:\n\n` +
          `• Forms to migrate (contact forms, newsletter signups)\n` +
          `• Chat widgets to replace (Intercom, Crisp, etc.)\n` +
          `• Metadata patterns to enhance\n` +
          `• Sitemap configuration\n\n` +
          `Run this in your project root:\n\n` +
          `\`\`\`bash\nnpx @uptrade/site-kit scan\n\`\`\`\n\n` +
          `Then paste the output here, or tell me about your project.`,
          [
            { id: '1', label: 'I ran the scan', action: 'show_scan_results', variant: 'primary' },
            { id: '2', label: 'Skip scan', action: 'skip_scan', variant: 'outline' },
          ]
        )
        break
        
      case 'set_flow_rebuild':
        addMessage({ role: 'user', content: 'Rebuild from Live Site' })
        setState(prev => ({ 
          ...prev, 
          context: { ...prev.context, flow: 'rebuild', step: 'scrape' }
        }))
        addAssistantMessage(
          `I'll help you rebuild with site-kit. Enter the live site URL and I'll:\n\n` +
          `• Extract brand colors and business info\n` +
          `• Import FAQs with schema markup\n` +
          `• Suggest redirect mappings\n` +
          `• Generate copilot-instructions.md\n\n` +
          `What's the website URL?`
        )
        break
        
      case 'show_scan_results':
        addMessage({ role: 'user', content: 'I ran the scan' })
        addAssistantMessage(
          `Great! Paste the scan output here, or describe what you found.\n\n` +
          `I'll analyze the results and recommend a migration plan.`
        )
        break
        
      case 'skip_scan':
        addMessage({ role: 'user', content: 'Skip scan' })
        setState(prev => ({ ...prev, step: 'modules' }))
        showModuleSelection()
        break
        
      case 'generate_redirects':
        addMessage({ role: 'user', content: 'Generate redirects' })
        if (state.context.scrape_results?.routes) {
          addStreamingMessage()
          await sendToSignalStreaming(
            `Generate SEO-optimized redirects for these routes: ${JSON.stringify(state.context.scrape_results.routes)}`,
            state.context,
            (token) => appendToStreamingMessage(token),
            (result) => finalizeStreamingMessage(result.actions)
          )
        } else {
          addAssistantMessage(
            `I need a list of routes to generate redirects. Would you like to:\n\n` +
            `1. Scrape a website for routes\n` +
            `2. Paste a list of URLs\n\n` +
            `What's easier?`,
            [
              { id: '1', label: 'Scrape website', action: 'set_flow_rebuild', variant: 'primary' },
              { id: '2', label: 'Paste URLs', action: 'paste_urls', variant: 'outline' },
            ]
          )
        }
        break
        
      case 'generate_copilot_instructions':
        addMessage({ role: 'user', content: 'Generate Copilot instructions' })
        addStreamingMessage()
        await sendToSignalStreaming(
          `Generate copilot-instructions.md for project with modules: ${state.selectedModules.join(', ')} and brand: ${state.context.brand?.business_name || 'Unknown'}`,
          state.context,
          (token) => appendToStreamingMessage(token),
          (result) => {
            finalizeStreamingMessage([
              { id: '1', label: '📋 Copy to clipboard', action: 'copy_copilot_instructions', variant: 'primary' },
              { id: '2', label: 'Continue', action: 'complete', variant: 'outline' },
            ])
          }
        )
        break
        
      case 'verify_now':
        addMessage({ role: 'user', content: 'Verify integration' })
        verifyIntegration()
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMessage, addAssistantMessage, addStreamingMessage, appendToStreamingMessage, finalizeStreamingMessage, sendToSignalStreaming, state, onComplete])
  
  // ============================================
  // Auth Success Handler
  // ============================================
  
  const handleAuthSuccess = useCallback((email: string) => {
    addAssistantMessage(
      `Welcome back, ${email.split('@')[0]}! 👋\n\n` +
      `I found these projects in your account. Which one are we setting up?`,
      [
        { id: '1', label: 'MyCompany.com', action: 'select_project', variant: 'secondary', data: { id: '1', name: 'MyCompany.com', domain: 'mycompany.com' } },
        { id: '2', label: 'Blog Project', action: 'select_project', variant: 'secondary', data: { id: '2', name: 'Blog Project', domain: 'blog.mycompany.com' } },
        { id: '3', label: '+ Create new project', action: 'create_project', variant: 'outline' },
      ]
    )
  }, [addAssistantMessage])
  
  // ============================================
  // Integration Verification
  // ============================================
  
  const verifyIntegration = useCallback(async () => {
    setState(prev => ({ ...prev, step: 'verify' }))
    setIsTyping(true)
    
    try {
      const response = await fetch(`${signalUrl}/api/skills/setup/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          project_id: projectId || state.context.project_id,
          dev_url: 'http://localhost:3000',
        }),
      })
      
      setIsTyping(false)
      
      if (!response.ok) {
        throw new Error('Verification failed')
      }
      
      const result = await response.json()
      
      if (result.overall_status === 'success') {
        const checkList = result.checks.map((c: { check: string; passed: boolean }) => 
          `${c.passed ? '✅' : '❌'} ${c.check.replace(/_/g, ' ')}`
        ).join('\n')
        
        addAssistantMessage(
          `🎉 **Integration Verified!**\n\n${checkList}\n\n` +
          `Your site-kit integration is working perfectly. Data will start appearing in Portal shortly.`,
          [
            { id: '1', label: 'Open Portal Dashboard', action: 'open_dashboard', variant: 'primary' },
            { id: '2', label: 'Generate Copilot Instructions', action: 'generate_copilot_instructions', variant: 'secondary' },
          ]
        )
        setState(prev => ({ ...prev, step: 'complete' }))
      } else {
        const issues = result.issues?.join('\n• ') || 'Unknown issue'
        addAssistantMessage(
          `⚠️ **Verification Found Issues**\n\n• ${issues}\n\n` +
          `Would you like help troubleshooting?`,
          [
            { id: '1', label: 'Help me fix this', action: 'troubleshoot', variant: 'primary' },
            { id: '2', label: 'Skip for now', action: 'complete', variant: 'outline' },
          ]
        )
      }
    } catch (error) {
      setIsTyping(false)
      addAssistantMessage(
        `I couldn't verify the integration automatically. Make sure your dev server is running.\n\n` +
        `You can manually verify by:\n` +
        `1. Opening your site in the browser\n` +
        `2. Checking the Network tab for requests to api.uptrademedia.com\n` +
        `3. Looking for analytics events in your Portal dashboard`,
        [
          { id: '1', label: 'Try again', action: 'verify_now', variant: 'primary' },
          { id: '2', label: 'Continue anyway', action: 'complete', variant: 'outline' },
        ]
      )
    }
  }, [signalUrl, authToken, projectId, state.context.project_id, addAssistantMessage])
  
  // ============================================
  // Module Selection with Recommendations
  // ============================================
  
  const showModuleSelectionWithRecommendations = useCallback(async () => {
    const { brand, business_type, scan_results } = state.context
    
    // Get AI recommendations if we have context
    if (brand || business_type) {
      try {
        const result = await sendToSignal(
          `Recommend modules for: ${brand?.business_name || 'Unknown'}, type: ${business_type || 'general'}`,
          { ...state.context, step: 'recommend_modules' }
        )
        
        // Parse recommendations from response
        addAssistantMessage(
          result.response,
          undefined,
          <ModuleSelector
            modules={MODULES}
            selected={state.selectedModules}
            onChange={(modules) => setState(prev => ({ ...prev, selectedModules: modules }))}
            onConfirm={() => handleAction('confirm_modules')}
          />
        )
        return
      } catch (error) {
        // Fall back to default
      }
    }
    
    // Default module selection
    showModuleSelection()
  }, [state.context, state.selectedModules, sendToSignal, handleAction])

  // ============================================
  // Module Selection
  // ============================================
  
  const showModuleSelection = useCallback(() => {
    addAssistantMessage(
      `Perfect! Now let's choose which features to enable.\n\n` +
      `I've pre-selected the essentials, but you can customize:`,
      undefined,
      <ModuleSelector
        modules={MODULES}
        selected={state.selectedModules}
        onChange={(modules) => setState(prev => ({ ...prev, selectedModules: modules }))}
        onConfirm={() => handleAction('confirm_modules')}
      />
    )
  }, [addAssistantMessage, state.selectedModules, handleAction])
  
  // ============================================
  // Config Generation
  // ============================================
  
  const showConfigGeneration = useCallback(() => {
    const code = generateIntegrationCode(state)
    
    addAssistantMessage(
      `Here's your integration code! 🎉\n\n` +
      `Add this to your root layout:`,
      [
        { id: '1', label: '📋 Copy Code', action: 'copy_code', variant: 'primary' },
      ],
      <CodeBlock code={code} />
    )
  }, [addAssistantMessage, state])
  
  // ============================================
  // Text Input Handler
  // ============================================
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    const userInput = input.trim()
    setInput('')
    addMessage({ role: 'user', content: userInput })
    
    // Handle based on current step
    if (state.step === 'auth' && userInput.includes('@')) {
      // Email entered
      setState(prev => ({ 
        ...prev, 
        isAuthenticated: true,
        userEmail: userInput,
        step: 'project',
      }))
      addAssistantMessage(
        `Sending magic link to ${userInput}...\n\n` +
        `(In production, you'd receive an email. For now, I'll simulate a successful login.)`,
      )
      setTimeout(() => handleAuthSuccess(userInput), 1500)
    } else if (userInput.toLowerCase().includes('http') || userInput.match(/^[\w.-]+\.[a-z]{2,}$/i)) {
      // URL or domain entered - extract brand
      const domain = userInput.replace(/^https?:\/\//, '').split('/')[0]
      setIsTyping(true)
      addAssistantMessage(`Analyzing ${domain} to extract brand information...`)
      
      const brand = await extractBrandFromDomain(domain)
      setIsTyping(false)
      
      if (brand) {
        setState(prev => ({
          ...prev,
          context: { ...prev.context, brand, domain },
        }))
        
        const brandSummary = [
          brand.business_name && `**Business:** ${brand.business_name}`,
          brand.tagline && `**Tagline:** ${brand.tagline}`,
          brand.primary_color && `**Primary Color:** ${brand.primary_color}`,
          brand.phone_numbers?.length && `**Phone:** ${brand.phone_numbers[0]}`,
        ].filter(Boolean).join('\n')
        
        addAssistantMessage(
          `Found brand information:\n\n${brandSummary}\n\nDoes this look right?`,
          [
            { id: '1', label: 'Yes, looks good!', action: 'confirm_brand', variant: 'primary' },
            { id: '2', label: 'Edit brand info', action: 'edit_brand', variant: 'outline' },
          ]
        )
      } else {
        addAssistantMessage(
          `I couldn't extract brand info from ${domain}. You can enter it manually, or we can continue without it.`,
          [
            { id: '1', label: 'Enter manually', action: 'manual_brand', variant: 'primary' },
            { id: '2', label: 'Skip for now', action: 'skip_brand', variant: 'outline' },
          ]
        )
      }
    } else {
      // Natural language input - send to Signal API with streaming
      addStreamingMessage()
      
      try {
        await sendToSignalStreaming(
          userInput, 
          state.context,
          (token) => appendToStreamingMessage(token),
          (result) => {
            if (result.updated_context) {
              setState(prev => ({
                ...prev,
                context: { ...prev.context, ...result.updated_context },
              }))
            }
            finalizeStreamingMessage(result.actions)
          }
        )
      } catch (error) {
        finalizeStreamingMessage()
        addAssistantMessage(
          `I understand you said: "${userInput}"\n\n` +
          `Let me help you with that. What would you like to do?`,
          [
            { id: '1', label: 'Continue setup', action: 'start', variant: 'primary' },
            { id: '2', label: 'Ask a question', action: 'help', variant: 'outline' },
          ]
        )
      }
    }
  }, [input, state.step, state.context, addMessage, addAssistantMessage, handleAuthSuccess, sendToSignalStreaming, appendToStreamingMessage, finalizeStreamingMessage, addStreamingMessage, extractBrandFromDomain])

  // ============================================
  // Render
  // ============================================
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>U</div>
        <div>
          <div style={styles.title}>Uptrade Setup</div>
          <div style={styles.subtitle}>Site-Kit Integration Wizard</div>
        </div>
      </div>
      
      {/* Messages */}
      <div style={styles.messages}>
        {messages.map(message => (
          <div
            key={message.id}
            style={{
              ...styles.message,
              ...(message.role === 'assistant' ? styles.messageAssistant : styles.messageUser),
            }}
          >
            <div
              style={{
                ...styles.avatar,
                ...(message.role === 'assistant' ? styles.avatarAssistant : styles.avatarUser),
              }}
            >
              {message.role === 'assistant' ? '✨' : '👤'}
            </div>
            <div>
              <div
                style={{
                  ...styles.bubble,
                  ...(message.role === 'assistant' ? styles.bubbleAssistant : styles.bubbleUser),
                }}
              >
                {message.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < message.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              
              {/* Custom component */}
              {message.component}
              
              {/* Action buttons */}
              {message.actions && (
                <div style={styles.actions}>
                  {message.actions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.action, action.data)}
                      style={{
                        ...styles.actionButton,
                        ...(action.variant === 'primary' ? styles.actionPrimary : 
                            action.variant === 'outline' ? styles.actionOutline :
                            styles.actionSecondary),
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div style={{ ...styles.message, ...styles.messageAssistant }}>
            <div style={{ ...styles.avatar, ...styles.avatarAssistant }}>✨</div>
            <div style={styles.typing}>
              <div style={{ ...styles.typingDot, animationDelay: '0s' }} />
              <div style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
              <div style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit} style={styles.inputContainer}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={styles.input}
        />
        <button type="submit" style={styles.sendButton}>
          Send
        </button>
      </form>
      
      {/* Typing animation keyframes */}
      <style>{`
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ============================================
// Module Selector Component
// ============================================

function ModuleSelector({
  modules,
  selected,
  onChange,
  onConfirm,
}: {
  modules: typeof MODULES
  selected: string[]
  onChange: (modules: string[]) => void
  onConfirm: () => void
}) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter(m => m !== id)
        : [...selected, id]
    )
  }
  
  return (
    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {modules.map(module => (
        <div
          key={module.id}
          onClick={() => toggle(module.id)}
          style={{
            ...styles.moduleCard,
            ...(selected.includes(module.id) ? styles.moduleCardSelected : {}),
          }}
        >
          <span style={styles.moduleIcon}>{module.icon}</span>
          <div style={styles.moduleInfo}>
            <div style={styles.moduleName}>
              {module.name}
              {module.recommended && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.625rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px' }}>
                  Recommended
                </span>
              )}
            </div>
            <div style={styles.moduleDesc}>{module.description}</div>
          </div>
          <input
            type="checkbox"
            checked={selected.includes(module.id)}
            onChange={() => toggle(module.id)}
            style={styles.checkbox}
          />
        </div>
      ))}
      
      <button
        onClick={onConfirm}
        style={{ ...styles.actionButton, ...styles.actionPrimary, marginTop: '0.5rem' }}
      >
        Continue with {selected.length} modules
      </button>
    </div>
  )
}

// ============================================
// Code Block Component
// ============================================

function CodeBlock({ code }: { code: string }) {
  return (
    <pre style={{
      marginTop: '0.75rem',
      padding: '1rem',
      background: '#1f2937',
      color: '#e5e7eb',
      borderRadius: '0.5rem',
      fontSize: '0.8125rem',
      overflowX: 'auto',
      fontFamily: 'monospace',
    }}>
      {code}
    </pre>
  )
}

// ============================================
// Code Generation
// ============================================

function generateIntegrationCode(state: SetupState): string {
  const { selectedModules } = state
  
  const moduleConfigs: string[] = []
  
  if (selectedModules.includes('analytics')) {
    moduleConfigs.push(`  analytics={{ enabled: true }}`)
  }
  
  if (selectedModules.includes('engage')) {
    moduleConfigs.push(`  engage={{ enabled: true }}`)
  }
  
  if (selectedModules.includes('forms')) {
    moduleConfigs.push(`  forms={{ enabled: true }}`)
  }
  
  if (selectedModules.includes('signal')) {
    moduleConfigs.push(`  signal={{ enabled: true, realtime: true }}`)
  }
  
  return `// app/layout.tsx (or pages/_app.tsx)
import { SiteKitProvider } from '@uptrade/site-kit'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SiteKitProvider
          apiKey={process.env.NEXT_PUBLIC_UPTRADE_API_KEY!}
${moduleConfigs.join('\n')}
        >
          {children}
        </SiteKitProvider>
      </body>
    </html>
  )
}`
}
