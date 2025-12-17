// src/components/seo/SEOContentBriefs.jsx
// AI Content Briefs - generate comprehensive content briefs
import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, 
  RefreshCw, 
  Sparkles,
  Target,
  List,
  Link2,
  Hash,
  Clock,
  Copy,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function SEOContentBriefs({ siteId }) {
  const { 
    contentBriefs, 
    currentBrief,
    briefsLoading, 
    fetchContentBriefs,
    generateContentBrief
  } = useSeoStore()
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [targetKeyword, setTargetKeyword] = useState('')
  const [contentType, setContentType] = useState('blog')
  const [additionalContext, setAdditionalContext] = useState('')
  const [expandedBrief, setExpandedBrief] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    if (siteId) {
      fetchContentBriefs(siteId)
    }
  }, [siteId])

  const handleGenerate = async () => {
    if (!targetKeyword.trim()) return
    setIsGenerating(true)
    try {
      await generateContentBrief(siteId, targetKeyword.trim(), contentType, additionalContext)
      setTargetKeyword('')
      setAdditionalContext('')
    } catch (error) {
      console.error('Generate brief error:', error)
    }
    setIsGenerating(false)
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatBriefAsText = (brief) => {
    let text = `# Content Brief: ${brief.target_keyword}\n\n`
    text += `## Overview\n`
    text += `Target Keyword: ${brief.target_keyword}\n`
    text += `Content Type: ${brief.content_type}\n`
    text += `Target Word Count: ${brief.word_count_target}\n\n`
    
    if (brief.suggested_title) {
      text += `## Suggested Title\n${brief.suggested_title}\n\n`
    }
    
    if (brief.meta_description) {
      text += `## Meta Description\n${brief.meta_description}\n\n`
    }
    
    if (brief.outline?.length > 0) {
      text += `## Content Outline\n`
      brief.outline.forEach((section, i) => {
        text += `${i + 1}. ${section.heading}\n`
        if (section.points?.length > 0) {
          section.points.forEach(point => {
            text += `   - ${point}\n`
          })
        }
      })
      text += '\n'
    }
    
    if (brief.lsi_keywords?.length > 0) {
      text += `## LSI Keywords\n${brief.lsi_keywords.join(', ')}\n\n`
    }
    
    if (brief.internal_links?.length > 0) {
      text += `## Internal Link Suggestions\n`
      brief.internal_links.forEach(link => {
        text += `- ${link.anchor || link.url} → ${link.url}\n`
      })
      text += '\n'
    }
    
    return text
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Briefs</h2>
          <p className="text-muted-foreground">
            AI-generated comprehensive content briefs
          </p>
        </div>
      </div>

      {/* Generate New Brief */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Generate New Brief
          </CardTitle>
          <CardDescription>
            Create a comprehensive content brief for any keyword
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Target Keyword</label>
              <Input
                placeholder="Enter target keyword or topic..."
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Content Type</label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="service">Service Page</SelectItem>
                  <SelectItem value="location">Location Page</SelectItem>
                  <SelectItem value="pillar">Pillar Content</SelectItem>
                  <SelectItem value="comparison">Comparison Article</SelectItem>
                  <SelectItem value="how-to">How-To Guide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Additional Context (optional)</label>
            <Textarea
              placeholder="Any specific requirements, audience details, or focus areas..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={2}
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={!targetKeyword.trim() || isGenerating}
            className="w-full md:w-auto"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating Brief...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Brief
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current/Latest Brief */}
      {currentBrief && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  {currentBrief.target_keyword}
                </CardTitle>
                <CardDescription>
                  {currentBrief.content_type} • {currentBrief.word_count_target} words target
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(formatBriefAsText(currentBrief), 'current')}
              >
                {copiedId === 'current' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title & Meta */}
            {currentBrief.suggested_title && (
              <div>
                <h4 className="font-medium mb-2">Suggested Title</h4>
                <p className="p-3 bg-white rounded-lg border">{currentBrief.suggested_title}</p>
              </div>
            )}

            {currentBrief.meta_description && (
              <div>
                <h4 className="font-medium mb-2">Meta Description</h4>
                <p className="p-3 bg-white rounded-lg border text-sm">
                  {currentBrief.meta_description}
                  <span className="text-muted-foreground ml-2">
                    ({currentBrief.meta_description.length} chars)
                  </span>
                </p>
              </div>
            )}

            {/* Outline */}
            {currentBrief.outline?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Content Outline
                </h4>
                <div className="bg-white rounded-lg border p-4 space-y-3">
                  {currentBrief.outline.map((section, i) => (
                    <div key={i}>
                      <p className="font-medium">{i + 1}. {section.heading}</p>
                      {section.points?.length > 0 && (
                        <ul className="ml-4 mt-1 space-y-1">
                          {section.points.map((point, j) => (
                            <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span>•</span> {point}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LSI Keywords */}
            {currentBrief.lsi_keywords?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  LSI Keywords to Include
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentBrief.lsi_keywords.map((kw, i) => (
                    <Badge key={i} variant="outline" className="bg-white">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Links */}
            {currentBrief.internal_links?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Suggested Internal Links
                </h4>
                <div className="bg-white rounded-lg border divide-y">
                  {currentBrief.internal_links.map((link, i) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <span className="text-sm font-medium">{link.anchor || 'Link'}</span>
                      <span className="text-sm text-muted-foreground truncate max-w-xs">
                        {link.url}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schema Suggestion */}
            {currentBrief.schema_type && (
              <div>
                <h4 className="font-medium mb-2">Recommended Schema</h4>
                <Badge>{currentBrief.schema_type}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Previous Briefs */}
      {contentBriefs?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Briefs</CardTitle>
            <CardDescription>
              {contentBriefs.length} briefs generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contentBriefs.map((brief, i) => (
                <div 
                  key={brief.id || i}
                  className="border rounded-lg"
                >
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedBrief(expandedBrief === brief.id ? null : brief.id)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{brief.target_keyword}</p>
                        <p className="text-sm text-muted-foreground">
                          {brief.content_type} • {brief.word_count_target} words
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {brief.created_at 
                          ? new Date(brief.created_at).toLocaleDateString()
                          : ''
                        }
                      </span>
                      {expandedBrief === brief.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  
                  {expandedBrief === brief.id && (
                    <div className="border-t p-4 bg-muted/30">
                      {brief.suggested_title && (
                        <div className="mb-3">
                          <p className="text-sm font-medium">Title:</p>
                          <p className="text-sm">{brief.suggested_title}</p>
                        </div>
                      )}
                      {brief.outline?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium">Outline:</p>
                          <ul className="text-sm">
                            {brief.outline.slice(0, 5).map((s, j) => (
                              <li key={j}>• {s.heading}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(formatBriefAsText(brief), brief.id)}
                      >
                        {copiedId === brief.id ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy Brief
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!currentBrief && contentBriefs?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Content Briefs</h3>
            <p className="text-muted-foreground mb-4">
              Generate AI-powered content briefs to guide your content creation
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
