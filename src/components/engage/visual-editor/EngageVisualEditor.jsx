// src/components/engage/visual-editor/EngageVisualEditor.jsx
// Visual Element Editor with live website preview and drag-drop positioning

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Save,
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Undo,
  Redo,
  Grid3X3,
  Move,
  Type,
  Image,
  Video,
  Palette,
  Settings,
  Clock,
  Target,
  MousePointerClick,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  Copy,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/lib/toast'
import { engageApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'

import ElementOverlay from './ElementOverlay'
import InlineContentEditor from './InlineContentEditor'
import MediaLibrary from './MediaLibrary'
import LayoutTemplates from './LayoutTemplates'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: '768px' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: '375px' }
]

const ZOOM_LEVELS = [50, 75, 100, 125, 150]

const POSITIONS = {
  popup: [
    { id: 'center', label: 'Center', css: 'top: 50%; left: 50%; transform: translate(-50%, -50%);' },
    { id: 'top-center', label: 'Top Center', css: 'top: 10%; left: 50%; transform: translateX(-50%);' },
    { id: 'bottom-center', label: 'Bottom Center', css: 'bottom: 10%; left: 50%; transform: translateX(-50%);' }
  ],
  banner: [
    { id: 'top-bar', label: 'Top Bar', css: 'top: 0; left: 0; right: 0;' },
    { id: 'bottom-bar', label: 'Bottom Bar', css: 'bottom: 0; left: 0; right: 0;' }
  ],
  'slide-in': [
    { id: 'bottom-right', label: 'Bottom Right', css: 'bottom: 20px; right: 20px;' },
    { id: 'bottom-left', label: 'Bottom Left', css: 'bottom: 20px; left: 20px;' },
    { id: 'top-right', label: 'Top Right', css: 'top: 20px; right: 20px;' },
    { id: 'top-left', label: 'Top Left', css: 'top: 20px; left: 20px;' }
  ]
}

const ANIMATIONS = [
  { id: 'fade', label: 'Fade In' },
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'slide-down', label: 'Slide Down' },
  { id: 'scale', label: 'Scale' },
  { id: 'bounce', label: 'Bounce' }
]

