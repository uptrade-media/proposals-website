import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

/**
 * Tooltip - Lightweight tooltip component for contextual help
 * Usage:
 *   <Tooltip text="This shows project progress across all milestones">
 *     <span>Project Progress</span>
 *   </Tooltip>
 */

export function Tooltip({ text, children, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full mb-2 -translate-x-1/2 left-1/2',
    bottom: 'top-full mt-2 -translate-x-1/2 left-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2'
  }

  const arrowClasses = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-gray-900',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-gray-900',
    left: 'left-[-4px] top-1/2 -translate-y-1/2 border-l-gray-900',
    right: 'right-[-4px] top-1/2 -translate-y-1/2 border-r-gray-900'
  }

  return (
    <div className="relative inline-block group">
      {children}
      
      {/* Tooltip content - visible on hover */}
      <div
        className={`
          absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap
          opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200
          ${positionClasses[position]}
        `}
        role="tooltip"
      >
        {text}
        <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}></div>
      </div>
    </div>
  )
}

/**
 * HelpIcon - Inline help icon with tooltip
 * Usage:
 *   <HelpIcon text="Includes all projects, proposals, and invoices" />
 */

export function HelpIcon({ text, size = 'sm' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <Tooltip text={text}>
      <HelpCircle className={`${sizeClasses[size]} text-[var(--text-tertiary)] cursor-help hover:text-[var(--text-secondary)] transition-colors`} />
    </Tooltip>
  )
}

/**
 * LabelWithHelp - Form label with integrated help icon
 * Usage:
 *   <LabelWithHelp 
 *     htmlFor="amount"
 *     label="Invoice Amount"
 *     help="Total project cost including all services"
 *   />
 */

export function LabelWithHelp({ htmlFor, label, help }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={htmlFor} className="font-medium">
        {label}
      </label>
      {help && <HelpIcon text={help} size="sm" />}
    </div>
  )
}

export default Tooltip
