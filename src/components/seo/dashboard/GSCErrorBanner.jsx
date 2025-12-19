// src/components/seo/dashboard/GSCErrorBanner.jsx
// Warning banner for Google Search Console errors
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function GSCErrorBanner({ error }) {
  if (!error) return null

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-400">Google Search Console Error</p>
            <p className="text-xs text-[var(--text-tertiary)]">{error}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
