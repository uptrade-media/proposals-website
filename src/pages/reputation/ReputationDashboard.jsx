/**
 * Reputation Dashboard
 * ══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Main reputation management dashboard showing:
 * - Health Score gauge
 * - Platform connections
 * - Recent reviews
 * - Action items
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star, MessageSquare, TrendingUp, AlertCircle, Plus, RefreshCw, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useReputationStore } from '@/lib/reputation-store'

// Platform icons/colors
const platformConfig = {
  google: { name: 'Google', color: 'bg-blue-500', icon: '🔵' },
  yelp: { name: 'Yelp', color: 'bg-red-500', icon: '🔴' },
  facebook: { name: 'Facebook', color: 'bg-indigo-500', icon: '🔷' },
  trustpilot: { name: 'Trustpilot', color: 'bg-green-500', icon: '🟢' },
  bbb: { name: 'BBB', color: 'bg-yellow-500', icon: '🟡' },
}

// Health Score Gauge Component
function HealthScoreGauge({ score, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Skeleton className="w-32 h-32 rounded-full" />
        <Skeleton className="w-24 h-4 mt-4" />
      </div>
    )
  }

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-green-500'
    if (s >= 60) return 'text-yellow-500'
    if (s >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreLabel = (s) => {
    if (s >= 80) return 'Excellent'
    if (s >= 60) return 'Good'
    if (s >= 40) return 'Fair'
    return 'Needs Attention'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            className="text-muted stroke-current"
            strokeWidth="8"
            fill="transparent"
            r="42"
            cx="50"
            cy="50"
          />
          <circle
            className={`${getScoreColor(score)} stroke-current transition-all duration-500`}
            strokeWidth="8"
            strokeLinecap="round"
            fill="transparent"
            r="42"
            cx="50"
            cy="50"
            strokeDasharray={`${(score / 100) * 264} 264`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <Badge variant="outline" className="mt-4">
        {getScoreLabel(score)}
      </Badge>
    </div>
  )
}

// Star Rating Display
function StarRating({ rating }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5

  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < fullStars
              ? 'fill-yellow-400 text-yellow-400'
              : i === fullStars && hasHalf
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-muted'
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  )
}

// Review Card
function ReviewCard({ review, onRespond }) {
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800'
      case 'negative': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">{review.reviewerName || 'Anonymous'}</span>
            <Badge variant="outline" className="text-xs">
              {platformConfig[review.platformType]?.name || review.platformType}
            </Badge>
            {review.sentiment && (
              <Badge className={getSentimentColor(review.sentiment)}>
                {review.sentiment}
              </Badge>
            )}
          </div>
          <StarRating rating={review.rating} />
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {review.reviewText}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(review.reviewDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {!review.responseText ? (
            <Button size="sm" onClick={() => onRespond(review)}>
              <MessageSquare className="w-3 h-3 mr-1" />
              Respond
            </Button>
          ) : (
            <Badge variant="secondary">Responded</Badge>
          )}
        </div>
      </div>
    </div>
  )
}

// Platform Card
function PlatformCard({ platform, onSync }) {
  const config = platformConfig[platform.platformType] || { name: platform.platformType, color: 'bg-gray-500' }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${platform.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="font-medium">{config.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium">{platform.totalReviews || 0} reviews</div>
          {platform.averageRating && (
            <div className="text-xs text-muted-foreground">{platform.averageRating.toFixed(1)} avg</div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onSync(platform.id)}>
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

export default function ReputationDashboard() {
  const {
    overview,
    overviewLoading,
    platforms,
    platformsLoading,
    healthScore,
    healthLoading,
    fetchOverview,
    fetchPlatforms,
    fetchHealthScore,
    syncPlatform,
    selectReview,
  } = useReputationStore()

  useEffect(() => {
    fetchOverview()
    fetchPlatforms()
    fetchHealthScore()
  }, [])

  const handleRespondToReview = (review) => {
    selectReview(review.id)
    // Navigate to review inbox or open modal
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reputation</h1>
          <p className="text-muted-foreground">Monitor and manage your online reputation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/reputation/settings">Settings</Link>
          </Button>
          <Button asChild>
            <Link to="/reputation/reviews">
              <MessageSquare className="w-4 h-4 mr-2" />
              Review Inbox
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthScoreGauge 
              score={healthScore?.overallScore || overview?.healthScore?.overall_score || 0} 
              loading={healthLoading || overviewLoading} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{overview?.healthScore?.total_reviews || 0}</div>
                <StarRating rating={overview?.healthScore?.average_rating || 0} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{overview?.pendingResponses || 0}</div>
                <p className="text-sm text-muted-foreground">reviews need attention</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold">{overview?.activeCampaigns || 0}</div>
                <p className="text-sm text-muted-foreground">
                  {overview?.requestsSent30d || 0} requests sent (30d)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reviews */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Reviews</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/reputation/reviews">
                  View All
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
            <CardDescription>Latest reviews across all platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overviewLoading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : overview?.recentReviews?.length > 0 ? (
              overview.recentReviews.map((review) => (
                <ReviewCard 
                  key={review.id} 
                  review={review} 
                  onRespond={handleRespondToReview}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No reviews yet</p>
                <p className="text-sm">Connect platforms to start monitoring reviews</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platforms & Alerts */}
        <div className="space-y-6">
          {/* Connected Platforms */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Platforms</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/reputation/settings">
                    <Plus className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {platformsLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : platforms.length > 0 ? (
                platforms.map((platform) => (
                  <PlatformCard 
                    key={platform.id} 
                    platform={platform} 
                    onSync={syncPlatform}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No platforms connected</p>
                  <Button variant="link" size="sm" asChild>
                    <Link to="/reputation/settings">Connect Now</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          {healthScore?.alerts?.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-4 h-4" />
                  Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {healthScore.alerts.map((alert, i) => (
                    <li key={i} className="text-sm text-yellow-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      {alert}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/reputation/campaigns">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Create Campaign
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/reputation/reviews?filter=unanswered">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Respond to Reviews
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
