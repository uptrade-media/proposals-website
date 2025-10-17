// src/components/BlogManagement.jsx
import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'
import { AlertCircle, Loader2, Plus, Trash2, Edit2 } from 'lucide-react'
import useAuthStore from '../lib/auth-store'

export default function BlogManagement() {
  const { user } = useAuthStore()
  const [blogs, setBlogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'news',
    excerpt: '',
    content: '',
    featuredImage: '',
    featuredImageAlt: '',
    author: 'Uptrade Media',
    keywords: '',
    readingTime: 5,
    status: 'draft'
  })

  // Fetch blog posts
  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/.netlify/functions/blog-list?status=draft&limit=100', {
        credentials: 'include'
      })
      const data = await res.json()
      if (data.success) {
        setBlogs(data.posts)
      }
    } catch (err) {
      console.error('Error fetching blogs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const handleTitleChange = (e) => {
    const title = e.target.value
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      // Use Cloudinary's upload widget or convert to base64
      const reader = new FileReader()
      reader.onload = (event) => {
        // For now, store base64 or use a public URL
        // In production, integrate with Cloudinary Upload Widget
        const imageUrl = event.target?.result
        setFormData(prev => ({
          ...prev,
          featuredImage: imageUrl,
          featuredImageAlt: formData.title || 'Blog image'
        }))
        setSuccess('Image loaded successfully')
        setTimeout(() => setSuccess(''), 3000)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError('Failed to process image')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      if (!formData.title || !formData.slug || !formData.content) {
        throw new Error('Please fill in title, slug, and content')
      }

      if (!formData.featuredImage) {
        throw new Error('Please upload a featured image')
      }

      const keywords = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)

      const blogPost = {
        ...formData,
        keywords,
        publishedAt: formData.status === 'published' ? new Date().toISOString() : null
      }

      const method = editingId ? 'PUT' : 'POST'
      const endpoint = editingId 
        ? '/.netlify/functions/blog-update'
        : '/.netlify/functions/blog-create'

      if (editingId) {
        blogPost.id = editingId
      }

      const res = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blogPost)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save blog post')
      }

      setSuccess(editingId ? 'Blog updated successfully!' : 'Blog created successfully!')
      
      // Reset form
      setFormData({
        title: '',
        slug: '',
        category: 'news',
        excerpt: '',
        content: '',
        featuredImage: '',
        featuredImageAlt: '',
        author: 'Uptrade Media',
        keywords: '',
        readingTime: 5,
        status: 'draft'
      })
      setShowForm(false)
      setEditingId(null)
      fetchBlogs()
    } catch (err) {
      setError(err.message || 'Failed to save blog post')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return

    setIsLoading(true)
    try {
      const res = await fetch('/.netlify/functions/blog-delete', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (!res.ok) {
        throw new Error('Failed to delete blog post')
      }

      setSuccess('Blog deleted successfully!')
      fetchBlogs()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
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
      author: blog.author,
      keywords: blog.keywords ? JSON.parse(blog.keywords).join(', ') : '',
      readingTime: blog.reading_time,
      status: blog.status
    })
    setEditingId(blog.id)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog Management</h2>
          <p className="text-gray-600 mt-1">Create and manage blog posts for your portal</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({
              title: '',
              slug: '',
              category: 'news',
              excerpt: '',
              content: '',
              featuredImage: '',
              featuredImageAlt: '',
              author: 'Uptrade Media',
              keywords: '',
              readingTime: 5,
              status: 'draft'
            })
          }}
          className="bg-gradient-to-r from-green-500 to-teal-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Blog Post
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900">{success}</p>
        </div>
      )}

      {showForm && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Blog Post' : 'Create New Blog Post'}</CardTitle>
            <CardDescription>Fill in the details below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Featured Image */}
              <div>
                <Label>Featured Image</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-input"
                  />
                  <label htmlFor="image-input" className="cursor-pointer">
                    {formData.featuredImage ? (
                      <div>
                        <img src={formData.featuredImage} alt="Preview" className="w-32 h-32 object-cover rounded mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to change image</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg text-gray-600">📸 Upload image</p>
                        <p className="text-sm text-gray-500">Click to select or drag and drop</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="Blog post title"
                  required
                  className="mt-2"
                />
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-generated"
                  className="mt-2 text-gray-600"
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="news">News</option>
                  <option value="design">Design</option>
                  <option value="marketing">Marketing</option>
                  <option value="media">Media</option>
                </select>
              </div>

              {/* Excerpt */}
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Short summary of the blog post"
                  className="mt-2 h-20"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <Label htmlFor="content">Content (Markdown)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Blog post content in Markdown format"
                  className="mt-2 h-48 font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">Use **bold** for bold, # for headings, etc.</p>
              </div>

              {/* Keywords */}
              <div>
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  value={formData.keywords}
                  onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="Comma-separated keywords"
                  className="mt-2"
                />
              </div>

              {/* Reading Time */}
              <div>
                <Label htmlFor="reading-time">Reading Time (minutes)</Label>
                <Input
                  id="reading-time"
                  type="number"
                  min="1"
                  value={formData.readingTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, readingTime: parseInt(e.target.value) }))}
                  className="mt-2"
                />
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-500 to-teal-500 flex-1"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Update Blog' : 'Create Blog'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Blog List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Draft Blog Posts</h3>
        {isLoading && !blogs.length ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No blog posts yet. Create your first blog post!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {blogs.map(blog => (
              <Card key={blog.id} className="hover:shadow-md transition">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{blog.title}</h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{blog.excerpt}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          blog.status === 'published' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {blog.status}
                        </span>
                        <span className="text-xs text-gray-500">{blog.category}</span>
                        <span className="text-xs text-gray-500">{blog.reading_time} min read</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(blog)}
                        disabled={isLoading}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(blog.id)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
