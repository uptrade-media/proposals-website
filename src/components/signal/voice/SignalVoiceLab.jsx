// src/components/signal/voice/SignalVoiceLab.jsx
// Voice Lab - Fine-tune Echo's personality and communication style

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Send,
  Loader2,
  RefreshCw,
  Save,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings2,
  MessageSquare,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ChevronRight,
  Zap,
  RotateCcw,
  BookOpen,
  User,
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSignalStore } from '@/lib/signal-store'
import { configApi, echoApi } from '@/lib/signal-api'
import { SignalAmbient, GlowCard, MetricRing } from '../shared/SignalUI'
import EchoLogo from '@/components/echo/EchoLogo'

// Voice parameter presets
const VOICE_PRESETS = [
  { 
    id: 'professional', 
    name: 'Professional', 
    description: 'Formal, precise, business-focused',
    config: { formality: 0.8, warmth: 0.4, technicalDepth: 0.6, verbosity: 0.5, enthusiasm: 0.3 }
  },
  { 
    id: 'friendly', 
    name: 'Friendly Expert', 
    description: 'Warm, approachable, helpful',
    config: { formality: 0.4, warmth: 0.8, technicalDepth: 0.5, verbosity: 0.6, enthusiasm: 0.7 }
  },
  { 
    id: 'concise', 
    name: 'Concise & Direct', 
    description: 'Brief, to-the-point, efficient',
    config: { formality: 0.6, warmth: 0.3, technicalDepth: 0.5, verbosity: 0.2, enthusiasm: 0.3 }
  },
  { 
    id: 'technical', 
    name: 'Technical Expert', 
    description: 'Detailed, precise, in-depth',
    config: { formality: 0.7, warmth: 0.3, technicalDepth: 0.9, verbosity: 0.8, enthusiasm: 0.4 }
  },
  { 
    id: 'casual', 
    name: 'Casual & Conversational', 
    description: 'Relaxed, personable, engaging',
    config: { formality: 0.2, warmth: 0.9, technicalDepth: 0.3, verbosity: 0.5, enthusiasm: 0.8 }
  },
]

// Test prompts for voice testing
const TEST_PROMPTS = [
  "What services do you offer?",
  "How does your pricing work?",
  "I'm having a problem with my account.",
  "Can you explain how this feature works?",
  "I'm not sure if this is the right fit for me.",
  "What makes you different from competitors?",
]

// Compact voice parameter slider for grid layout
function VoiceSliderCompact({ label, value, onChange, leftLabel, rightLabel }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
      <div className="flex justify-between items-center mb-2">
        <Label className="text-white text-xs font-medium">{label}</Label>
        <span className="text-xs font-medium text-emerald-400">{Math.round(value * 100)}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={1}
        step={0.05}
        className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
      />
      <div className="flex justify-between text-[9px] text-white/30 uppercase tracking-wide mt-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}

// Voice parameter slider component
function VoiceSlider({ label, description, value, onChange, leftLabel, rightLabel }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <Label className="text-white text-sm font-medium">{label}</Label>
          <p className="text-xs text-white/40 mt-0.5">{description}</p>
        </div>
        <span className="text-sm font-medium text-emerald-400">{Math.round(value * 100)}%</span>
      </div>
      <div className="space-y-1">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={0}
          max={1}
          step={0.05}
          className="[&_[role=slider]]:bg-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-wide">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      </div>
    </div>
  )
}

