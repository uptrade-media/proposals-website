// src/components/engage/visual-editor/InlineContentEditor.jsx
// WYSIWYG inline editing for element content

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Bold,
  Italic,
  Underline,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  X,
  Check,
  Sparkles,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import api from '@/lib/api'

export default function InlineContentEditor({ element, onChange, onClose }) {
  const [headline, setHeadline] = useState(element.headline || '')
  const [body, setBody] = useState(element.body || '')
  const [ctaText, setCtaText] = useState(element.cta_text || '')
  const [generating, setGenerating] = useState(false)
  const [generationPrompt, setGenerationPrompt] = useState('')
  const [activeTab, setActiveTab] = useState('edit')
  
  const headlineRef = useRef(null)
  
  useEffect(() => {
    headlineRef.current?.focus()
  }, [])
  
  const handleSave = () => {
    onChange({
      headline,
      body,
      cta_text: ctaText
    })
    onClose()
  }
  
  const handleGenerateWithAI = async () => {
    if (!generationPrompt.trim()) {
      toast.error('Please describe what you want to create')
      return
    }
    
    try {
      setGenerating(true)
      
      // Call Echo to generate content
      const { data } = await api.post('/.netlify/functions/echo-chat', {
        message: `Generate copy for an engage ${element.element_type}. 
                  User request: "${generationPrompt}"
                  
                  Respond with JSON containing:
                  - headline (max 60 chars, compelling and action-oriented)
                  - body (max 150 chars, supporting the headline)
                  - cta_text (max 25 chars, clear call to action)`,
        context: { mode: 'copywriter' }
      })
      
      // Parse the response - Echo should return structured content
      try {
        const jsonMatch = data.message.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const generated = JSON.parse(jsonMatch[0])
          setHeadline(generated.headline || headline)
          setBody(generated.body || body)
          setCtaText(generated.cta_text || ctaText)
          toast.success('Content generated!')
          setActiveTab('edit')
        }
      } catch (parseError) {
        // If not JSON, use the message directly for headline
        setHeadline(data.message.slice(0, 60))
        toast.info('Generated headline - add body and CTA manually')
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }
  
  const characterCount = (text, max) => {
    const count = text?.length || 0
    const isOver = count > max
    return (
      <span className={isOver ? 'text-red-500' : 'text-muted-foreground'}>
        {count}/{max}
      </span>
    )
  }
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
          <DialogDescription>
            Update your element's text and call-to-action
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="edit">
              <Type className="h-4 w-4 mr-2" />
              Manual Edit
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Generate
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Headline</Label>
                {characterCount(headline, 60)}
              </div>
              <Input
                ref={headlineRef}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Your compelling headline..."
                className="text-lg font-semibold"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Body Text</Label>
                {characterCount(body, 200)}
              </div>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Supporting message..."
                rows={3}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Call to Action Button</Label>
                {characterCount(ctaText, 25)}
              </div>
              <Input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="Button text..."
              />
            </div>
            
            {/* Live Preview */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="text-center">
                <h3 className="font-bold text-lg mb-1">{headline || 'Your Headline'}</h3>
                <p className="text-sm text-muted-foreground mb-3">{body || 'Your message here'}</p>
                <div className="inline-block bg-[var(--brand-primary)] text-white px-4 py-2 rounded-md text-sm font-medium">
                  {ctaText || 'Click Here'}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="ai" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>What do you want to say?</Label>
              <Textarea
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                placeholder="E.g., 'Holiday sale with 20% off all products' or 'Encourage visitors to book a free consultation'"
                rows={3}
              />
            </div>
            
            <Button 
              onClick={handleGenerateWithAI} 
              disabled={generating || !generationPrompt.trim()}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Copy
                </>
              )}
            </Button>
            
            {/* Quick Templates */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Quick prompts:</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Holiday discount offer',
                  'Newsletter signup incentive',
                  'Limited time sale',
                  'Free consultation CTA',
                  'Exit intent discount'
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    onClick={() => setGenerationPrompt(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Show current values if any were generated */}
            {headline && (
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <p className="text-xs text-green-600 mb-2">Generated content:</p>
                <div className="space-y-2 text-sm">
                  <p><strong>Headline:</strong> {headline}</p>
                  <p><strong>Body:</strong> {body}</p>
                  <p><strong>CTA:</strong> {ctaText}</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            Apply Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
