// src/components/seo/SEOManagedFAQs.jsx
// Managed FAQs - Create and manage FAQ sections per page with JSON-LD schema

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Globe,
  Code,
  Eye,
  EyeOff,
  Check,
  X,
  MoreVertical,
  Search,
  FileQuestion,
  Sparkles,
  RefreshCw,
  Copy,
  ExternalLink,
  FileCode,
} from 'lucide-react'
import { portalApi } from '@/lib/portal-api'

export default function SEOManagedFAQs({ projectId }) {
  const [faqSections, setFaqSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [expandedSections, setExpandedSections] = useState(new Set())

  // Fetch all FAQ sections
  const fetchFAQs = useCallback(async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const data = await portalApi.get(`/seo/managed/faqs/project/${projectId}`)
      setFaqSections(data || [])
    } catch (err) {
      console.error('Failed to fetch FAQs:', err)
      toast.error('Failed to load FAQs')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchFAQs()
  }, [fetchFAQs])

  // Filter sections by search
  const filteredSections = faqSections.filter(section => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      section.path?.toLowerCase().includes(searchLower) ||
      section.title?.toLowerCase().includes(searchLower) ||
      section.items?.some(item => 
        item.question?.toLowerCase().includes(searchLower) ||
        item.answer?.toLowerCase().includes(searchLower)
      )
    )
  })

  // Toggle section expansion
  const toggleSection = (id) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Stats
  const stats = {
    total: faqSections.length,
    published: faqSections.filter(s => s.is_published).length,
    totalItems: faqSections.reduce((sum, s) => sum + (s.items?.length || 0), 0),
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Managed FAQs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create FAQ sections per page with automatic JSON-LD schema for SEO
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New FAQ Section
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">FAQ Sections</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{stats.published}</p>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{stats.totalItems}</p>
            <p className="text-xs text-muted-foreground">Total Q&As</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search FAQs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* FAQ Sections List */}
      {filteredSections.length === 0 ? (
        <EmptyState onCreateNew={() => setShowCreateModal(true)} />
      ) : (
        <div className="space-y-4">
          {filteredSections.map(section => (
            <FAQSectionCard
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              onEdit={() => setEditingSection(section)}
              onRefresh={fetchFAQs}
              projectId={projectId}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateFAQModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        projectId={projectId}
        onCreated={fetchFAQs}
      />

      {/* Edit Modal */}
      {editingSection && (
        <EditFAQModal
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
          section={editingSection}
          onUpdated={fetchFAQs}
        />
      )}
    </div>
  )
}

// Empty state component
function EmptyState({ onCreateNew }) {
  return (
    <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
      <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No FAQ Sections Yet</h3>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
        Create FAQ sections for your pages to improve SEO with structured data 
        and help users find answers quickly.
      </p>
      <Button onClick={onCreateNew}>
        <Plus className="h-4 w-4 mr-2" />
        Create First FAQ Section
      </Button>
    </div>
  )
}

// FAQ Section Card
function FAQSectionCard({ section, isExpanded, onToggle, onEdit, onRefresh, projectId }) {
  const [updating, setUpdating] = useState(false)

  const handleTogglePublish = async () => {
    try {
      setUpdating(true)
      await portalApi.put(`/seo/managed/faqs/${section.id}`, {
        is_published: !section.is_published,
      })
      toast.success(section.is_published ? 'FAQ unpublished' : 'FAQ published')
      onRefresh()
    } catch (err) {
      toast.error('Failed to update FAQ')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this FAQ section? This cannot be undone.')) return
    try {
      await portalApi.delete(`/seo/managed/faqs/${section.id}`)
      toast.success('FAQ section deleted')
      onRefresh()
    } catch (err) {
      toast.error('Failed to delete FAQ')
    }
  }

  const copySchema = () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: section.items
        ?.filter(item => item.is_visible)
        .map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
    }
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
    toast.success('Schema copied to clipboard')
  }

  return (
    <Card className={cn(
      'transition-colors',
      section.is_published ? 'border-green-500/30' : 'border-muted'
    )}>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              section.is_published 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-muted'
            )}>
              <HelpCircle className={cn(
                'h-5 w-5',
                section.is_published ? 'text-green-600' : 'text-muted-foreground'
              )} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {section.path}
                {section.is_published && (
                  <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Published
                  </Badge>
                )}
                {section.include_schema && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <Code className="h-3 w-3 mr-1" />
                    Schema
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {section.title || 'Untitled'} • {section.items?.length || 0} questions
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={copySchema}>
                    <FileCode className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy JSON-LD Schema</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTogglePublish} disabled={updating}>
                  {section.is_published ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Publish
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="border-t pt-4">
              {section.items?.length > 0 ? (
                <div className="space-y-3">
                  {section.items.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        'p-3 rounded-lg border',
                        item.is_visible ? 'bg-background' : 'bg-muted/30 opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground mt-1">Q{index + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.question}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {item.answer}
                          </p>
                        </div>
                        {!item.is_visible && (
                          <Badge variant="outline" className="text-xs">Hidden</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No questions added yet. Click edit to add Q&As.
                </p>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// Create FAQ Modal
function CreateFAQModal({ open, onOpenChange, projectId, onCreated }) {
  const [path, setPath] = useState('')
  const [title, setTitle] = useState('')
  const [includeSchema, setIncludeSchema] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!path) {
      toast.error('Path is required')
      return
    }

    try {
      setSaving(true)
      await portalApi.post('/seo/managed/faqs', {
        project_id: projectId,
        path: path.startsWith('/') ? path : `/${path}`,
        title: title || undefined,
        include_schema: includeSchema,
        is_published: false,
      })
      toast.success('FAQ section created')
      onOpenChange(false)
      setPath('')
      setTitle('')
      onCreated()
    } catch (err) {
      toast.error('Failed to create FAQ section')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create FAQ Section</DialogTitle>
          <DialogDescription>
            Create a new FAQ section for a specific page path
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="path">Page Path *</Label>
            <Input
              id="path"
              placeholder="/services/plumbing"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The page path where this FAQ section will appear
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Section Title</Label>
            <Input
              id="title"
              placeholder="Frequently Asked Questions"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="schema">Include JSON-LD Schema</Label>
              <p className="text-xs text-muted-foreground">
                Adds FAQPage schema for SEO
              </p>
            </div>
            <Switch
              id="schema"
              checked={includeSchema}
              onCheckedChange={setIncludeSchema}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create Section'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Edit FAQ Modal with inline Q&A editing
function EditFAQModal({ open, onOpenChange, section, onUpdated }) {
  const [title, setTitle] = useState(section.title || '')
  const [description, setDescription] = useState(section.description || '')
  const [includeSchema, setIncludeSchema] = useState(section.include_schema)
  const [items, setItems] = useState(section.items || [])
  const [saving, setSaving] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')

  const handleSave = async () => {
    try {
      setSaving(true)
      await portalApi.put(`/seo/managed/faqs/${section.id}`, {
        title,
        description: description || undefined,
        items,
        include_schema: includeSchema,
      })
      toast.success('FAQ section updated')
      onOpenChange(false)
      onUpdated()
    } catch (err) {
      toast.error('Failed to update FAQ section')
    } finally {
      setSaving(false)
    }
  }

  const addItem = () => {
    if (!newQuestion || !newAnswer) {
      toast.error('Both question and answer are required')
      return
    }
    const newItem = {
      id: crypto.randomUUID(),
      question: newQuestion,
      answer: newAnswer,
      order: items.length,
      is_visible: true,
    }
    setItems([...items, newItem])
    setNewQuestion('')
    setNewAnswer('')
  }

  const updateItem = (id, updates) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const toggleVisibility = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, is_visible: !item.is_visible } : item
    ))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit FAQ Section</DialogTitle>
          <DialogDescription>
            {section.path}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Section Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Frequently Asked Questions"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional subtitle"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Include JSON-LD Schema</Label>
                <p className="text-xs text-muted-foreground">
                  Adds FAQPage structured data for search engines
                </p>
              </div>
              <Switch
                checked={includeSchema}
                onCheckedChange={setIncludeSchema}
              />
            </div>

            {/* Q&A Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Questions & Answers</Label>
                <Badge variant="outline">{items.length} items</Badge>
              </div>

              {/* Existing Items */}
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 rounded-lg border space-y-3',
                      !item.is_visible && 'opacity-60'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Q{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleVisibility(item.id)}
                        >
                          {item.is_visible ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={item.question}
                      onChange={(e) => updateItem(item.id, { question: e.target.value })}
                      placeholder="Question"
                    />
                    <Textarea
                      value={item.answer}
                      onChange={(e) => updateItem(item.id, { answer: e.target.value })}
                      placeholder="Answer"
                      rows={3}
                    />
                  </div>
                ))}
              </div>

              {/* Add New Item */}
              <div className="p-4 rounded-lg border border-dashed space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Add New Question</p>
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="What is your question?"
                />
                <Textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Your answer..."
                  rows={3}
                />
                <Button onClick={addItem} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
