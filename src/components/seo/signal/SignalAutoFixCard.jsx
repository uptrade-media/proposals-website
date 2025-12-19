// src/components/seo/signal/SignalAutoFixCard.jsx
// Shows batch of auto-fixable issues that Signal can fix in one click
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Check, ChevronDown, ChevronUp, Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function SignalAutoFixCard({
  fixes = [],
  onApplySelected,
  onApplyAll,
  isApplying = false,
  className
}) {
  const [expanded, setExpanded] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set(fixes.map(f => f.id)))

  const toggleFix = (id) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === fixes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(fixes.map(f => f.id)))
    }
  }

  const visibleFixes = expanded ? fixes : fixes.slice(0, 3)
  const hiddenCount = fixes.length - 3

  if (fixes.length === 0) {
    return null
  }

  return (
    <Card className={cn(
      'border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20">
              <Zap className="h-4 w-4 text-yellow-400" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Auto-Fix Available
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                  {fixes.length} issues
                </Badge>
              </CardTitle>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Signal can fix these automatically
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-500 text-white"
            onClick={() => onApplyAll?.(Array.from(selectedIds))}
            disabled={isApplying || selectedIds.size === 0}
          >
            {isApplying ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="mr-1"
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                Fixing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-1" />
                Fix {selectedIds.size} of {fixes.length}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {visibleFixes.map((fix) => (
              <motion.div
                key={fix.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
              >
                <Checkbox
                  id={`fix-${fix.id}`}
                  checked={selectedIds.has(fix.id)}
                  onCheckedChange={() => toggleFix(fix.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={`fix-${fix.id}`}
                    className="text-sm font-medium text-[var(--text-primary)] cursor-pointer"
                  >
                    {fix.title}
                  </label>
                  {fix.description && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {fix.description}
                    </p>
                  )}
                  {fix.affectedPages && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      {fix.affectedPages} page{fix.affectedPages !== 1 ? 's' : ''} affected
                    </p>
                  )}
                </div>
                {fix.risk && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs shrink-0',
                      fix.risk === 'low' && 'text-emerald-400 border-emerald-500/30',
                      fix.risk === 'medium' && 'text-yellow-400 border-yellow-500/30',
                      fix.risk === 'high' && 'text-red-400 border-red-500/30'
                    )}
                  >
                    {fix.risk} risk
                  </Badge>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[var(--text-tertiary)]"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show {hiddenCount} more fixes
                </>
              )}
            </Button>
          )}
        </div>

        {/* Safety notice */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--glass-border)] text-xs text-[var(--text-tertiary)]">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          <span>Changes will be staged for review before publishing</span>
        </div>
      </CardContent>
    </Card>
  )
}
