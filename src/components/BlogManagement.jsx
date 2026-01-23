// src/components/BlogManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent } from './ui/card'
import { Textarea } from './ui/textarea'
import { MarkdownEditor } from './ui/MarkdownEditor'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Separator } from './ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  AlertCircle, Loader2, Plus, Trash2, Edit2, Eye, Search, 
  FileText, Calendar, Clock, Tag, Image as ImageIcon, 
  MoreVertical, ExternalLink, Copy, CheckCircle2,
  Upload, X, Filter, ArrowUpDown, Star, BarChart3,
  Lightbulb, Sparkles
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import useAuthStore from '../lib/auth-store'
import { blogApi } from '@/lib/portal-api'
import BlogAIDialog from './BlogAIDialog'
import BlogBrain from './blog/BlogBrain'
import SignalIcon from './ui/SignalIcon'
import { useSignalAccess } from '@/lib/signal-access'

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
  }
}

// Helper to get config based on org
function getTenantConfig(org) {
  if (!org) return CATEGORY_CONFIGS.default
  
  const slug = org.slug?.toLowerCase() || ''
  const name = org.name?.toLowerCase() || ''
  
  if (slug.includes('gods-workout') || slug.includes('gwa') || name.includes("god's workout")) {
    return CATEGORY_CONFIGS['gods-workout-apparel']
  }
  
  return CATEGORY_CONFIGS.default
}

// Status colors
const statusColors = {
  published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  draft: 'bg-amber-100 text-amber-700 border-amber-200',
  archived: 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)] border-[var(--glass-border)]'
}

// Category colors
const categoryColors = {
  news: 'bg-blue-50 text-blue-700',
  design: 'bg-purple-50 text-purple-700',
  marketing: 'bg-pink-50 text-pink-700',
  media: 'bg-orange-50 text-orange-700',
  insights: 'bg-teal-50 text-teal-700',
  guides: 'bg-indigo-50 text-indigo-700',
  seo: 'bg-green-50 text-green-700',
  'web-design': 'bg-violet-50 text-violet-700',
  'case-studies': 'bg-cyan-50 text-cyan-700'
}

