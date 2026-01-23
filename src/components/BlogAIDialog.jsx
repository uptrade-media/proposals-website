// src/components/BlogAIDialog.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Sparkles, Loader2, Upload, X, CheckCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import api from '../lib/api'
import { createClient } from '@supabase/supabase-js'
import useAuthStore from '@/lib/auth-store'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Tenant-specific category configurations
const CATEGORY_CONFIGS = {
  // Default (Uptrade Media)
  default: {
    categories: [
      { value: 'insights', label: 'Insights' },
      { value: 'news', label: 'News' },
      { value: 'guides', label: 'Guides' },
      { value: 'case-studies', label: 'Case Studies' },
      { value: 'seo', label: 'SEO' },
      { value: 'web-design', label: 'Web Design' },
      { value: 'marketing', label: 'Digital Marketing' },
    ],
    defaultCategory: 'insights',
    defaultAuthor: 'Uptrade Media',
    defaultAudience: 'Small business owners and marketing professionals',
    brandDescription: 'A digital marketing agency'
  },
  // God's Workout Apparel
  'gods-workout-apparel': {
    categories: [
      { value: 'faith', label: 'Faith & Devotion' },
      { value: 'training', label: 'Training & Fitness' },
      { value: 'discipline', label: 'Discipline' },
      { value: 'lifestyle', label: 'Lifestyle' },
      { value: 'scripture', label: 'Scripture Study' },
      { value: 'motivation', label: 'Motivation' },
      { value: 'nutrition', label: 'Nutrition' },
    ],
    defaultCategory: 'discipline',
    defaultAuthor: "God's Workout Apparel",
    defaultAudience: 'Christian athletes and fitness enthusiasts seeking to honor God through physical discipline',
    brandDescription: 'Faith-driven fitness apparel brand'
  }
}

// Helper to get config based on org
function getTenantConfig(org) {
  if (!org) return CATEGORY_CONFIGS.default
  
  // Check by slug or name
  const slug = org.slug?.toLowerCase() || ''
  const name = org.name?.toLowerCase() || ''
  
  if (slug.includes('gods-workout') || slug.includes('gwa') || name.includes("god's workout")) {
    return CATEGORY_CONFIGS['gods-workout-apparel']
  }
  
  return CATEGORY_CONFIGS.default
}

