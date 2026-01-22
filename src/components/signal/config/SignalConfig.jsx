// src/components/signal/config/SignalConfig.jsx
// Signal Config - Settings and configuration for Signal AI

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Globe,
  Palette,
  MessageSquare,
  Zap,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Brain,
  Sliders,
  Cpu,
  Rocket,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useSignalStore } from '@/lib/signal-store'
import { configApi, setupApi } from '@/lib/signal-api'
import { SignalAmbient, GlowCard } from '../shared/SignalUI'

export default function SignalConfig({ projectId, onNavigateToWizard = () => {} }) {
  const [activeTab, setActiveTab] = useState('setup')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [setupStatus, setSetupStatus] = useState(null)
  const [runningSetup, setRunningSetup] = useState(false)
  const [config, setConfig] = useState({
    // General
    enabled: true,
    greeting: "Hi! How can I help you today?",
    fallbackMessage: "I'm not sure about that. Let me connect you with someone who can help.",
    
    // Widget
    widgetEnabled: true,
    widgetPosition: 'bottom-right',
    primaryColor: '#10b981',
    
    // Response
    responseStyle: 'balanced',
    maxResponseLength: 500,
    includeEmoji: true,
    includeSources: false,
    
    // Hours
    businessHoursEnabled: false,
    timezone: 'America/New_York',
    
    // Advanced
    model: 'gpt-4o-mini',
    temperature: 0.7,
    confidenceThreshold: 0.7
  })
  
  const { moduleConfig, fetchModuleConfig } = useSignalStore()
  
  useEffect(() => {
    if (projectId) {
      loadConfig()
    }
  }, [projectId])
  
  const loadConfig = async () => {
    try {
      setLoading(true)
      await fetchModuleConfig(projectId)
      
      // Also load setup status
      try {
        const status = await setupApi.getStatus(projectId)
        setSetupStatus(status.data || status)
      } catch (err) {
        console.warn('Could not load setup status:', err)
      }
      
      if (moduleConfig) {
        setConfig(prev => ({
          ...prev,
          ...moduleConfig,
          greeting: moduleConfig.greeting_message || prev.greeting,
          widgetEnabled: moduleConfig.widget_enabled ?? prev.widgetEnabled,
          primaryColor: moduleConfig.primary_color || prev.primaryColor
        }))
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleAutoSetup = async () => {
    try {
      setRunningSetup(true)
      const result = await setupApi.autoSetup(projectId)
      
      // Refresh setup status
      const status = await setupApi.getStatus(projectId)
      setSetupStatus(status.data || status)
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Auto-setup failed:', error)
    } finally {
      setRunningSetup(false)
    }
  }
  
  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Save config via Signal API
      await configApi.update(projectId, {
        widget_enabled: config.widgetEnabled,
        greeting_message: config.greeting,
        primary_color: config.primaryColor,
        // Add other fields as API supports
      })
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setSaving(false)
    }
  }
  
  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }
  
  if (loading) {
    return (
      <SignalAmbient>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </SignalAmbient>
    )
  }
  
  const tabs = [
    { id: 'setup', label: 'Setup', icon: Rocket },
    { id: 'general', label: 'General', icon: Settings },
    { id: 'widget', label: 'Widget', icon: MessageSquare },
    { id: 'response', label: 'Response', icon: Sliders },
    { id: 'advanced', label: 'Advanced', icon: Cpu }
  ]
  
  return (
    <SignalAmbient>
      <div className="space-y-6">
        {/* Header with Save Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Signal Configuration
            </h2>
            <p className="text-sm text-white/50">Customize how Signal behaves and responds</p>
          </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 text-emerald-400 text-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Saved!
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "relative px-5 py-2.5 rounded-xl font-medium text-sm",
              "bg-gradient-to-r from-emerald-500 to-teal-500",
              "text-white shadow-lg shadow-emerald-500/25",
              "hover:shadow-xl hover:shadow-emerald-500/30",
              "transition-all duration-300",
              "flex items-center gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </motion.button>
        </div>
      </div>
      
      {/* Custom Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              activeTab === tab.id ? "text-white" : "text-white/50 hover:text-white/70"
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeConfigTab"
                className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon className="h-4 w-4 relative z-10" />
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Setup Status Card */}
            <GlowCard glow={!setupStatus?.isComplete}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
                  <Rocket className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Knowledge Setup</h3>
                  <p className="text-xs text-white/50">Train Signal on your marketing site</p>
                </div>
              </div>
              
              {setupStatus ? (
                <div className="space-y-4">
                  {/* Setup Progress */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { key: 'profileExtracted', label: 'Profile Extracted' },
                      { key: 'profileSynced', label: 'Profile Synced' },
                      { key: 'knowledgeSynced', label: 'Knowledge Built' },
                      { key: 'faqsGenerated', label: 'FAQs Generated' },
                      { key: 'configInitialized', label: 'Config Ready' },
                    ].map((step) => (
                      <div 
                        key={step.key}
                        className={cn(
                          "p-3 rounded-lg border text-center",
                          setupStatus.steps?.[step.key]
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-white/[0.02] border-white/[0.06]"
                        )}
                      >
                        <div className="flex justify-center mb-2">
                          {setupStatus.steps?.[step.key] ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-white/30" />
                          )}
                        </div>
                        <p className="text-xs text-white/70">{step.label}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-white/50">
                    <span>{setupStatus.stats?.knowledgeChunks || 0} knowledge chunks</span>
                    <span>•</span>
                    <span>{setupStatus.stats?.approvedFaqs || 0} FAQs</span>
                    {setupStatus.lastSetupAt && (
                      <>
                        <span>•</span>
                        <span>Last updated: {new Date(setupStatus.lastSetupAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-white/20 mb-4" />
                  <p className="text-white/50">Signal hasn't been set up yet</p>
                  <p className="text-xs text-white/30 mt-1">Run the setup wizard to train Signal on your site</p>
                </div>
              )}
            </GlowCard>
            
            {/* Actions Card */}
            <GlowCard glow={false}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/20">
                  <Zap className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Setup Actions</h3>
                  <p className="text-xs text-white/50">Train or retrain Signal's knowledge</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden">
                {/* Full Setup Wizard */}
                <button
                  onClick={() => onNavigateToWizard?.()}
                  className={cn(
                    "p-5 rounded-xl text-left",
                    "bg-gradient-to-br from-teal-500/10 to-cyan-500/10",
                    "border border-teal-500/20 hover:border-teal-500/40",
                    "transition-all duration-300 group"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Globe className="h-6 w-6 text-teal-400" />
                    <Rocket className="h-4 w-4 text-white/30 group-hover:text-teal-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-1">Full Setup Wizard</h4>
                  <p className="text-xs text-white/50">
                    Comprehensive site analysis with GSC integration, schema markup, and more
                  </p>
                </button>
                
                {/* Quick Auto-Setup */}
                <button
                  onClick={handleAutoSetup}
                  disabled={runningSetup}
                  className={cn(
                    "p-5 rounded-xl text-left",
                    "bg-gradient-to-br from-emerald-500/10 to-teal-500/10",
                    "border border-emerald-500/20 hover:border-emerald-500/40",
                    "transition-all duration-300",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    {runningSetup ? (
                      <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
                    ) : (
                      <RefreshCw className="h-6 w-6 text-emerald-400" />
                    )}
                  </div>
                  <h4 className="font-semibold text-white mb-1">
                    {runningSetup ? 'Running Setup...' : 'Quick Auto-Setup'}
                  </h4>
                  <p className="text-xs text-white/50">
                    {runningSetup 
                      ? 'Extracting profile, syncing knowledge, generating FAQs...'
                      : 'Re-sync knowledge from existing SEO pages and regenerate FAQs'
                    }
                  </p>
                </button>
              </div>
              
              <p className="text-xs text-white/30 mt-4">
                💡 Use the Full Setup Wizard for first-time setup. Use Quick Auto-Setup to refresh knowledge after site changes.
              </p>
            </GlowCard>
          </motion.div>
        )}
        
        {activeTab === 'general' && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GlowCard>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
                  <Settings className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">General Settings</h3>
                  <p className="text-xs text-white/50">Core Signal AI configuration</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Enable Signal */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div>
                    <Label className="text-white">Enable Signal</Label>
                    <p className="text-xs text-white/50 mt-1">Turn Signal AI on/off for this project</p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => updateConfig('enabled', checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                
                {/* Greeting Message */}
                <div className="space-y-2">
                  <Label className="text-white">Greeting Message</Label>
                  <Textarea
                    value={config.greeting}
                    onChange={(e) => updateConfig('greeting', e.target.value)}
                    placeholder="Hi! How can I help you today?"
                    className="min-h-[80px] bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  />
                  <p className="text-xs text-white/40">
                    The first message Echo sends to visitors
                </p>
                </div>
                
                {/* Fallback Message */}
                <div className="space-y-2">
                  <Label className="text-white">Fallback Message</Label>
                  <Textarea
                    value={config.fallbackMessage}
                    onChange={(e) => updateConfig('fallbackMessage', e.target.value)}
                    placeholder="I'm not sure about that..."
                    className="min-h-[80px] bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  />
                  <p className="text-xs text-white/40">
                    Used when Echo can't answer confidently
                  </p>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        )}
        
        {activeTab === 'widget' && (
          <motion.div
            key="widget"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GlowCard>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
                  <MessageSquare className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Widget Settings</h3>
                  <p className="text-xs text-white/50">Customize the Echo chat widget</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Enable Widget */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div>
                    <Label className="text-white">Enable Chat Widget</Label>
                    <p className="text-xs text-white/50 mt-1">Show the Echo widget on your website</p>
                  </div>
                  <Switch
                    checked={config.widgetEnabled}
                    onCheckedChange={(checked) => updateConfig('widgetEnabled', checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                
                {/* Widget Position */}
                <div className="space-y-2">
                  <Label className="text-white">Widget Position</Label>
                  <Select
                    value={config.widgetPosition}
                    onValueChange={(value) => updateConfig('widgetPosition', value)}
                  >
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Primary Color */}
                <div className="space-y-2">
                  <Label className="text-white">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig('primaryColor', e.target.value)}
                        className="w-14 h-10 p-1 cursor-pointer rounded-lg border-white/[0.08] bg-transparent"
                      />
                    </div>
                    <Input
                      value={config.primaryColor}
                      onChange={(e) => updateConfig('primaryColor', e.target.value)}
                      className="flex-1 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
                      placeholder="#10b981"
                    />
                  </div>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        )}
        
        {activeTab === 'response' && (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GlowCard>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
                  <Sliders className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Response Settings</h3>
                  <p className="text-xs text-white/50">Control how Echo responds</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Response Style */}
                <div className="space-y-2">
                  <Label className="text-white">Response Style</Label>
                  <Select
                    value={config.responseStyle}
                    onValueChange={(value) => updateConfig('responseStyle', value)}
                  >
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise - Short and direct</SelectItem>
                      <SelectItem value="balanced">Balanced - Medium length</SelectItem>
                      <SelectItem value="detailed">Detailed - Thorough explanations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Max Response Length */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex justify-between">
                    <Label className="text-white">Max Response Length</Label>
                    <span className="text-sm text-emerald-400 font-medium">{config.maxResponseLength} chars</span>
                  </div>
                  <Slider
                    value={[config.maxResponseLength]}
                    onValueChange={([value]) => updateConfig('maxResponseLength', value)}
                    min={100}
                    max={2000}
                    step={50}
                    className="[&_[role=slider]]:bg-emerald-500"
                  />
                </div>
                
                {/* Toggles */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div>
                    <Label className="text-white">Include Emoji</Label>
                    <p className="text-xs text-white/50 mt-1">Add relevant emoji to responses</p>
                  </div>
                  <Switch
                    checked={config.includeEmoji}
                    onCheckedChange={(checked) => updateConfig('includeEmoji', checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div>
                    <Label className="text-white">Show Sources</Label>
                    <p className="text-xs text-white/50 mt-1">Include links to source pages</p>
                  </div>
                  <Switch
                    checked={config.includeSources}
                    onCheckedChange={(checked) => updateConfig('includeSources', checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>
            </GlowCard>
          </motion.div>
        )}
        
        {activeTab === 'advanced' && (
          <motion.div
            key="advanced"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <GlowCard>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
                  <Cpu className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Advanced Settings</h3>
                  <p className="text-xs text-white/50">Fine-tune AI behavior (use with caution)</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Model Selection */}
                <div className="space-y-2">
                  <Label className="text-white">AI Model</Label>
                  <Select
                    value={config.model}
                    onValueChange={(value) => updateConfig('model', value)}
                  >
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Affordable)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Best Quality)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Temperature */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex justify-between">
                    <Label className="text-white">Creativity (Temperature)</Label>
                    <span className="text-sm text-emerald-400 font-medium">{config.temperature}</span>
                  </div>
                  <Slider
                    value={[config.temperature]}
                    onValueChange={([value]) => updateConfig('temperature', value)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="[&_[role=slider]]:bg-emerald-500"
                  />
                  <p className="text-xs text-white/40">
                    Lower = more consistent, Higher = more creative
                  </p>
                </div>
              
                {/* Confidence Threshold */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex justify-between">
                    <Label className="text-white">Confidence Threshold</Label>
                    <span className="text-sm text-emerald-400 font-medium">{Math.round(config.confidenceThreshold * 100)}%</span>
                  </div>
                  <Slider
                    value={[config.confidenceThreshold]}
                    onValueChange={([value]) => updateConfig('confidenceThreshold', value)}
                    min={0.5}
                    max={0.95}
                    step={0.05}
                    className="[&_[role=slider]]:bg-emerald-500"
                  />
                  <p className="text-xs text-white/40">
                    Minimum confidence to answer (lower triggers fallback)
                  </p>
                </div>
              </div>
            </GlowCard>
            
            {/* Danger Zone */}
            <GlowCard className="!border-red-500/20 !bg-red-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="font-semibold text-red-400">Danger Zone</h3>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <div>
                  <p className="text-sm font-medium text-white">Reset Knowledge Base</p>
                  <p className="text-xs text-white/50 mt-1">Delete all learned knowledge and start fresh</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </motion.button>
              </div>
            </GlowCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </SignalAmbient>
  )
}
