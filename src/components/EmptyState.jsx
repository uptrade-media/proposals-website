/**
 * EmptyState - Branded empty state component with optional CTA
 * 
 * Usage:
 *   import { FolderOpen } from 'lucide-react'
 *   
 *   {items.length === 0 && (
 *     <EmptyState
 *       icon={FolderOpen}
 *       title="No projects yet"
 *       description="Projects will appear here once proposals are accepted."
 *       actionLabel="View Proposals"
 *       onAction={() => navigate('/proposals')}
 *     />
 *   )}
 */

import { Button } from '@/components/ui/button'

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  action // Support object format: { label, onClick }
}) {
  // Support both formats: separate props or action object
  const buttonLabel = action?.label || actionLabel
  const buttonOnClick = action?.onClick || onAction

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon container with brand gradient background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[var(--brand-primary)]/20 rounded-full blur-xl" />
        <div className="relative rounded-full bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] p-6">
          {Icon && <Icon className="h-12 w-12 text-[var(--text-secondary)]" />}
        </div>
      </div>

      {/* Text content */}
      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mb-8 max-w-md leading-relaxed">
        {description}
      </p>

      {/* Optional CTA button */}
      {buttonLabel && buttonOnClick && (
        <Button 
          onClick={buttonOnClick}
          variant="glass-primary"
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