export default function BlogAIDialog({ onSuccess, open, onOpenChange, prefillData }) {
  const { currentOrg } = useAuthStore()
  const tenantConfig = getTenantConfig(currentOrg)
  
  // Support both controlled and uncontrolled modes
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange ?? setInternalOpen
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStage, setGenerationStage] = useState(0) // 0: idle, 1: writing content, 2: SEO metadata, 3: saving, 4: complete
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [formData, setFormData] = useState({
    topic: '',
    category: tenantConfig.defaultCategory,
    keywords: '',
    keyPoints: '',
    targetAudience: tenantConfig.defaultAudience,
    wordCount: '1200-1500',
    tone: 'professional',
    featuredImage: '',
    author: tenantConfig.defaultAuthor,
    publishImmediately: false,
    includeStats: true,
    includeExamples: true,
    includeFAQ: false
  })
  
  // Apply prefill data when it changes (from Blog Brain topic recommendations)
  useEffect(() => {
    if (prefillData && isOpen) {
      setFormData(prev => ({
        ...prev,
        topic: prefillData.topic || '',
        keywords: prefillData.keywords || '',
        keyPoints: prefillData.keyPoints || '',
        category: prefillData.category || prev.category
      }))
    }
  }, [prefillData, isOpen])
  
  const GENERATION_STAGES = [
    { label: 'Starting...', icon: '🚀' },
    { label: 'Writing content...', icon: '✍️' },
    { label: 'Generating SEO metadata...', icon: '🔍' },
    { label: 'Saving to database...', icon: '💾' },
    { label: 'Complete!', icon: '✅' }
  ]
  
  // Simulate stage progression during generation
  useEffect(() => {
    if (!isGenerating) {
      setGenerationStage(0)
      return
    }
    
    // Stage 1 after 1s, Stage 2 after 15s, Stage 3 after 25s
    const timers = [
      setTimeout(() => setGenerationStage(1), 1000),
      setTimeout(() => setGenerationStage(2), 15000),
      setTimeout(() => setGenerationStage(3), 25000),
    ]
    
    return () => timers.forEach(clearTimeout)
  }, [isGenerating])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      await uploadImage(files[0])
    }
  }

  const handleFileInput = async (e) => {
    const files = e.target.files
    if (files && files[0]) {
      await uploadImage(files[0])
    }
  }

  const uploadImage = async (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB')
      return
    }

    // Create immediate local preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview({
        url: e.target.result,
        name: file.name,
        isLocal: true
      })
    }
    reader.readAsDataURL(file)

    setIsUploading(true)
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `blog-images/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      setUploadedImage({
        url: publicUrl,
        name: file.name
      })
      
      // Update preview to use the uploaded URL
      setImagePreview({
        url: publicUrl,
        name: file.name,
        isLocal: false
      })
      
      setFormData({ ...formData, featuredImage: publicUrl })
      console.log('[BlogAI] Image uploaded:', publicUrl)
    } catch (error) {
      console.error('[BlogAI] Upload failed:', error)
      alert('Failed to upload image: ' + error.message)
      setImagePreview(null) // Clear preview on error
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = () => {
    setUploadedImage(null)
    setImagePreview(null)
    setFormData({ ...formData, featuredImage: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsGenerating(true)
    setGenerationStage(0)

    try {
      console.log('[BlogAI] Starting blog generation:', formData.topic)
      
      // Create job
      const response = await blogApi.createAI(formData)

      if (response.data.success) {
        const jobId = response.data.jobId
        console.log('[BlogAI] Job created:', jobId)
        
        // Poll for job status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await blogApi.getAIJobStatus(jobId)
            const status = statusResponse.data
            
            // Update progress based on job status
            if (status.progress && status.progress.stage !== undefined) {
              setGenerationStage(status.progress.stage)
            }
            
            if (status.status === 'completed') {
              clearInterval(pollInterval)
              console.log('[BlogAI] ✅ Job completed successfully:', status.result?.title)
              console.log('[BlogAI] Blog post ID:', status.blogPostId)
              
              // Mark as complete
              setGenerationStage(4)
              
              // Wait a moment to show the success state
              await new Promise(resolve => setTimeout(resolve, 1500))
              
              // Reset form
              setFormData({
                topic: '',
                category: tenantConfig.defaultCategory,
                keywords: '',
                keyPoints: '',
                targetAudience: tenantConfig.defaultAudience,
                wordCount: '1200-1500',
                tone: 'professional',
                featuredImage: '',
                author: tenantConfig.defaultAuthor,
                publishImmediately: false,
                includeStats: true,
                includeExamples: true,
                includeFAQ: false
              })
              setUploadedImage(null)
              setImagePreview(null)
              
              // Close dialog
              setIsOpen(false)
              setIsGenerating(false)
              setGenerationStage(0)
              
              // Notify parent to refresh
              console.log('[BlogAI] Calling onSuccess callback...')
              if (onSuccess) {
                onSuccess(status.result)
              } else {
                console.warn('[BlogAI] No onSuccess callback provided!')
              }
            } else if (status.status === 'failed') {
              clearInterval(pollInterval)
              console.error('[BlogAI] ❌ Job failed:', status.error)
              throw new Error(status.error || 'Job failed')
            }
          } catch (pollError) {
            console.error('[BlogAI] Polling error:', pollError)
          }
        }, 2000) // Poll every 2 seconds
      }
    } catch (error) {
      console.error('[BlogAI] Error:', error)
      alert('Failed to create blog post: ' + (error.response?.data?.error || error.message))
      setIsGenerating(false)
      setGenerationStage(0)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Only render trigger in uncontrolled mode */}
      {open === undefined && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Sparkles className="w-4 h-4" />
            Create with AI
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {prefillData ? 'Create from Signal Recommendation' : 'Create Blog Post with AI'}
          </DialogTitle>
          <DialogDescription>
            {prefillData 
              ? 'Signal has recommended this topic based on your SEO data. Customize the details below.'
              : "Provide the topic and key details. AI will generate a complete, SEO-optimized blog post in Uptrade's brand voice."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Blog Topic *</Label>
            <Input
              id="topic"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g., How to Improve Your Website's SEO in 2025"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tenantConfig.categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Target Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              placeholder="e.g., SEO, search engine optimization, website ranking"
            />
          </div>

          {/* Key Points */}
          <div className="space-y-2">
            <Label htmlFor="keyPoints">Key Points to Cover</Label>
            <Textarea
              id="keyPoints"
              value={formData.keyPoints}
              onChange={(e) => setFormData({ ...formData, keyPoints: e.target.value })}
              placeholder="What specific topics or points should be covered? (Optional - AI will expand comprehensively if left blank)"
              rows={3}
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            />
          </div>

          {/* Word Count */}
          <div className="space-y-2">
            <Label htmlFor="wordCount">Target Word Count</Label>
            <Select
              value={formData.wordCount}
              onValueChange={(value) => setFormData({ ...formData, wordCount: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="800-1000">Short (800-1000 words)</SelectItem>
                <SelectItem value="1200-1500">Medium (1200-1500 words)</SelectItem>
                <SelectItem value="1800-2200">Long (1800-2200 words)</SelectItem>
                <SelectItem value="2500+">Comprehensive (2500+ words)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label htmlFor="tone">Writing Tone</Label>
            <Select
              value={formData.tone}
              onValueChange={(value) => setFormData({ ...formData, tone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="beginner-friendly">Beginner-Friendly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Featured Image Upload */}
          <div className="space-y-2">
            <Label>Featured Image</Label>
            
            {!imagePreview ? (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' 
                    : 'border-[var(--glass-border)] hover:border-emerald-400 hover:bg-emerald-50/30'
                } ${isUploading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isUploading && document.getElementById('imageInput').click()}
              >
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isUploading}
                />
                
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      <span className="font-semibold text-emerald-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">PNG, JPG, WebP up to 5MB</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-200 shadow-lg aspect-[1200/630]">
                <img 
                  src={imagePreview.url} 
                  alt="Featured" 
                  className="w-full h-full object-cover"
                />
                {/* Status indicator overlay */}
                {isUploading ? (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
                    <CheckCircle className="w-4 h-4" />
                    Image uploaded
                  </div>
                )}
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-md"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-emerald-100">
                  <p className="text-sm font-medium text-emerald-700 truncate">{imagePreview.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Content Options</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeStats"
                checked={formData.includeStats}
                onCheckedChange={(checked) => setFormData({ ...formData, includeStats: checked })}
              />
              <label htmlFor="includeStats" className="text-sm cursor-pointer">
                Include statistics and data points
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeExamples"
                checked={formData.includeExamples}
                onCheckedChange={(checked) => setFormData({ ...formData, includeExamples: checked })}
              />
              <label htmlFor="includeExamples" className="text-sm cursor-pointer">
                Include real-world examples
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeFAQ"
                checked={formData.includeFAQ}
                onCheckedChange={(checked) => setFormData({ ...formData, includeFAQ: checked })}
              />
              <label htmlFor="includeFAQ" className="text-sm cursor-pointer">
                Include FAQ section
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="publishImmediately"
                checked={formData.publishImmediately}
                onCheckedChange={(checked) => setFormData({ ...formData, publishImmediately: checked })}
              />
              <label htmlFor="publishImmediately" className="text-sm cursor-pointer">
                Publish immediately (otherwise save as draft)
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col gap-3 pt-4">
            {isGenerating && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">{GENERATION_STAGES[generationStage]?.icon || '🚀'}</div>
                  <div>
                    <p className="font-medium text-emerald-800">{GENERATION_STAGES[generationStage]?.label || 'Starting...'}</p>
                    <p className="text-xs text-emerald-600">This may take 30-60 seconds</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000 ease-out"
                    style={{ width: `${((generationStage + 1) / GENERATION_STAGES.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isGenerating || isUploading} 
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {GENERATION_STAGES[generationStage]?.label || 'Generating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Blog Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
