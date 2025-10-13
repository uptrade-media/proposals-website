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
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon container with brand gradient background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4bbf39]/20 to-[#39bfb0]/20 rounded-full blur-xl" />
        <div className="relative rounded-full bg-gradient-to-br from-gray-50 to-gray-100 p-6">
          {Icon && <Icon className="h-12 w-12 text-gray-400" />}
        </div>
      </div>

      {/* Text content */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 mb-8 max-w-md leading-relaxed">
        {description}
      </p>

      {/* Optional CTA button */}
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da52e] to-[#2ea899] text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
