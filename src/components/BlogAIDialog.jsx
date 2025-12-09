// src/components/BlogAIDialog.jsx
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Sparkles, Loader2, Upload, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import api from '../lib/api'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function BlogAIDialog({ onSuccess }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [formData, setFormData] = useState({
    topic: '',
    category: 'insights',
    keywords: '',
    keyPoints: '',
    targetAudience: 'Small business owners and marketing professionals',
    wordCount: '1200-1500',
    tone: 'professional',
    featuredImage: '',
    author: 'Uptrade Media',
    publishImmediately: false,
    includeStats: true,
    includeExamples: true,
    includeFAQ: false
  })

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
      
      setFormData({ ...formData, featuredImage: publicUrl })
      console.log('[BlogAI] Image uploaded:', publicUrl)
    } catch (error) {
      console.error('[BlogAI] Upload failed:', error)
      alert('Failed to upload image: ' + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = () => {
    setUploadedImage(null)
    setFormData({ ...formData, featuredImage: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsGenerating(true)

    try {
      console.log('[BlogAI] Creating blog post with AI:', formData.topic)
      
      const response = await api.post('/.netlify/functions/blog-create-ai', formData)

      if (response.data.success) {
        console.log('[BlogAI] Blog post created:', response.data.data.title)
        
        // Reset form
        setFormData({
          topic: '',
          category: 'insights',
          keywords: '',
          keyPoints: '',
          targetAudience: 'Small business owners and marketing professionals',
          wordCount: '1200-1500',
          tone: 'professional',
          featuredImage: '',
          author: 'Uptrade Media',
          publishImmediately: false,
          includeStats: true,
          includeExamples: true,
          includeFAQ: false
        })
        setUploadedImage(null)
        
        setIsOpen(false)
        
        // Notify parent to refresh
        if (onSuccess) {
          onSuccess(response.data.data)
        }
      }
    } catch (error) {
      console.error('[BlogAI] Error:', error)
      alert('Failed to create blog post: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="w-4 h-4" />
          Create with AI
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Blog Post with AI</DialogTitle>
          <DialogDescription>
            Provide the topic and key details. AI will generate a complete, SEO-optimized blog post in Uptrade's brand voice.
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
                <SelectItem value="insights">Insights</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="guides">Guides</SelectItem>
                <SelectItem value="case-studies">Case Studies</SelectItem>
                <SelectItem value="seo">SEO</SelectItem>
                <SelectItem value="web-design">Web Design</SelectItem>
                <SelectItem value="marketing">Digital Marketing</SelectItem>
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
            
            {!uploadedImage ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-[var(--glass-border)] hover:border-[var(--text-tertiary)]'
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
                
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--text-tertiary)]" />
                    <p className="text-sm text-[var(--text-secondary)]">Uploading image...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-[var(--text-tertiary)]" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">PNG, JPG, WebP up to 5MB</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative border rounded-lg overflow-hidden">
                <img 
                  src={uploadedImage.url} 
                  alt="Featured" 
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="p-2 bg-[var(--surface-secondary)]">
                  <p className="text-sm text-[var(--text-secondary)] truncate">{uploadedImage.name}</p>
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
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating} className="flex-1">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating blog post...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Blog Post
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