// Preview message component
function PreviewMessage({ message, variant = 'current' }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const isUser = message.role === 'user'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isUser 
          ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20"
          : variant === 'current'
            ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20"
            : "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-blue-400" />
        ) : (
          <EchoLogo size={20} animated={false} isPulsing={false} />
        )}
      </div>
      
      {/* Content */}
      <div className={cn(
        "flex-1 max-w-[85%]",
        isUser && "flex flex-col items-end"
      )}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] font-medium",
                variant === 'current' 
                  ? "border-emerald-500/30 text-emerald-400" 
                  : "border-amber-500/30 text-amber-400"
              )}
            >
              {variant === 'current' ? 'Current Voice' : 'New Voice'}
            </Badge>
          </div>
        )}
        <div className={cn(
          "p-4 rounded-2xl",
          isUser 
            ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/20 rounded-tr-sm"
            : variant === 'current'
              ? "bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-tl-sm"
              : "bg-gradient-to-br from-amber-500/[0.05] to-orange-500/[0.02] border border-amber-500/[0.15] rounded-tl-sm"
        )}>
          <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        
        {/* Actions for AI responses */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function SignalVoiceLab({ projectId }) {
  const [voiceConfig, setVoiceConfig] = useState({
    formality: 0.5,
    warmth: 0.6,
    technicalDepth: 0.5,
    verbosity: 0.5,
    enthusiasm: 0.5
  })
  const [savedConfig, setSavedConfig] = useState(null)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [testPrompt, setTestPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [previewMessages, setPreviewMessages] = useState([])
  const [showComparison, setShowComparison] = useState(false)
  
  // Load saved voice config
  useEffect(() => {
    if (projectId) {
      loadVoiceConfig()
    }
  }, [projectId])
  
  // Track changes - allow saving if no saved config exists OR if config differs from saved
  useEffect(() => {
    if (savedConfig === null) {
      // No saved config yet - allow saving the defaults
      setHasChanges(true)
    } else {
      const changed = Object.keys(voiceConfig).some(
        key => voiceConfig[key] !== savedConfig[key]
      )
      setHasChanges(changed)
    }
  }, [voiceConfig, savedConfig])
  
  const loadVoiceConfig = async () => {
    try {
      const { data } = await configApi.get(projectId)
      if (data?.voice_config) {
        setVoiceConfig(data.voice_config)
        setSavedConfig(data.voice_config)
      }
    } catch (error) {
      console.log('No voice config yet, using defaults')
    }
  }
  
  const handleConfigChange = (key, value) => {
    setVoiceConfig(prev => ({ ...prev, [key]: value }))
    setSelectedPreset(null) // Clear preset selection when manually adjusting
  }
  
  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.id)
    setVoiceConfig(preset.config)
  }
  
  const handleSave = async () => {
    setSaving(true)
    try {
      await configApi.update({ projectId, voice_config: voiceConfig })
      setSavedConfig({ ...voiceConfig })
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save voice config:', error)
    } finally {
      setSaving(false)
    }
  }
  
  const handleReset = () => {
    if (savedConfig) {
      setVoiceConfig({ ...savedConfig })
      setSelectedPreset(null)
    }
  }
  
  const handleTestVoice = async () => {
    if (!testPrompt.trim()) return
    
    setLoading(true)
    setPreviewMessages([{ role: 'user', content: testPrompt }])
    
    try {
      // Generate response with current voice config
      const response = await echoApi.chat({
        message: testPrompt,
        pageContext: {
          module: 'signal',
          page: 'voice-lab',
          data: {
            voiceConfig,
            testMode: true
          }
        }
      })
      
      setPreviewMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: response.content || response.message || 'No response generated',
          variant: 'new'
        }
      ])
      
    } catch (error) {
      console.error('Voice test error:', error)
      // Generate mock response for demo
      setPreviewMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: generateVoicePreview(testPrompt, voiceConfig),
          variant: 'new'
        }
      ])
    } finally {
      setLoading(false)
    }
  }
  
  const handleQuickPrompt = (prompt) => {
    setTestPrompt(prompt)
  }
  
  // Calculate voice personality summary
  const getVoicePersonality = () => {
    const traits = []
    if (voiceConfig.formality > 0.7) traits.push('Professional')
    else if (voiceConfig.formality < 0.3) traits.push('Casual')
    
    if (voiceConfig.warmth > 0.7) traits.push('Warm')
    else if (voiceConfig.warmth < 0.3) traits.push('Reserved')
    
    if (voiceConfig.technicalDepth > 0.7) traits.push('Technical')
    else if (voiceConfig.technicalDepth < 0.3) traits.push('Simple')
    
    if (voiceConfig.verbosity > 0.7) traits.push('Detailed')
    else if (voiceConfig.verbosity < 0.3) traits.push('Concise')
    
    if (voiceConfig.enthusiasm > 0.7) traits.push('Enthusiastic')
    
    return traits.length > 0 ? traits.join(' • ') : 'Balanced'
  }

  return (
    <SignalAmbient className="min-h-[calc(100vh-300px)] -m-6 p-6">
      <div className="space-y-6">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
              <Mic className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Voice Lab</h2>
              <p className="text-xs text-white/50">Fine-tune Echo's personality</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-xs text-white/40">Voice:</span>
              <span className="text-sm text-emerald-400 font-medium">{getVoicePersonality()}</span>
              {hasChanges && (
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 ml-2">
                  Unsaved
                </Badge>
              )}
            </div>
            <Button
              onClick={handleReset}
              disabled={!hasChanges || !savedConfig}
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white hover:bg-white/[0.05]"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              size="sm"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Voice
            </Button>
          </div>
        </div>
        
        {/* Row 1: Presets + Voice Preview Side by Side */}
        <div className="flex gap-6">
          {/* Presets Column */}
          <GlowCard glow={false} className="w-72 flex-shrink-0">
            <div className="p-4">
              <h3 className="text-sm font-medium text-white mb-3">Voice Presets</h3>
              <div className="space-y-2">
                {VOICE_PRESETS.map((preset) => (
                  <motion.button
                    key={preset.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-all",
                      "border",
                      selectedPreset === preset.id
                        ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500/40"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
                    )}
                  >
                    <p className={cn(
                      "text-sm font-medium",
                      selectedPreset === preset.id ? "text-emerald-400" : "text-white"
                    )}>
                      {preset.name}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">{preset.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          </GlowCard>
          
          {/* Voice Preview */}
          <GlowCard className="flex flex-col flex-1 min-h-[380px]" glow={false}>
          {/* Test Header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Voice Preview</h3>
              <p className="text-xs text-white/40 mt-0.5">Test how Echo responds with current settings</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={showComparison}
                  onCheckedChange={setShowComparison}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <Label className="text-xs text-white/50">Compare to saved</Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewMessages([])}
                disabled={previewMessages.length === 0}
                className="text-white/40 hover:text-white hover:bg-white/[0.05]"
              >
                Clear
              </Button>
            </div>
          </div>
          
          {/* Quick Prompts */}
          <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.01]">
            <div className="flex flex-wrap gap-2">
              {TEST_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(prompt)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs transition-all",
                    "bg-white/[0.03] border border-white/[0.06]",
                    "text-white/60 hover:text-white hover:bg-white/[0.05] hover:border-emerald-500/30"
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          
          {/* Preview Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {previewMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <motion.div
                  className="inline-block mb-4"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <Mic className="h-8 w-8 text-emerald-400" />
                  </div>
                </motion.div>
                <h3 className="text-base font-semibold text-white mb-1">Test Echo's Voice</h3>
                <p className="text-sm text-white/50 max-w-md">
                  Click a quick prompt above or type your own message to preview how Echo responds
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {previewMessages.map((msg, idx) => (
                  <PreviewMessage key={idx} message={msg} variant={msg.variant || 'current'} />
                ))}
                
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
                      <EchoLogo size={20} animated={true} isListening={true} />
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-sm bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                        <span className="text-sm text-white/50">Generating with new voice...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleTestVoice()}
                  placeholder="Type a test message..."
                  disabled={loading}
                  className={cn(
                    "w-full pr-12 py-5",
                    "bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30",
                    "focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  )}
                />
                <Button
                  size="icon"
                  onClick={handleTestVoice}
                  disabled={!testPrompt.trim() || loading}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2",
                    "bg-gradient-to-r from-emerald-500 to-teal-500",
                    "hover:from-emerald-600 hover:to-teal-600",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </GlowCard>
        </div>
        
        {/* Row 2: Voice Parameters - Full Width */}
        <GlowCard glow={false}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-medium text-white">Voice Parameters</h3>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <VoiceSliderCompact
                label="Formality"
                value={voiceConfig.formality}
                onChange={(v) => handleConfigChange('formality', v)}
                leftLabel="Casual"
                rightLabel="Formal"
              />
              <VoiceSliderCompact
                label="Warmth"
                value={voiceConfig.warmth}
                onChange={(v) => handleConfigChange('warmth', v)}
                leftLabel="Reserved"
                rightLabel="Warm"
              />
              <VoiceSliderCompact
                label="Technical"
                value={voiceConfig.technicalDepth}
                onChange={(v) => handleConfigChange('technicalDepth', v)}
                leftLabel="Simple"
                rightLabel="Deep"
              />
              <VoiceSliderCompact
                label="Length"
                value={voiceConfig.verbosity}
                onChange={(v) => handleConfigChange('verbosity', v)}
                leftLabel="Brief"
                rightLabel="Detailed"
              />
              <VoiceSliderCompact
                label="Energy"
                value={voiceConfig.enthusiasm}
                onChange={(v) => handleConfigChange('enthusiasm', v)}
                leftLabel="Calm"
                rightLabel="Energetic"
              />
            </div>
          </div>
        </GlowCard>
      </div>
    </SignalAmbient>
  )
}

// Helper function to generate mock voice preview
function generateVoicePreview(prompt, config) {
  const { formality, warmth, verbosity, enthusiasm, technicalDepth } = config
  
  // Base responses for different prompts
  const baseResponses = {
    services: "We offer digital marketing services including SEO, content strategy, and analytics.",
    pricing: "Our pricing starts at $99/month with flexible tiers based on your needs.",
    problem: "I understand you're experiencing an issue. Let me help you resolve this.",
    feature: "This feature allows you to automate your workflow and save time.",
    fit: "Our solution is designed for businesses looking to grow their online presence.",
    different: "What sets us apart is our AI-powered approach and dedicated support.",
    default: "I'd be happy to help you with that. What specific information are you looking for?"
  }
  
  // Determine which base response to use
  let base = baseResponses.default
  const promptLower = prompt.toLowerCase()
  if (promptLower.includes('service') || promptLower.includes('offer')) base = baseResponses.services
  else if (promptLower.includes('price') || promptLower.includes('cost')) base = baseResponses.pricing
  else if (promptLower.includes('problem') || promptLower.includes('issue')) base = baseResponses.problem
  else if (promptLower.includes('feature') || promptLower.includes('work')) base = baseResponses.feature
  else if (promptLower.includes('fit') || promptLower.includes('right')) base = baseResponses.fit
  else if (promptLower.includes('different') || promptLower.includes('competitor')) base = baseResponses.different
  
  // Apply voice modifiers
  let response = base
  
  // Warmth modifiers
  if (warmth > 0.7) {
    response = "Great question! " + response + " I'm here to help you every step of the way."
  } else if (warmth < 0.3) {
    response = response.replace("I'd be happy to", "I can")
  }
  
  // Formality modifiers
  if (formality > 0.7) {
    response = response.replace("We offer", "Our organization provides")
    response = response.replace("I'd be happy", "I would be pleased")
  } else if (formality < 0.3) {
    response = response.replace("Our organization", "We")
    response = response.replace("I would be pleased", "Happy")
  }
  
  // Verbosity modifiers
  if (verbosity > 0.7) {
    response += " Additionally, I can provide more detailed information about any specific aspect you're interested in. Our team is always available to discuss your unique requirements and how we can tailor our approach to meet your goals."
  } else if (verbosity < 0.3) {
    response = response.split('.')[0] + "."
  }
  
  // Enthusiasm modifiers
  if (enthusiasm > 0.7) {
    response = response.replace("I'd be happy", "I'd love")
    response = response.replace(".", "! ").trim()
    if (!response.endsWith('!')) response += "!"
  }
  
  return response
}
