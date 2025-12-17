// src/components/seo/SEOBlogBrain.jsx
// AI-powered blog content intelligence integrated with SEO knowledge base

import { useState, useEffect } from 'react'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Brain,
  Lightbulb,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wand2,
  Quote,
  Link2,
  TrendingUp,
  Target,
  BookOpen,
  Settings,
  Play,
  ChevronRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'

export default function SEOBlogBrain({ siteId }) {
  const [activeTab, setActiveTab] = useState('topics')
  const [selectedPost, setSelectedPost] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  
  const {
    blogTopicRecommendations,
    blogPostAnalysis,
    blogOptimizationResults,
    blogBrainLoading,
    blogBrainError,
    fetchBlogTopicRecommendations,
    analyzeBlogPost,
    analyzeAllBlogPosts,
    fixAllBlogPostEmDashes,
    optimizeBlogPost,
    addBlogPostCitations
  } = useSeoStore()

  const [allPostsAnalysis, setAllPostsAnalysis] = useState(null)
  const [fixingEmDashes, setFixingEmDashes] = useState(false)

  // Load topic recommendations on mount
  useEffect(() => {
    if (siteId && activeTab === 'topics') {
      fetchBlogTopicRecommendations(siteId)
    }
  }, [siteId, activeTab])

  // Load all posts analysis when switching to audit tab
  useEffect(() => {
    if (activeTab === 'audit' && !allPostsAnalysis) {
      loadAllPostsAnalysis()
    }
  }, [activeTab])

  const loadAllPostsAnalysis = async () => {
    try {
      const result = await analyzeAllBlogPosts()
      setAllPostsAnalysis(result)
    } catch (error) {
      console.error('Failed to analyze posts:', error)
    }
  }

  const handleFixAllEmDashes = async () => {
    setFixingEmDashes(true)
    try {
      const result = await fixAllBlogPostEmDashes()
      // Reload analysis after fix
      await loadAllPostsAnalysis()
      alert(`Fixed ${result.fixed} posts with em dashes!`)
    } catch (error) {
      console.error('Failed to fix em dashes:', error)
    } finally {
      setFixingEmDashes(false)
    }
  }

  const handleOptimizePost = async (postId) => {
    try {
      await optimizeBlogPost(postId, { applyChanges: false })
    } catch (error) {
      console.error('Failed to optimize post:', error)
    }
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Blog AI Brain</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              SEO-powered content intelligence for your blog
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Topic Ideas
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Content Audit
          </TabsTrigger>
          <TabsTrigger value="optimize" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Optimize
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Guidelines
          </TabsTrigger>
        </TabsList>

        {/* Topic Recommendations */}
        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    AI Topic Recommendations
                  </CardTitle>
                  <CardDescription>
                    Blog topics based on your keyword gaps, search trends, and competitor analysis
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => fetchBlogTopicRecommendations(siteId)}
                  disabled={blogBrainLoading}
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${blogBrainLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {blogBrainLoading && !blogTopicRecommendations.length ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
                  <span className="ml-2 text-[var(--text-secondary)]">Analyzing SEO data...</span>
                </div>
              ) : blogTopicRecommendations.length > 0 ? (
                <div className="space-y-4">
                  {blogTopicRecommendations.map((topic, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-xl border border-[var(--border-primary)] hover:border-purple-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                            {topic.title}
                          </h4>
                          <p className="text-sm text-[var(--text-secondary)] mb-2">
                            {topic.contentAngle || topic.angle}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Target className="w-3 h-3 mr-1" />
                              {topic.primaryKeyword}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                topic.trafficPotential === 'high' ? 'border-green-500 text-green-600' :
                                topic.trafficPotential === 'medium' ? 'border-yellow-500 text-yellow-600' :
                                'border-gray-500'
                              }`}
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {topic.trafficPotential} potential
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {topic.searchIntent || topic.intent}
                            </Badge>
                          </div>
                          {topic.relatedServices && topic.relatedServices.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                              <Link2 className="w-3 h-3" />
                              Link to: {topic.relatedServices.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => copyToClipboard(topic.title, `topic-${index}`)}
                          >
                            {copiedId === `topic-${index}` ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4 mr-1" />
                            Create
                          </Button>
                        </div>
                      </div>
                      {topic.whyItMatters && (
                        <p className="mt-3 text-xs text-[var(--text-secondary)] bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                          <strong>Why now:</strong> {topic.whyItMatters}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No topic recommendations yet.</p>
                  <p className="text-sm">Train your SEO AI Brain first for intelligent suggestions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Audit */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Content Quality Audit
                  </CardTitle>
                  <CardDescription>
                    Scan all blog posts for style issues, missing citations, and SEO problems
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={loadAllPostsAnalysis}
                    disabled={blogBrainLoading}
                    variant="outline"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${blogBrainLoading ? 'animate-spin' : ''}`} />
                    Scan All
                  </Button>
                  {allPostsAnalysis?.postsWithIssues > 0 && (
                    <Button 
                      onClick={handleFixAllEmDashes}
                      disabled={fixingEmDashes}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    >
                      <Wand2 className={`w-4 h-4 mr-2 ${fixingEmDashes ? 'animate-spin' : ''}`} />
                      Fix All Em Dashes
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {blogBrainLoading && !allPostsAnalysis ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
                  <span className="ml-2 text-[var(--text-secondary)]">Scanning blog posts...</span>
                </div>
              ) : allPostsAnalysis ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[var(--surface-secondary)] text-center">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">
                        {allPostsAnalysis.totalPosts}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">Total Posts</div>
                    </div>
                    <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {allPostsAnalysis.postsWithIssues}
                      </div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-400">Posts with Issues</div>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {allPostsAnalysis.totalPosts - allPostsAnalysis.postsWithIssues}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-400">Clean Posts</div>
                    </div>
                  </div>

                  {/* Posts with issues */}
                  {allPostsAnalysis.results?.length > 0 && (
                    <div className="space-y-3 mt-6">
                      <h4 className="font-semibold text-[var(--text-primary)]">Posts Needing Attention</h4>
                      {allPostsAnalysis.results.map((post) => (
                        <div 
                          key={post.id}
                          className="p-4 rounded-xl border border-[var(--border-primary)]"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium text-[var(--text-primary)]">{post.title}</h5>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {post.issues.map((issue, i) => (
                                  <Badge 
                                    key={i}
                                    variant="outline"
                                    className={`text-xs ${
                                      issue.severity === 'warning' ? 'border-yellow-500 text-yellow-600' :
                                      issue.severity === 'error' ? 'border-red-500 text-red-600' :
                                      'border-blue-500 text-blue-600'
                                    }`}
                                  >
                                    {issue.type.replace(/-/g, ' ')}
                                    {issue.autoFixable && (
                                      <Sparkles className="w-3 h-3 ml-1" />
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleOptimizePost(post.id)}
                            >
                              <Wand2 className="w-4 h-4 mr-1" />
                              Optimize
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Scan All" to analyze your blog posts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimize Single Post */}
        <TabsContent value="optimize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-500" />
                AI Post Optimizer
              </CardTitle>
              <CardDescription>
                Select a post to analyze and optimize with AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {blogPostAnalysis ? (
                <div className="space-y-6">
                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[var(--surface-secondary)] text-center">
                      <div className={`text-2xl font-bold ${
                        (blogPostAnalysis.analysis?.seoScore || 0) >= 80 ? 'text-green-500' :
                        (blogPostAnalysis.analysis?.seoScore || 0) >= 60 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {blogPostAnalysis.analysis?.seoScore || 'N/A'}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">SEO Score</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--surface-secondary)] text-center">
                      <div className={`text-2xl font-bold ${
                        (blogPostAnalysis.analysis?.contentQualityScore || 0) >= 80 ? 'text-green-500' :
                        (blogPostAnalysis.analysis?.contentQualityScore || 0) >= 60 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {blogPostAnalysis.analysis?.contentQualityScore || 'N/A'}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">Content Quality</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--surface-secondary)] text-center">
                      <div className={`text-2xl font-bold ${
                        (blogPostAnalysis.analysis?.styleComplianceScore || 0) >= 80 ? 'text-green-500' :
                        (blogPostAnalysis.analysis?.styleComplianceScore || 0) >= 60 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {blogPostAnalysis.analysis?.styleComplianceScore || 'N/A'}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">Style Compliance</div>
                    </div>
                  </div>

                  {/* Issues */}
                  {blogPostAnalysis.analysis?.issues && (
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] mb-3">Issues Found</h4>
                      <div className="space-y-2">
                        {blogPostAnalysis.analysis.issues.map((issue, i) => (
                          <div key={i} className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-700 dark:text-red-300">{issue}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {blogPostAnalysis.analysis?.optimizedTitle && (
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] mb-3">Optimized Title</h4>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-between">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {blogPostAnalysis.analysis.optimizedTitle}
                        </p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(blogPostAnalysis.analysis.optimizedTitle, 'title')}
                        >
                          {copiedId === 'title' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {blogPostAnalysis.analysis?.optimizedMetaDescription && (
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] mb-3">Optimized Meta Description</h4>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-between">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {blogPostAnalysis.analysis.optimizedMetaDescription}
                        </p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(blogPostAnalysis.analysis.optimizedMetaDescription, 'meta')}
                        >
                          {copiedId === 'meta' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a post from the Content Audit tab to optimize</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Writing Guidelines */}
        <TabsContent value="guidelines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-500" />
                Writing Guidelines
              </CardTitle>
              <CardDescription>
                Style rules enforced by the AI Blog Brain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Never Use */}
                <div>
                  <h4 className="font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Never Use
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-red-500 font-bold">×</span>
                      Em dashes (—) or en dashes (–) except in number ranges
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-red-500 font-bold">×</span>
                      Generic openers like "In today's digital landscape..."
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-red-500 font-bold">×</span>
                      Overly formal or academic language
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-red-500 font-bold">×</span>
                      Sales-heavy or pushy language
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-red-500 font-bold">×</span>
                      Passive voice when active is clearer
                    </li>
                  </ul>
                </div>

                {/* Always Do */}
                <div>
                  <h4 className="font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Always Do
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-green-500 font-bold">✓</span>
                      Write like teaching a smart friend
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-green-500 font-bold">✓</span>
                      Cite credible sources with specific data
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-green-500 font-bold">✓</span>
                      Use contractions naturally (you'll, we've, it's)
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-green-500 font-bold">✓</span>
                      Keep paragraphs to 2-3 sentences max
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-green-500 font-bold">✓</span>
                      Start with a compelling hook, not generic intro
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="text-green-500 font-bold">✓</span>
                      Include real examples and case studies
                    </li>
                  </ul>
                </div>

                {/* Tone Examples */}
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Quote className="w-4 h-4" />
                    Tone Examples
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">❌ Wrong</p>
                      <p className="text-sm text-red-700 dark:text-red-300 italic">
                        "In today's ever-evolving digital marketing landscape — where competition is fierce — businesses must leverage innovative strategies to achieve success."
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">✅ Right</p>
                      <p className="text-sm text-green-700 dark:text-green-300 italic">
                        "Here's the truth about digital marketing in 2025: the businesses winning aren't doing more. They're doing less, but doing it better. Let me show you exactly how."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Citation Format */}
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Citation Format
                  </h4>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                      <li>• "According to HubSpot's 2024 State of Marketing Report..."</li>
                      <li>• "A Stanford study found that 75% of users..."</li>
                      <li>• "Research from Moz shows that..."</li>
                      <li>• "Google processes 8.5 billion searches daily (Search Engine Land, 2024)"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {blogBrainError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{blogBrainError}</p>
        </div>
      )}
    </div>
  )
}
