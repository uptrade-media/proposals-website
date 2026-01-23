/**
 * SiteFAQsPanel - Manage FAQ sections
 */
import { HelpCircle, Plus, MoreVertical, ChevronDown, ChevronRight, Trash2, Edit, GripVertical, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useSiteManagementStore } from '@/lib/site-management-store'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function SiteFAQsPanel({ project, faqs = [] }) {
  const [expandedFaqs, setExpandedFaqs] = useState(new Set())
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState(null)
  const [isDeleting, setIsDeleting] = useState(null)
  const store = useSiteManagementStore()
  
  const toggleFaq = (id) => {
    const next = new Set(expandedFaqs)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedFaqs(next)
  }
  
  const handleDelete = async (faqId) => {
    setIsDeleting(faqId)
    try {
      await store.deleteFaq(faqId)
      toast.success('FAQ section deleted')
    } catch (error) {
      toast.error('Failed to delete FAQ')
    } finally {
      setIsDeleting(null)
    }
  }
  
  if (faqs.length === 0) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No FAQ Sections</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create FAQ sections for your pages with automatic schema generation.
        </p>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create FAQ Section
        </Button>
        
        <CreateFAQDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={async (data) => {
            await store.createFaq(data)
            toast.success('FAQ section created')
            setIsCreateOpen(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{faqs.length} sections</Badge>
          <Badge variant="outline">
            {faqs.reduce((sum, f) => sum + (f.items?.length || 0), 0)} questions
          </Badge>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>
      
      {/* FAQ Sections */}
      <div className="space-y-3">
        {faqs.map((faq) => (
          <Collapsible
            key={faq.id}
            open={expandedFaqs.has(faq.id)}
            onOpenChange={() => toggleFaq(faq.id)}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50">
                  {expandedFaqs.has(faq.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{faq.title || faq.path}</p>
                    <p className="text-sm text-muted-foreground font-mono">{faq.path}</p>
                  </div>
                  <Badge variant={faq.is_published ? "default" : "secondary"}>
                    {faq.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  <Badge variant="outline">{faq.items?.length || 0} Q&As</Badge>
                  {faq.include_schema && (
                    <Badge variant="outline" className="text-green-600">
                      Schema
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingFaq(faq)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Section
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(faq.id)}
                        disabled={isDeleting === faq.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border-t px-4 py-2 space-y-2 bg-muted/30">
                  {faq.items?.map((item, index) => (
                    <div key={item.id || index} className="flex items-start gap-3 py-2">
                      <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.question}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.answer}</p>
                      </div>
                    </div>
                  ))}
                  {(!faq.items || faq.items.length === 0) && (
                    <p className="text-sm text-muted-foreground py-2">No questions added yet.</p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
      
      {/* Create Dialog */}
      <CreateFAQDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (data) => {
          await store.createFaq(data)
          toast.success('FAQ section created')
          setIsCreateOpen(false)
        }}
      />
      
      {/* Edit Dialog */}
      <EditFAQDialog
        faq={editingFaq}
        open={!!editingFaq}
        onOpenChange={(open) => !open && setEditingFaq(null)}
        onSubmit={async (data) => {
          await store.updateFaq(editingFaq.id, data)
          toast.success('FAQ updated')
          setEditingFaq(null)
        }}
        onDelete={async () => {
          await handleDelete(editingFaq.id)
          setEditingFaq(null)
        }}
      />
    </div>
  )
}

function CreateFAQDialog({ open, onOpenChange, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    path: '',
    include_schema: true,
    is_published: false,
    items: [{ question: '', answer: '' }],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const addQuestion = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { question: '', answer: '' }],
    })
  }
  
  const removeQuestion = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }
  
  const updateQuestion = (index, field, value) => {
    const items = [...formData.items]
    items[index] = { ...items[index], [field]: value }
    setFormData({ ...formData, items })
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.path || formData.items.every(i => !i.question)) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData({
        title: '',
        path: '',
        include_schema: true,
        is_published: false,
        items: [{ question: '', answer: '' }],
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create FAQ Section</DialogTitle>
          <DialogDescription>
            Add a new FAQ section with questions and answers.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Section Title</Label>
              <Input
                id="title"
                placeholder="Frequently Asked Questions"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="path">Page Path</Label>
              <Input
                id="path"
                placeholder="/about"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="include_schema"
                checked={formData.include_schema}
                onCheckedChange={(checked) => setFormData({ ...formData, include_schema: checked })}
              />
              <Label htmlFor="include_schema">Include FAQ Schema</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="is_published">Published</Label>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label>Questions & Answers</Label>
            {formData.items.map((item, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Q{index + 1}</span>
                  <div className="flex-1" />
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeQuestion(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Question"
                  value={item.question}
                  onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                />
                <Textarea
                  placeholder="Answer"
                  value={item.answer}
                  onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                  rows={2}
                />
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addQuestion}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.path}>
              {isSubmitting ? 'Creating...' : 'Create FAQ Section'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditFAQDialog({ faq, open, onOpenChange, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({
    title: '',
    path: '',
    include_schema: true,
    is_published: false,
    items: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    if (faq) {
      setFormData({
        title: faq.title || '',
        path: faq.path || '',
        include_schema: faq.include_schema ?? true,
        is_published: faq.is_published ?? false,
        items: faq.items?.length ? faq.items : [{ question: '', answer: '' }],
      })
    }
  }, [faq])
  
  const addQuestion = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { question: '', answer: '' }],
    })
  }
  
  const removeQuestion = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }
  
  const updateQuestion = (index, field, value) => {
    const items = [...formData.items]
    items[index] = { ...items[index], [field]: value }
    setFormData({ ...formData, items })
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit FAQ Section</DialogTitle>
          <DialogDescription>
            Update the FAQ section and its questions.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_title">Section Title</Label>
              <Input
                id="edit_title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_path">Page Path</Label>
              <Input
                id="edit_path"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="edit_include_schema"
                checked={formData.include_schema}
                onCheckedChange={(checked) => setFormData({ ...formData, include_schema: checked })}
              />
              <Label htmlFor="edit_include_schema">Include FAQ Schema</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="edit_is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="edit_is_published">Published</Label>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label>Questions & Answers</Label>
            {formData.items.map((item, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Q{index + 1}</span>
                  <div className="flex-1" />
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeQuestion(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Question"
                  value={item.question}
                  onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                />
                <Textarea
                  placeholder="Answer"
                  value={item.answer}
                  onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                  rows={2}
                />
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addQuestion}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Section
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
