/**
 * Review Inbox
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Review management interface with:
 * - Filterable review list
 * - AI response generation
 * - Response templates
 * - Bulk actions
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Star, MessageSquare, Filter, Sparkles, Send, X, 
  ChevronLeft, ChevronRight, Archive, Flag 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useReputationStore, Sentiment } from '@/lib/reputation-store'
import { useToast } from '@/hooks/use-toast'

// Star Rating Display
function StarRating({ rating, size = 'sm' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }
  
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${sizes[size]} ${
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
          }`}
        />
      ))}
    </div>
  )
}

// Review List Item
function ReviewListItem({ review, isSelected, onClick }) {
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200'
      case 'negative': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div 
      className={`p-4 border-b cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{review.reviewerName || 'Anonymous'}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {review.platformType}
            </Badge>
          </div>
          <StarRating rating={review.rating} />
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {review.reviewText}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              {new Date(review.reviewDate).toLocaleDateString()}
            </span>
            {review.sentiment && (
              <Badge variant="outline" className={`text-xs ${getSentimentColor(review.sentiment)}`}>
                {review.sentiment}
              </Badge>
            )}
            {review.needsAttention && (
              <Badge variant="destructive" className="text-xs">
                <Flag className="w-3 h-3 mr-1" />
                Needs Attention
              </Badge>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {review.responseText ? (
            <Badge variant="secondary" className="text-xs">Responded</Badge>
          ) : (
            <Badge className="text-xs">New</Badge>
          )}
        </div>
      </div>
    </div>
  )
}

// Review Detail Panel
function ReviewDetail({ review, onClose }) {
  const [responseText, setResponseText] = useState('')
  const [sending, setSending] = useState(false)
  const { 
    respondToReview, 
    generateAIResponse, 
    getResponseSuggestions,
    responseSuggestions,
    generatingResponse,
    templates,
    archiveReview,
    updateReview,
  } = useReputationStore()
  const { toast } = useToast()

  useEffect(() => {
    if (review?.responseText) {
      setResponseText(review.responseText)
    } else {
      setResponseText('')
    }
  }, [review])

  const handleGenerateAI = async () => {
    try {
      const response = await generateAIResponse(review.id)
      setResponseText(response)
      toast({ title: 'Response generated', description: 'Review and edit before sending' })
    } catch (error) {
      toast({ title: 'Generation failed', description: error.message, variant: 'destructive' })
    }
  }

  const handleGetSuggestions = async () => {
    try {
      await getResponseSuggestions(review.id)
    } catch (error) {
      toast({ title: 'Failed to get suggestions', description: error.message, variant: 'destructive' })
    }
  }

  const handleSend = async () => {
    if (!responseText.trim()) return
    
    setSending(true)
    try {
      await respondToReview(review.id, responseText)
      toast({ title: 'Response posted', description: 'Your response has been saved' })
    } catch (error) {
      toast({ title: 'Failed to respond', description: error.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleArchive = async () => {
    try {
      await archiveReview(review.id)
      onClose()
      toast({ title: 'Review archived' })
    } catch (error) {
      toast({ title: 'Failed to archive', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleAttention = async () => {
    try {
      await updateReview(review.id, { needsAttention: !review.needsAttention })
      toast({ title: review.needsAttention ? 'Flag removed' : 'Flagged for attention' })
    } catch (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' })
    }
  }

  if (!review) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{review.reviewerName || 'Anonymous'}</h3>
          <p className="text-sm text-muted-foreground">
            {review.platformType} • {new Date(review.reviewDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleToggleAttention}>
            <Flag className={`w-4 h-4 ${review.needsAttention ? 'text-red-500' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleArchive}>
            <Archive className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Review Content */}
      <div className="p-4 border-b">
        <StarRating rating={review.rating} size="md" />
        <p className="mt-3 text-sm">{review.reviewText}</p>
        {review.topics?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {review.topics.map((topic) => (
              <Badge key={topic} variant="outline" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Response Section */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">
            {review.responseText ? 'Your Response' : 'Compose Response'}
          </h4>
          {!review.responseText && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateAI}
                disabled={generatingResponse}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {generatingResponse ? 'Generating...' : 'Generate AI'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGetSuggestions}
                disabled={generatingResponse}
              >
                Suggestions
              </Button>
            </div>
          )}
        </div>

        <Textarea
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          placeholder="Write your response..."
          className="flex-1 min-h-[150px] resize-none"
          disabled={!!review.responseText}
        />

        {/* Suggestions */}
        {responseSuggestions.length > 0 && !review.responseText && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">Suggestions:</p>
            {responseSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className="w-full text-left p-2 text-sm border rounded hover:bg-muted/50"
                onClick={() => setResponseText(suggestion.text)}
              >
                <Badge variant="outline" className="text-xs mb-1">{suggestion.tone}</Badge>
                <p className="line-clamp-2">{suggestion.text}</p>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {!review.responseText && (
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setResponseText('')}>
              Clear
            </Button>
            <Button onClick={handleSend} disabled={!responseText.trim() || sending}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Post Response'}
            </Button>
          </div>
        )}

        {review.responseText && review.responseDate && (
          <p className="text-xs text-muted-foreground mt-2">
            Responded on {new Date(review.responseDate).toLocaleDateString()}
            {review.responseSource && ` • ${review.responseSource}`}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ReviewInbox() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedReviewId, setSelectedReviewId] = useState(null)

  const {
    reviews,
    reviewsTotal,
    reviewsPage,
    reviewsLoading,
    reviewFilters,
    selectedReview,
    fetchReviews,
    setReviewFilters,
    selectReview,
    fetchTemplates,
  } = useReputationStore()

  useEffect(() => {
    // Load from URL params
    const filter = searchParams.get('filter')
    if (filter === 'unanswered') {
      setReviewFilters({ unanswered: true })
    } else {
      fetchReviews()
    }
    fetchTemplates()
  }, [])

  const handleFilterChange = (key, value) => {
    setReviewFilters({ [key]: value === 'all' ? null : value })
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setReviewFilters({ search: searchQuery })
  }

  const handleSelectReview = async (review) => {
    setSelectedReviewId(review.id)
    await selectReview(review.id)
  }

  const handleCloseDetail = () => {
    setSelectedReviewId(null)
    selectReview(null)
  }

  const totalPages = Math.ceil(reviewsTotal / 20)

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Review Inbox</h1>
          <p className="text-muted-foreground">
            {reviewsTotal} reviews • {reviews.filter(r => !r.responseText).length} awaiting response
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Panel - Review List */}
        <Card className="flex-1">
          {/* Filters */}
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <Input
                  placeholder="Search reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
              </form>
              
              <Select
                value={reviewFilters.platform || 'all'}
                onValueChange={(v) => handleFilterChange('platform', v)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="yelp">Yelp</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={reviewFilters.rating?.toString() || 'all'}
                onValueChange={(v) => handleFilterChange('rating', v === 'all' ? null : parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={reviewFilters.status || 'all'}
                onValueChange={(v) => handleFilterChange('status', v)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={reviewFilters.unanswered ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('unanswered', !reviewFilters.unanswered)}
              >
                Unanswered
              </Button>
            </div>
          </CardHeader>

          {/* Review List */}
          <CardContent className="p-0">
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {reviewsLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <ReviewListItem
                    key={review.id}
                    review={review}
                    isSelected={selectedReviewId === review.id}
                    onClick={() => handleSelectReview(review)}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No reviews match your filters</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {reviewsPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchReviews(reviewsPage - 1)}
                    disabled={reviewsPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchReviews(reviewsPage + 1)}
                    disabled={reviewsPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Review Detail */}
        {selectedReview ? (
          <Card className="w-[450px] shrink-0">
            <ReviewDetail review={selectedReview} onClose={handleCloseDetail} />
          </Card>
        ) : (
          <Card className="w-[450px] shrink-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground p-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a review to view details</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