const TRIGGERS = [
  { id: 'time', label: 'Time Delay', icon: Clock },
  { id: 'scroll', label: 'Scroll Depth', icon: MousePointerClick },
  { id: 'exit', label: 'Exit Intent', icon: Target }
]

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function EngageVisualEditor({ 
  projectId, 
  elementId, 
  element: initialElement,
  siteUrl,
  onSave, 
  onClose 
}) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────
  
  const defaultElement = {
    element_type: 'popup',
    name: '',
    headline: 'Your Headline Here',
    body: 'Add your message here.',
    cta_text: 'Get Started',
    cta_action: 'link',
    cta_url: '',
    position: 'center',
    trigger_type: 'time',
    trigger_config: { delay_seconds: 5 },
    appearance: {
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      primaryColor: '#4bbf39',
      borderRadius: 12,
      shadow: 'lg'
    },
    animation: 'fade',
    media: [],
    layout_type: 'simple',
    position_data: null,
    page_patterns: ['*'],
    device_targets: ['desktop', 'mobile', 'tablet'],
    is_active: false,
    is_draft: true
  }
  
  const [element, setElement] = useState(initialElement || defaultElement)
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [device, setDevice] = useState('desktop')
  const [zoom, setZoom] = useState(100)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState('content')
  const [showPreview, setShowPreview] = useState(true)
  const [iframeReady, setIframeReady] = useState(false)
  const [iframeError, setIframeError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showTemplates, setShowTemplates] = useState(!initialElement && !elementId)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const iframeRef = useRef(null)
  const containerRef = useRef(null)
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FETCH ELEMENT IF ID PROVIDED
  // ─────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const fetchElement = async () => {
      // If we have a full element already, use it
      if (initialElement && Object.keys(initialElement).length > 2) {
        setElement(initialElement)
        return
      }
      
      // If we have an elementId (either from prop or from initialElement.id), fetch it
      const idToFetch = elementId || initialElement?.id
      if (idToFetch) {
        try {
          setLoading(true)
          const { data } = await engageApi.getElement(idToFetch)
          if (data?.element) {
            setElement(data.element)
          }
        } catch (error) {
          console.error('Failed to fetch element:', error)
          toast.error('Failed to load element')
        } finally {
          setLoading(false)
        }
      }
    }
    
    fetchElement()
  }, [elementId, initialElement?.id])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // IFRAME COMMUNICATION
  // ─────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'ENGAGE_IFRAME') {
        switch (event.data.action) {
          case 'BRIDGE_READY':
            setIframeReady(true)
            setIframeError(null)
            break
          case 'PAGE_INFO':
            // Could use this for responsive calculations
            break
          case 'SCROLL':
            // Track scroll for positioning
            break
          case 'ELEMENT_RECT':
            // Handle element position data
            break
        }
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  
  const sendToIframe = useCallback((action, data = {}) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'ENGAGE_EDITOR',
        action,
        ...data
      }, '*')
    }
  }, [])
  
  // Update preview in iframe when element changes
  useEffect(() => {
    if (iframeReady && showPreview) {
      const previewHtml = generatePreviewHtml(element)
      const positionCss = getPositionCss(element.element_type, element.position)
      sendToIframe('INSERT_PREVIEW', { html: previewHtml, position: positionCss })
    } else if (iframeReady && !showPreview) {
      sendToIframe('REMOVE_PREVIEW')
    }
  }, [element, iframeReady, showPreview, sendToIframe])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // HISTORY (UNDO/REDO)
  // ─────────────────────────────────────────────────────────────────────────────
  
  const pushHistory = useCallback((newElement) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(JSON.parse(JSON.stringify(newElement)))
      return newHistory.slice(-20) // Keep last 20 states
    })
    setHistoryIndex(prev => Math.min(prev + 1, 19))
  }, [historyIndex])
  
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      setElement(history[historyIndex - 1])
    }
  }, [history, historyIndex])
  
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setElement(history[historyIndex + 1])
    }
  }, [history, historyIndex])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ELEMENT UPDATES
  // ─────────────────────────────────────────────────────────────────────────────
  
  const updateElement = useCallback((updates) => {
    setElement(prev => {
      const newElement = { ...prev, ...updates }
      pushHistory(newElement)
      return newElement
    })
  }, [pushHistory])
  
  const updateAppearance = useCallback((key, value) => {
    setElement(prev => ({
      ...prev,
      appearance: { ...prev.appearance, [key]: value }
    }))
  }, [])
  
  const updateTriggerConfig = useCallback((key, value) => {
    setElement(prev => ({
      ...prev,
      trigger_config: { ...prev.trigger_config, [key]: value }
    }))
  }, [])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleSave = async (publish = false) => {
    try {
      setSaving(true)
      
      const payload = {
        ...element,
        project_id: projectId,
        is_draft: !publish,
        is_active: publish
      }
      
      if (elementId) {
        await engageApi.updateElement(elementId, payload)
      } else {
        await engageApi.createElement(payload)
      }
      
      toast.success(publish ? 'Element published!' : 'Element saved as draft')
      onSave?.(element)
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save element')
    } finally {
      setSaving(false)
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE SELECTION
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleSelectTemplate = (template) => {
    updateElement({
      ...template,
      name: template.name || `New ${template.element_type}`,
      project_id: projectId
    })
    setShowTemplates(false)
    pushHistory({ ...element, ...template })
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // MEDIA HANDLING
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleMediaSelect = (media) => {
    updateElement({
      media: [...(element.media || []), media]
    })
    setShowMediaLibrary(false)
  }
  
  const handleRemoveMedia = (index) => {
    updateElement({
      media: element.media.filter((_, i) => i !== index)
    })
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  // Proxy URL for iframe - using Portal API instead of Netlify function
  const apiUrl = import.meta.env.VITE_PORTAL_API_URL || 'https://api.uptrademedia.com'
  const proxyUrl = siteUrl 
    ? `${apiUrl}/engage/proxy?url=${encodeURIComponent(siteUrl)}&projectId=${projectId}`
    : null

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col h-full bg-[var(--bg-primary)]",
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          TOOLBAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={element.name}
            onChange={(e) => updateElement({ name: e.target.value })}
            className="w-48 h-8 text-sm"
            placeholder="Element name..."
          />
          <Badge variant="outline" className="capitalize">
            {element.element_type}
          </Badge>
        </div>
        
        {/* Center: Device + Zoom */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <div className="flex items-center rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-1">
              {DEVICES.map((d) => (
                <Tooltip key={d.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={device === d.id ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setDevice(d.id)}
                    >
                      <d.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{d.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs w-10 text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setZoom(Math.min(150, zoom + 25))}
              disabled={zoom >= 150}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setZoom(100)}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Right: Preview + Save */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Draft
          </Button>
          
          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Publish
          </Button>
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT (Sidebar + Preview)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─────────────────────────────────────────────────────────────────────
            SIDEBAR
            ───────────────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-r border-[var(--border-primary)] bg-[var(--bg-primary)] overflow-hidden"
            >
              <div className="w-80 h-full flex flex-col">
                <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex-1 flex flex-col">
                  <TabsList className="grid grid-cols-4 mx-3 mt-3">
                    <TabsTrigger value="content" className="text-xs">
                      <Type className="h-3 w-3 mr-1" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="style" className="text-xs">
                      <Palette className="h-3 w-3 mr-1" />
                      Style
                    </TabsTrigger>
                    <TabsTrigger value="trigger" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Trigger
                    </TabsTrigger>
                    <TabsTrigger value="target" className="text-xs">
                      <Target className="h-3 w-3 mr-1" />
                      Target
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    {/* Content Tab */}
                    <TabsContent value="content" className="mt-0 space-y-4">
                      <div className="space-y-2">
                        <Label>Element Type</Label>
                        <Select
                          value={element.element_type}
                          onValueChange={(v) => updateElement({ element_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="popup">Popup</SelectItem>
                            <SelectItem value="banner">Banner</SelectItem>
                            <SelectItem value="slide-in">Slide-in</SelectItem>
                            <SelectItem value="nudge">Nudge</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Headline</Label>
                        <Input
                          value={element.headline}
                          onChange={(e) => updateElement({ headline: e.target.value })}
                          placeholder="Enter headline..."
                        />
                        <p className="text-xs text-muted-foreground">
                          {element.headline?.length || 0}/60 characters
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Body Text</Label>
                        <Textarea
                          value={element.body}
                          onChange={(e) => updateElement({ body: e.target.value })}
                          placeholder="Enter body text..."
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          {element.body?.length || 0}/200 characters
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label>Call to Action</Label>
                        <Input
                          value={element.cta_text}
                          onChange={(e) => updateElement({ cta_text: e.target.value })}
                          placeholder="Button text..."
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>CTA Action</Label>
                        <Select
                          value={element.cta_action}
                          onValueChange={(v) => updateElement({ cta_action: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="link">Open Link</SelectItem>
                            <SelectItem value="chat">Open Chat</SelectItem>
                            <SelectItem value="scheduler">Open Scheduler</SelectItem>
                            <SelectItem value="close">Close Element</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {element.cta_action === 'link' && (
                        <div className="space-y-2">
                          <Label>CTA URL</Label>
                          <Input
                            value={element.cta_url}
                            onChange={(e) => updateElement({ cta_url: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                      )}
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Media</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowMediaLibrary(true)}
                          >
                            <Image className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        
                        {element.media?.length > 0 && (
                          <div className="space-y-2">
                            {element.media.map((m, i) => (
                              <div key={i} className="flex items-center gap-2 p-2 border rounded-md">
                                {m.type === 'image' && (
                                  <img src={m.url} alt="" className="w-10 h-10 object-cover rounded" />
                                )}
                                {m.type === 'video' && (
                                  <Video className="w-10 h-10 p-2 bg-muted rounded" />
                                )}
                                <span className="flex-1 text-xs truncate">{m.name || m.url}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleRemoveMedia(i)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    {/* Style Tab */}
                    <TabsContent value="style" className="mt-0 space-y-4">
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Select
                          value={element.position}
                          onValueChange={(v) => updateElement({ position: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(POSITIONS[element.element_type] || POSITIONS.popup).map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Animation</Label>
                        <Select
                          value={element.animation}
                          onValueChange={(v) => updateElement({ animation: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ANIMATIONS.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={element.appearance?.backgroundColor || '#ffffff'}
                            onChange={(e) => updateAppearance('backgroundColor', e.target.value)}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={element.appearance?.backgroundColor || '#ffffff'}
                            onChange={(e) => updateAppearance('backgroundColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={element.appearance?.textColor || '#1a1a1a'}
                            onChange={(e) => updateAppearance('textColor', e.target.value)}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={element.appearance?.textColor || '#1a1a1a'}
                            onChange={(e) => updateAppearance('textColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Button Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={element.appearance?.primaryColor || '#4bbf39'}
                            onChange={(e) => updateAppearance('primaryColor', e.target.value)}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={element.appearance?.primaryColor || '#4bbf39'}
                            onChange={(e) => updateAppearance('primaryColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Border Radius: {element.appearance?.borderRadius || 12}px</Label>
                        <Slider
                          value={[element.appearance?.borderRadius || 12]}
                          onValueChange={([v]) => updateAppearance('borderRadius', v)}
                          min={0}
                          max={24}
                          step={2}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Shadow</Label>
                        <Select
                          value={element.appearance?.shadow || 'lg'}
                          onValueChange={(v) => updateAppearance('shadow', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="sm">Small</SelectItem>
                            <SelectItem value="md">Medium</SelectItem>
                            <SelectItem value="lg">Large</SelectItem>
                            <SelectItem value="xl">Extra Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    
                    {/* Trigger Tab */}
                    <TabsContent value="trigger" className="mt-0 space-y-4">
                      <div className="space-y-2">
                        <Label>Trigger Type</Label>
                        <Select
                          value={element.trigger_type}
                          onValueChange={(v) => updateElement({ trigger_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRIGGERS.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                <div className="flex items-center gap-2">
                                  <t.icon className="h-4 w-4" />
                                  {t.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {element.trigger_type === 'time' && (
                        <div className="space-y-2">
                          <Label>Delay: {element.trigger_config?.delay_seconds || 5}s</Label>
                          <Slider
                            value={[element.trigger_config?.delay_seconds || 5]}
                            onValueChange={([v]) => updateTriggerConfig('delay_seconds', v)}
                            min={1}
                            max={60}
                            step={1}
                          />
                        </div>
                      )}
                      
                      {element.trigger_type === 'scroll' && (
                        <div className="space-y-2">
                          <Label>Scroll Depth: {element.trigger_config?.scroll_percentage || 50}%</Label>
                          <Slider
                            value={[element.trigger_config?.scroll_percentage || 50]}
                            onValueChange={([v]) => updateTriggerConfig('scroll_percentage', v)}
                            min={10}
                            max={100}
                            step={10}
                          />
                        </div>
                      )}
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select
                          value={element.frequency_cap || 'session'}
                          onValueChange={(v) => updateElement({ frequency_cap: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">Once Ever</SelectItem>
                            <SelectItem value="session">Once Per Session</SelectItem>
                            <SelectItem value="day">Once Per Day</SelectItem>
                            <SelectItem value="week">Once Per Week</SelectItem>
                            <SelectItem value="always">Every Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    
                    {/* Target Tab */}
                    <TabsContent value="trigger" className="mt-0 space-y-4">
                      <div className="space-y-2">
                        <Label>Page Patterns</Label>
                        <Textarea
                          value={(element.page_patterns || ['*']).join('\n')}
                          onChange={(e) => updateElement({ 
                            page_patterns: e.target.value.split('\n').filter(Boolean) 
                          })}
                          placeholder="* for all pages&#10;/pricing/*&#10;/blog/*"
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          One pattern per line. Use * as wildcard.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Devices</Label>
                        <div className="flex flex-wrap gap-2">
                          {DEVICES.map((d) => (
                            <Badge
                              key={d.id}
                              variant={element.device_targets?.includes(d.id) ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => {
                                const current = element.device_targets || []
                                updateElement({
                                  device_targets: current.includes(d.id)
                                    ? current.filter(x => x !== d.id)
                                    : [...current, d.id]
                                })
                              }}
                            >
                              <d.icon className="h-3 w-3 mr-1" />
                              {d.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-6 p-0 rounded-l-none"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        
        {/* ─────────────────────────────────────────────────────────────────────
            PREVIEW AREA
            ───────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden bg-[var(--bg-tertiary)]">
          {/* Device Frame */}
          <div 
            className="absolute inset-0 flex items-center justify-center p-8 overflow-auto"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          >
            <div
              className={cn(
                "bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300",
                device === 'mobile' && 'max-w-[375px]',
                device === 'tablet' && 'max-w-[768px]',
                device === 'desktop' && 'w-full max-w-[1200px]'
              )}
              style={{
                height: device === 'mobile' ? '667px' : device === 'tablet' ? '1024px' : '800px',
                border: '8px solid #333',
                borderRadius: device === 'mobile' ? '36px' : '12px'
              }}
            >
              {/* URL Bar (cosmetic) */}
              <div className="h-8 bg-gray-100 border-b flex items-center px-2 gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 h-5 bg-white rounded-md px-2 text-xs text-gray-400 flex items-center truncate">
                  {siteUrl || 'No site URL configured'}
                </div>
              </div>
              
              {/* Iframe or Placeholder */}
              <div className="relative" style={{ height: 'calc(100% - 32px)' }}>
                {proxyUrl ? (
                  <>
                    <iframe
                      ref={iframeRef}
                      src={proxyUrl}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                      onError={() => setIframeError('Failed to load website')}
                    />
                    
                    {/* Element Overlay (drag to position) */}
                    {showPreview && iframeReady && (
                      <ElementOverlay
                        element={element}
                        device={device}
                        isDragging={isDragging}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={(position) => {
                          setIsDragging(false)
                          updateElement({ position_data: position })
                        }}
                        onEdit={() => setIsEditing(true)}
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No Site URL</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Configure a site URL in project settings to preview elements on your actual website.
                      </p>
                      <div className="p-4 bg-white rounded-lg border">
                        <PreviewElement element={element} />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Loading overlay */}
                {proxyUrl && !iframeReady && !iframeError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading website...</p>
                    </div>
                  </div>
                )}
                
                {/* Error overlay */}
                {iframeError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <Alert variant="destructive" className="max-w-md">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {iframeError}. Showing preview without website context.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════════════ */}
      
      {/* Template Selector */}
      {showTemplates && (
        <LayoutTemplates
          onSelect={handleSelectTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
      
      {/* Media Library */}
      {showMediaLibrary && (
        <MediaLibrary
          projectId={projectId}
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaLibrary(false)}
        />
      )}
      
      {/* Inline Content Editor */}
      {isEditing && (
        <InlineContentEditor
          element={element}
          onChange={updateElement}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getPositionCss(elementType, position) {
  const positions = POSITIONS[elementType] || POSITIONS.popup
  const pos = positions.find(p => p.id === position)
  return pos?.css || positions[0].css
}

function generatePreviewHtml(element) {
  const { headline, body, cta_text, appearance } = element
  const {
    backgroundColor = '#ffffff',
    textColor = '#1a1a1a',
    primaryColor = '#4bbf39',
    borderRadius = 12,
    shadow = 'lg'
  } = appearance || {}
  
  const shadowCss = {
    none: 'none',
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.15)'
  }[shadow]
  
  return `
    <div style="
      background: ${backgroundColor};
      color: ${textColor};
      border-radius: ${borderRadius}px;
      box-shadow: ${shadowCss};
      padding: 24px;
      max-width: 400px;
      text-align: center;
    ">
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">${headline}</h2>
      <p style="margin: 0 0 16px; font-size: 14px; opacity: 0.8;">${body}</p>
      <button style="
        background: ${primaryColor};
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      ">${cta_text}</button>
    </div>
  `
}

// Standalone Preview Component
function PreviewElement({ element }) {
  const { headline, body, cta_text, appearance } = element
  const {
    backgroundColor = '#ffffff',
    textColor = '#1a1a1a',
    primaryColor = '#4bbf39',
    borderRadius = 12
  } = appearance || {}
  
  return (
    <div
      style={{
        backgroundColor,
        color: textColor,
        borderRadius: `${borderRadius}px`,
        padding: '24px',
        maxWidth: '400px',
        textAlign: 'center'
      }}
      className="shadow-lg"
    >
      <h2 className="text-xl font-bold mb-2">{headline}</h2>
      <p className="text-sm opacity-80 mb-4">{body}</p>
      <button
        style={{ backgroundColor: primaryColor }}
        className="text-white px-6 py-3 rounded-md font-semibold"
      >
        {cta_text}
      </button>
    </div>
  )
}
