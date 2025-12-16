/**
 * ReferrersTable - Traffic sources with breakdown
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Globe, 
  Search, 
  Share2, 
  Mail, 
  ExternalLink,
  Link2,
  Loader2 
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Get icon based on referrer type
function getReferrerIcon(referrer) {
  if (!referrer || referrer === 'Direct') return Link2
  if (referrer.includes('google')) return Search
  if (referrer.includes('facebook') || referrer.includes('twitter') || 
      referrer.includes('linkedin') || referrer.includes('instagram')) return Share2
  if (referrer.includes('mail') || referrer.includes('email')) return Mail
  return Globe
}

// Get referrer display name and category
function parseReferrer(referrer) {
  if (!referrer || referrer === 'Direct' || referrer === '(direct)') {
    return { name: 'Direct / None', category: 'direct' }
  }
  
  const domain = referrer.replace(/^https?:\/\//, '').split('/')[0]
  
  if (domain.includes('google')) return { name: 'Google', category: 'search' }
  if (domain.includes('bing')) return { name: 'Bing', category: 'search' }
  if (domain.includes('duckduckgo')) return { name: 'DuckDuckGo', category: 'search' }
  if (domain.includes('facebook')) return { name: 'Facebook', category: 'social' }
  if (domain.includes('twitter') || domain.includes('x.com')) return { name: 'X (Twitter)', category: 'social' }
  if (domain.includes('linkedin')) return { name: 'LinkedIn', category: 'social' }
  if (domain.includes('instagram')) return { name: 'Instagram', category: 'social' }
  if (domain.includes('youtube')) return { name: 'YouTube', category: 'social' }
  
  return { name: domain, category: 'referral' }
}

export function ReferrersTable({ 
  referrers = [], 
  isLoading = false,
  formatNumber,
  limit = 15
}) {
  const displayReferrers = referrers.slice(0, limit)
  const totalCount = referrers.reduce((sum, r) => sum + (r.count || 0), 0)
  
  // Group by category for summary
  const categories = displayReferrers.reduce((acc, ref) => {
    const { category } = parseReferrer(ref.referrer)
    acc[category] = (acc[category] || 0) + (ref.count || 0)
    return acc
  }, {})

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Traffic Sources
            </CardTitle>
            <CardDescription>Where your visitors come from</CardDescription>
          </div>
        </div>
        
        {/* Category summary */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--glass-border)]">
          {[
            { key: 'direct', label: 'Direct', color: '#8b5cf6' },
            { key: 'search', label: 'Search', color: '#3b82f6' },
            { key: 'social', label: 'Social', color: '#ec4899' },
            { key: 'referral', label: 'Referral', color: '#f59e0b' }
          ].map(cat => {
            const count = categories[cat.key] || 0
            const percent = totalCount > 0 ? (count / totalCount) * 100 : 0
            
            return count > 0 && (
              <div key={cat.key} className="flex items-center gap-1.5">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-[var(--text-secondary)]">
                  {cat.label}: {percent.toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-[350px] pr-4">
          {displayReferrers.length > 0 ? (
            <div className="space-y-1">
              {displayReferrers.map((referrer, index) => {
                const { name, category } = parseReferrer(referrer.referrer)
                const Icon = getReferrerIcon(referrer.referrer)
                const percent = totalCount > 0 ? (referrer.count / totalCount) * 100 : 0
                
                const categoryColors = {
                  direct: '#8b5cf6',
                  search: '#3b82f6',
                  social: '#ec4899',
                  referral: '#f59e0b'
                }
                
                return (
                  <div 
                    key={index}
                    className="flex items-center gap-3 py-2.5 px-3 -mx-3 hover:bg-[var(--glass-bg)] rounded-lg transition-colors"
                  >
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${categoryColors[category]}20` }}
                    >
                      <Icon 
                        className="h-4 w-4" 
                        style={{ color: categoryColors[category] }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {name}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-1.5 bg-[var(--glass-bg-inset)] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${percent}%`,
                            backgroundColor: categoryColors[category]
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)] w-12 text-right">
                        {formatNumber(referrer.count)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-[var(--text-tertiary)]">
              No referrer data available
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default ReferrersTable