// Blog Card Component
function BlogCard({ blog, onEdit, onDelete, onPreview, onToggleFeatured, onPublish, isLoading }) {
  const [copied, setCopied] = useState(false)
  
  const copySlug = () => {
    navigator.clipboard.writeText(`/blog/${blog.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (date) => {
    if (!date) return 'Not published'
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden border-0 shadow-sm bg-[var(--glass-bg)] p-0">
      <div className="flex">
        {/* Image Section - fills left side edge-to-edge */}
        <div className="w-48 h-36 flex-shrink-0 bg-[var(--surface-secondary)] relative overflow-hidden">
          {(blog.featuredImage || blog.featured_image) ? (
            <img 
              src={blog.featuredImage || blog.featured_image} 
              alt={blog.featuredImageAlt || blog.featured_image_alt || blog.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-[var(--text-tertiary)]" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <Badge className={`${statusColors[blog.status]} border text-xs font-medium`}>
              {blog.status}
            </Badge>
            {blog.featured && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs font-medium">
                <Star className="w-3 h-3 mr-1 fill-amber-500" />
                Featured
              </Badge>
            )}
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1 group-hover:text-emerald-600 transition-colors">
                  {blog.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-1">
                  {blog.excerpt}
                </p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(blog)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPreview(blog)}>
                    <Eye className="w-4 h-4 mr-2" /> Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copySlug}>
                    {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy URL'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(`/blog/${blog.slug}`, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" /> View Live
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {blog.status === 'draft' && (
                    <DropdownMenuItem onClick={() => onPublish(blog.id)} className="text-emerald-600 focus:text-emerald-600">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Publish Post
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onToggleFeatured(blog.id, !blog.featured)}>
                    <Star className={`w-4 h-4 mr-2 ${blog.featured ? 'fill-amber-500 text-amber-500' : ''}`} />
                    {blog.featured ? 'Unfeature' : 'Feature'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(blog.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-3 mt-3 text-xs text-[var(--text-tertiary)]">
            <Badge variant="secondary" className={`${categoryColors[blog.category] || 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'} border-0`}>
              {blog.category}
            </Badge>
            {blog.viewCount > 0 && (
              <span className="flex items-center gap-1" title="Views (last 30 days)">
                <BarChart3 className="w-3 h-3" />
                {blog.viewCount.toLocaleString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {blog.readingTime || blog.reading_time || 5} min
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(blog.publishedAt || blog.published_at || blog.createdAt || blog.created_at)}
            </span>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

// Image Upload Component with Drag & Drop
function ImageUploader({ value, onChange, onRemove }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFile(file)
    }
  }, [])

  const handleFile = async (file) => {
    setIsUploading(true)
    try {
      // Convert to base64 for preview (in production, upload to Supabase)
      const reader = new FileReader()
      reader.onload = (e) => {
        onChange(e.target?.result)
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Upload failed:', error)
      setIsUploading(false)
    }
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
        isDragging 
          ? 'border-emerald-400 bg-emerald-50' 
          : value 
            ? 'border-transparent' 
            : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 bg-[var(--surface-secondary)]/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {value ? (
        <div className="relative aspect-video rounded-xl overflow-hidden group">
          <img src={value} alt="Featured" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => document.getElementById('image-upload').click()}>
              <Upload className="w-4 h-4 mr-2" /> Replace
            </Button>
            <Button size="sm" variant="destructive" onClick={onRemove}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center py-12 cursor-pointer">
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {isDragging ? 'Drop image here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">PNG, JPG, WebP up to 10MB</p>
            </>
          )}
        </label>
      )}
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  )
}

// Stats Card
function StatsCard({ icon: Icon, label, value, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <div className="bg-[var(--glass-bg)] rounded-xl p-4 border border-[var(--glass-border)] shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function BlogManagement() {
  const { user, currentOrg, currentProject } = useAuthStore()
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  const isAdmin = user?.role === 'admin'
  // Allow access if user is admin OR if they have a current project context (org member with project access)
  const hasAccess = isAdmin || !!currentProject
  const tenantConfig = getTenantConfig(currentOrg)
  
  // Main tab state
  const [activeTab, setActiveTab] = useState('posts')
  
  // For pre-filling BlogAIDialog from topic ideas
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [prefillData, setPrefillData] = useState(null)
  
  const [blogs, setBlogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterFeatured, setFilterFeatured] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState(null)
  const [previewBlog, setPreviewBlog] = useState(null)

  // Access check - admins or org members with project context
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-[var(--text-secondary)]">Access denied. Please select a project first.</p>
        </div>
      </div>
    )
  }

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: getTenantConfig(null).defaultCategory,
    excerpt: '',
    content: '',
    featuredImage: '',
    featuredImageAlt: '',
    author: getTenantConfig(null).defaultAuthor,
    keywords: '',
    readingTime: 5,
    status: 'draft'
  })

  useEffect(() => {
    fetchBlogs()
  }, [currentProject?.id])

  const fetchBlogs = async () => {
    setIsLoading(true)
    try {
      console.log('[BlogManagement] Fetching blogs for project:', currentProject?.id || 'all')
      // Fetch posts filtered by project (or org if admin with no project selected)
      const params = { limit: 100 }
      if (currentProject?.id) {
        params.projectId = currentProject.id
      } else if (currentOrg?.id) {
        params.orgId = currentOrg.id
      }
      const res = await blogApi.listPosts(params)
      if (res.data.success || res.data.posts) {
        const posts = res.data.posts || res.data || []
        console.log('[BlogManagement] ✅ Fetched', posts.length, 'blogs')
        console.log('[BlogManagement] Status breakdown:', {
          published: posts.filter(p => p.status === 'published').length,
          draft: posts.filter(p => p.status === 'draft').length,
          other: posts.filter(p => p.status !== 'published' && p.status !== 'draft').length
        })
        setBlogs(posts)
      }
    } catch (err) {
      console.error('[BlogManagement] Error fetching blogs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort blogs
  const filteredBlogs = blogs
    .filter(blog => {
      if (filterStatus !== 'all' && blog.status !== filterStatus) return false
      if (filterCategory !== 'all' && blog.category !== filterCategory) return false
      if (filterFeatured === 'featured' && !blog.featured) return false
      if (filterFeatured === 'not-featured' && blog.featured) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return blog.title.toLowerCase().includes(query) || 
               blog.excerpt?.toLowerCase().includes(query)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'views') return (b.viewCount || 0) - (a.viewCount || 0)
      return 0
    })

  const stats = {
    total: blogs.length,
    published: blogs.filter(b => b.status === 'published').length,
    draft: blogs.filter(b => b.status === 'draft').length,
    featured: blogs.filter(b => b.featured).length,
    thisMonth: blogs.filter(b => {
      const date = new Date(b.created_at)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const handleTitleChange = (title) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }))
  }

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      category: tenantConfig.defaultCategory,
      excerpt: '',
      content: '',
      featuredImage: '',
      featuredImageAlt: '',
      featuredImageWidth: 1200,
      featuredImageHeight: 630,
      author: tenantConfig.defaultAuthor,
      keywords: '',
      metaTitle: '',
      metaDescription: '',
      faqItems: [],
      serviceCallouts: [],
      readingTime: 5,
      status: 'draft'
    })
    setEditingBlog(null)
  }

  const handleEdit = (blog) => {
    setFormData({
      title: blog.title,
      slug: blog.slug,
      category: blog.category,
      excerpt: blog.excerpt,
      content: blog.content,
      featuredImage: blog.featured_image,
      featuredImageAlt: blog.featured_image_alt,
      featuredImageWidth: blog.featured_image_width || 1200,
      featuredImageHeight: blog.featured_image_height || 630,
      author: blog.author,
      keywords: Array.isArray(blog.keywords) ? blog.keywords.join(', ') : blog.keywords || '',
      metaTitle: blog.meta_title || '',
      metaDescription: blog.meta_description || '',
      faqItems: blog.faq_items || [],
      serviceCallouts: blog.service_callouts || [],
      readingTime: blog.reading_time,
      status: blog.status
    })
    setEditingBlog(blog)
    setIsEditorOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!formData.title || !formData.content) {
        throw new Error('Please fill in title and content')
      }

      const keywords = typeof formData.keywords === 'string' 
        ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean)
        : formData.keywords

      // Filter out empty FAQ items
      const faqItems = (formData.faqItems || []).filter(faq => 
        faq.question?.trim() && faq.answer?.trim()
      )

      const blogPost = {
        ...formData,
        keywords,
        faqItems: faqItems.length > 0 ? faqItems : null,
        serviceCallouts: formData.serviceCallouts?.length > 0 ? formData.serviceCallouts : null,
        metaTitle: formData.metaTitle?.trim() || null,
        metaDescription: formData.metaDescription?.trim() || null,
        publishedAt: formData.status === 'published' ? new Date().toISOString() : null
      }

      if (editingBlog) {
        blogPost.id = editingBlog.id
      }

      const res = editingBlog 
        ? await blogApi.updatePost(editingBlog.id, blogPost)
        : await blogApi.createPost(blogPost)

      if (res.data.success || res.data.post) {
        setSuccess(editingBlog ? 'Blog updated!' : 'Blog created!')
        resetForm()
        setIsEditorOpen(false)
        fetchBlogs()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this blog post?')) return

    setIsLoading(true)
    try {
      await blogApi.deletePost(id)
      setSuccess('Blog deleted!')
      fetchBlogs()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async (id) => {
    setIsLoading(true)
    try {
      await blogApi.updatePost(id, { 
        status: 'published',
        publishedAt: new Date().toISOString()
      })
      setSuccess('Post published!')
      fetchBlogs()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleFeatured = async (id, featured) => {
    try {
      await blogApi.updatePost(id, { featured })
      setSuccess(featured ? 'Post featured!' : 'Post unfeatured!')
      // Update local state immediately for better UX
      setBlogs(prev => prev.map(blog => 
        blog.id === id ? { ...blog, featured } : blog
      ))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update featured status')
    }
  }

  const categories = tenantConfig.categories

  // Handler for creating from Blog Brain topic recommendations
  const handleCreateFromTopic = (topicData) => {
    setPrefillData(topicData)
    setAiDialogOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[var(--surface-primary)]">
        {/* Header */}
        <div className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)] sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                  Blog
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Create and manage your blog content</p>
              </div>
              <div className="flex items-center gap-3">
                <BlogAIDialog 
                  open={aiDialogOpen}
                  onOpenChange={setAiDialogOpen}
                  prefillData={prefillData}
                  onSuccess={(newPost) => {
                    setSuccess('AI blog created!')
                    setPrefillData(null)
                    fetchBlogs()
                    setActiveTab('posts')
                    setTimeout(() => setSuccess(''), 3000)
                  }}
                />
                <Button 
                  variant="glass-primary"
                  onClick={() => { resetForm(); setIsEditorOpen(true) }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </div>
            </div>
            
            {/* Main Tabs */}
            <div className="mt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-transparent border-b border-[var(--glass-border)] rounded-none w-full justify-start gap-1 p-0 h-auto">
                  <TabsTrigger 
                    value="posts" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-[var(--brand-primary)] data-[state=active]:bg-transparent rounded-none px-4 py-2"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Posts
                  </TabsTrigger>
                  {hasSignalAccess && (
                    <TabsTrigger 
                      value="signal-brain" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-[var(--brand-primary)] data-[state=active]:bg-transparent rounded-none px-4 py-2"
                    >
                      <SignalIcon className="w-4 h-4 mr-2" />
                      Signal Brain
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
        <div className="px-6 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            <StatsCard icon={FileText} label="Total Posts" value={stats.total} color="emerald" />
            <StatsCard icon={CheckCircle2} label="Published" value={stats.published} color="blue" />
            <StatsCard icon={Edit2} label="Drafts" value={stats.draft} color="amber" />
            <StatsCard icon={Star} label="Featured" value={stats.featured} color="amber" />
            <StatsCard icon={Calendar} label="This Month" value={stats.thisMonth} color="purple" />
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
              <Button size="sm" variant="ghost" onClick={() => setError('')} className="ml-auto">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {/* Filters */}
          <div className="bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)] p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <Filter className="w-4 h-4 mr-2 text-[var(--text-tertiary)]" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <Tag className="w-4 h-4 mr-2 text-[var(--text-tertiary)]" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterFeatured} onValueChange={setFilterFeatured}>
                <SelectTrigger className="w-36">
                  <Star className="w-4 h-4 mr-2 text-[var(--text-tertiary)]" />
                  <SelectValue placeholder="Featured" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Posts</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="not-featured">Not Featured</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 bg-[var(--surface-secondary)]">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-[var(--text-tertiary)]" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="views">Most Views</SelectItem>
                  <SelectItem value="title">By Title</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-sm text-[var(--text-secondary)] ml-auto">
                {filteredBlogs.length} post{filteredBlogs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Blog Grid */}
          {isLoading && !blogs.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <p className="text-[var(--text-secondary)] mt-4">Loading posts...</p>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)] p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">No blog posts yet</h3>
              <p className="text-[var(--text-secondary)] mt-1 mb-6">Create your first post to get started</p>
              <div className="flex items-center justify-center gap-3">
                <BlogAIDialog 
                  onSuccess={(newPost) => {
                    setSuccess('AI blog created!')
                    fetchBlogs()
                  }}
                />
                <Button onClick={() => { resetForm(); setIsEditorOpen(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBlogs.map(blog => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPreview={setPreviewBlog}
                  onToggleFeatured={handleToggleFeatured}
                  onPublish={handlePublish}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </div>
        )}

        {/* Signal Brain Tab */}
        {activeTab === 'signal-brain' && hasSignalAccess && (
          <div className="px-6 py-6">
            <BlogBrain 
              projectId={currentProject?.id}
              onCreateFromTopic={handleCreateFromTopic}
            />
          </div>
        )}

        {/* Editor Dialog */}
        <Dialog open={isEditorOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsEditorOpen(open) }}>
          <DialogContent className="!max-w-5xl !w-[80vw] max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--border-primary)] sticky top-0 bg-[var(--bg-primary)] z-10">
              <DialogTitle className="text-xl text-[var(--text-primary)]">
                {editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
              </DialogTitle>
              <DialogDescription className="text-[var(--text-secondary)]">
                Fill in the details below to {editingBlog ? 'update' : 'create'} your blog post
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Featured Image</Label>
                <ImageUploader
                  value={formData.featuredImage}
                  onChange={(url) => setFormData(prev => ({ ...prev, featuredImage: url }))}
                  onRemove={() => setFormData(prev => ({ ...prev, featuredImage: '' }))}
                />
              </div>

              {/* Title & Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter blog title"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="auto-generated-from-title"
                    className="h-11 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reading Time (min)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.readingTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, readingTime: parseInt(e.target.value) || 5 }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt *</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="A brief summary of the blog post (150-160 characters ideal)"
                  className="h-24 resize-none"
                  required
                />
                <p className="text-xs text-[var(--text-tertiary)]">{formData.excerpt.length}/160 characters</p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <MarkdownEditor
                  value={formData.content}
                  onChange={(markdown) => setFormData(prev => ({ ...prev, content: markdown }))}
                  placeholder="Start writing your blog content..."
                  minHeight="280px"
                />
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (SEO)</Label>
                <Input
                  id="keywords"
                  value={formData.keywords}
                  onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="keyword1, keyword2, keyword3"
                  className="h-11"
                />
              </div>

              {/* SEO Override Section */}
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  SEO Overrides (Optional)
                </h3>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Leave blank to auto-generate from title and excerpt
                </p>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="metaTitle">Meta Title (50-60 chars)</Label>
                    <Input
                      id="metaTitle"
                      value={formData.metaTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                      placeholder="Custom SEO title for search results"
                      className="h-11"
                      maxLength={70}
                    />
                    <p className="text-xs text-[var(--text-tertiary)]">{formData.metaTitle?.length || 0}/60 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaDescription">Meta Description (150-160 chars)</Label>
                    <Textarea
                      id="metaDescription"
                      value={formData.metaDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                      placeholder="Custom SEO description for search results"
                      className="h-20 resize-none"
                      maxLength={170}
                    />
                    <p className="text-xs text-[var(--text-tertiary)]">{formData.metaDescription?.length || 0}/160 characters</p>
                  </div>
                </div>

                {/* Image Dimensions for CLS */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="featuredImageWidth">Image Width (px)</Label>
                    <Input
                      id="featuredImageWidth"
                      type="number"
                      value={formData.featuredImageWidth}
                      onChange={(e) => setFormData(prev => ({ ...prev, featuredImageWidth: parseInt(e.target.value) || 1200 }))}
                      placeholder="1200"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="featuredImageHeight">Image Height (px)</Label>
                    <Input
                      id="featuredImageHeight"
                      type="number"
                      value={formData.featuredImageHeight}
                      onChange={(e) => setFormData(prev => ({ ...prev, featuredImageHeight: parseInt(e.target.value) || 630 }))}
                      placeholder="630"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      FAQ Items (Rich Snippets)
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Add Q&A pairs for Google's FAQ rich snippets
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      faqItems: [...(prev.faqItems || []), { question: '', answer: '' }]
                    }))}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add FAQ
                  </Button>
                </div>
                
                {formData.faqItems?.map((faq, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3 bg-[var(--surface-secondary)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--text-tertiary)]">FAQ #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          faqItems: prev.faqItems.filter((_, i) => i !== index)
                        }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      value={faq.question}
                      onChange={(e) => {
                        const updated = [...formData.faqItems]
                        updated[index].question = e.target.value
                        setFormData(prev => ({ ...prev, faqItems: updated }))
                      }}
                      placeholder="Question"
                      className="h-10"
                    />
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => {
                        const updated = [...formData.faqItems]
                        updated[index].answer = e.target.value
                        setFormData(prev => ({ ...prev, faqItems: updated }))
                      }}
                      placeholder="Answer"
                      className="h-20 resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { resetForm(); setIsEditorOpen(false) }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingBlog ? 'Update Post' : 'Create Post'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewBlog} onOpenChange={() => setPreviewBlog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewBlog?.title}</DialogTitle>
              <DialogDescription>Preview of your blog post</DialogDescription>
            </DialogHeader>
            {previewBlog && (
              <div className="prose prose-sm max-w-none">
                {previewBlog.featured_image && (
                  <img 
                    src={previewBlog.featured_image} 
                    alt={previewBlog.featured_image_alt} 
                    className="rounded-lg w-full object-cover aspect-video"
                  />
                )}
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-4">
                  <Badge>{previewBlog.category}</Badge>
                  <span>•</span>
                  <span>{previewBlog.reading_time} min read</span>
                </div>
                <p className="text-[var(--text-secondary)] italic mt-2">{previewBlog.excerpt}</p>
                <Separator className="my-4" />
                <div className="whitespace-pre-wrap">{previewBlog.content}</div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
