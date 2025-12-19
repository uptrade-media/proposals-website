// src/components/seo/dashboard/DashboardHeader.jsx
// Header component with site info, last scan time, and action buttons
import { Button } from '@/components/ui/button'
import { 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  Loader2, 
  Brain,
  Clock 
} from 'lucide-react'

export default function DashboardHeader({ 
  domain,
  lastScan,
  onScanNow,
  onAIInsights,
  isScanning = false
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">SEO Command Center</h1>
        <div className="flex items-center gap-2 mt-1">
          <Globe className="h-4 w-4 text-[var(--accent-primary)]" />
          <a 
            href={`https://${domain}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1"
          >
            {domain}
            <ExternalLink className="h-3 w-3" />
          </a>
          {lastScan && (
            <span className="text-xs text-[var(--text-tertiary)] ml-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last scan: {new Date(lastScan).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onScanNow}
          disabled={isScanning}
        >
          {isScanning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Scan Now
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onAIInsights}
          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        >
          <Brain className="h-4 w-4 mr-2" />
          AI Insights
        </Button>
      </div>
    </div>
  )
}
