// src/components/seo/SEOPagesTab.jsx
// Full-width pages table with inline editing, bulk actions, and filter bar
import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  Edit3,
  Check,
  X,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Eye,
  Sparkles,
  Copy,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useSeoStore, useSignalAccess } from '@/lib/seo-store'
import { SignalUpgradeCard } from './signal'

// Score badge component
function ScoreBadge({ score }) {
  const getColor = (score) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (score >= 40) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <Badge variant="outline" className={cn('font-mono', getColor(score))}>
      {score}
    </Badge>
  )
}

// Inline editable field
function InlineEdit({ 
  value, 
  onSave, 
  onCancel,
  placeholder = '',
  maxLength,
  type = 'text',
  showCharCount = false
}) {
  const [editValue, setEditValue] = useState(value || '')
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSave(editValue)
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {type === 'textarea' ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
            rows={2}
            className={cn(
              'flex-1 px-2 py-1.5 text-sm rounded border',
              'bg-[var(--surface-raised)] border-[var(--accent-primary)]/50',
              'focus:outline-none focus:border-[var(--accent-primary)]',
              'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
              'resize-none'
            )}
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
            className="h-8 text-sm bg-[var(--surface-raised)] border-[var(--accent-primary)]/50 focus:border-[var(--accent-primary)]"
          />
        )}
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-400" onClick={() => onSave(editValue)}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[var(--text-tertiary)]" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {showCharCount && maxLength && (
        <span className={cn(
          'text-xs',
          editValue.length > maxLength * 0.9 ? 'text-red-400' : 'text-[var(--text-tertiary)]'
        )}>
          {editValue.length}/{maxLength}
        </span>
      )}
    </div>
  )
}

// Page row component
function PageRow({ 
  page, 
  isSelected,
  onSelect,
  onEdit,
  onViewDetails,
  hasSignal,
  editingField,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onGetSuggestion
}) {
  const getPath = (url) => {
    try {
      return new URL(url).pathname
    } catch {
      return url
    }
  }

  const truncate = (str, len) => {
    if (!str) return '--'
    return str.length > len ? str.slice(0, len) + '...' : str
  }

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'group border-b border-[var(--glass-border)] transition-colors',
        'hover:bg-[var(--surface-raised)]',
        isSelected && 'bg-[var(--accent-primary)]/5'
      )}
    >
      {/* Checkbox */}
      <td className="w-10 px-3 py-3">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[var(--accent-primary)]"
        />
      </td>

      {/* URL Path */}
      <td className="px-3 py-3 max-w-[200px]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-[var(--text-primary)] truncate">
            {getPath(page.url)}
          </span>
          <a 
            href={page.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[var(--text-tertiary)] hover:text-[var(--accent-primary)]" />
          </a>
        </div>
      </td>

      {/* Score */}
      <td className="px-3 py-3 w-20 text-center">
        <ScoreBadge score={page.seo_score || 0} />
      </td>

      {/* Title */}
      <td className="px-3 py-3 max-w-[300px]">
        {editingField === `${page.id}-title` ? (
          <InlineEdit
            value={page.meta_title}
            onSave={(val) => onSaveEdit(page.id, 'meta_title', val)}
            onCancel={onCancelEdit}
            placeholder="Enter title..."
            maxLength={60}
            showCharCount
          />
        ) : (
          <div 
            className="flex items-center gap-2 cursor-pointer group/title"
            onClick={() => onStartEdit(page.id, 'title')}
          >
            <span className="text-sm text-[var(--text-primary)] truncate">
              {truncate(page.meta_title, 50)}
            </span>
            <Edit3 className="h-3 w-3 text-[var(--text-tertiary)] opacity-0 group-hover/title:opacity-100" />
            {hasSignal && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onGetSuggestion(page.id, 'title')
                      }}
                    >
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Get AI suggestion</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </td>

      {/* Description */}
      <td className="px-3 py-3 max-w-[300px]">
        {editingField === `${page.id}-description` ? (
          <InlineEdit
            value={page.meta_description}
            onSave={(val) => onSaveEdit(page.id, 'meta_description', val)}
            onCancel={onCancelEdit}
            placeholder="Enter description..."
            maxLength={160}
            type="textarea"
            showCharCount
          />
        ) : (
          <div 
            className="flex items-center gap-2 cursor-pointer group/desc"
            onClick={() => onStartEdit(page.id, 'description')}
          >
            <span className="text-sm text-[var(--text-tertiary)] truncate">
              {truncate(page.meta_description, 60)}
            </span>
            <Edit3 className="h-3 w-3 text-[var(--text-tertiary)] opacity-0 group-hover/desc:opacity-100" />
            {hasSignal && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onGetSuggestion(page.id, 'description')
                      }}
                    >
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Get AI suggestion</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </td>

      {/* Status indicators */}
      <td className="px-3 py-3 w-24">
        <div className="flex items-center gap-1">
          {page.has_issues && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                </TooltipTrigger>
                <TooltipContent>Has issues</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {page.indexed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </TooltipTrigger>
                <TooltipContent>Indexed</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 w-20">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0"
            onClick={() => onViewDetails(page.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(page.id)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(page.url)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.open(page.url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  )
}

export default function SEOPagesTab({
  site,
  pages = [],
  onSelectPage,
  onRefresh,
  isLoading = false
}) {
  const hasSignal = useSignalAccess()
  const { updatePageMetadata, getSignalSuggestions } = useSeoStore()
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [sortField, setSortField] = useState('seo_score')
  const [sortDir, setSortDir] = useState('desc')
  const [filterScore, setFilterScore] = useState('all')
  const [editingField, setEditingField] = useState(null)
  const [expandedFilters, setExpandedFilters] = useState(false)

  // Filter and sort pages
  const filteredPages = useMemo(() => {
    let result = [...pages]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => 
        p.url?.toLowerCase().includes(q) ||
        p.meta_title?.toLowerCase().includes(q) ||
        p.meta_description?.toLowerCase().includes(q)
      )
    }

    // Score filter
    if (filterScore !== 'all') {
      if (filterScore === 'critical') result = result.filter(p => (p.seo_score || 0) < 60)
      else if (filterScore === 'needs-work') result = result.filter(p => (p.seo_score || 0) >= 60 && (p.seo_score || 0) < 80)
      else if (filterScore === 'optimized') result = result.filter(p => (p.seo_score || 0) >= 80)
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField] ?? 0
      let bVal = b[sortField] ?? 0
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1
      return aVal < bVal ? 1 : -1
    })

    return result
  }, [pages, searchQuery, filterScore, sortField, sortDir])

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPages.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPages.map(p => p.id)))
    }
  }

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Edit handlers
  const handleStartEdit = (pageId, field) => {
    setEditingField(`${pageId}-${field}`)
  }

  const handleSaveEdit = async (pageId, field, value) => {
    await updatePageMetadata(pageId, { [field]: value })
    setEditingField(null)
  }

  const handleCancelEdit = () => {
    setEditingField(null)
  }

  const handleGetSuggestion = async (pageId, field) => {
    if (!hasSignal) return
    const suggestion = await getSignalSuggestions(pageId, field)
    if (suggestion) {
      // Start editing with the suggestion pre-filled
      setEditingField(`${pageId}-${field}`)
      // The suggestion would be applied via the edit flow
    }
  }

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDir === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="pl-10 bg-[var(--glass-bg)] border-[var(--glass-border)]"
          />
        </div>

        <Select value={filterScore} onValueChange={setFilterScore}>
          <SelectTrigger className="w-[150px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <SelectValue placeholder="Filter by score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="optimized">Optimized (80+)</SelectItem>
            <SelectItem value="needs-work">Needs Work (60-79)</SelectItem>
            <SelectItem value="critical">Critical (&lt;60)</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>

        <span className="text-sm text-[var(--text-tertiary)]">
          {filteredPages.length} of {pages.length} pages
        </span>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30"
          >
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {selectedIds.size} selected
            </span>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signal Upgrade (for non-Signal users) */}
      {!hasSignal && pages.length > 0 && (
        <SignalUpgradeCard 
          feature="suggest"
          variant="compact"
          onUpgrade={() => window.open('/pricing', '_blank')}
        />
      )}

      {/* Table */}
      <div className="rounded-lg border border-[var(--glass-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--glass-bg)]">
              <tr className="border-b border-[var(--glass-border)]">
                <th className="w-10 px-3 py-3">
                  <Checkbox 
                    checked={selectedIds.size === filteredPages.length && filteredPages.length > 0}
                    onCheckedChange={toggleSelectAll}
                    className="data-[state=checked]:bg-[var(--accent-primary)]"
                  />
                </th>
                <th 
                  className="px-3 py-3 text-left text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                  onClick={() => handleSort('url')}
                >
                  <span className="flex items-center">
                    URL
                    <SortIcon field="url" />
                  </span>
                </th>
                <th 
                  className="px-3 py-3 text-center text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] w-20"
                  onClick={() => handleSort('seo_score')}
                >
                  <span className="flex items-center justify-center">
                    Score
                    <SortIcon field="seo_score" />
                  </span>
                </th>
                <th 
                  className="px-3 py-3 text-left text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                  onClick={() => handleSort('meta_title')}
                >
                  <span className="flex items-center">
                    Title
                    <SortIcon field="meta_title" />
                  </span>
                </th>
                <th className="px-3 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                  Description
                </th>
                <th className="px-3 py-3 text-left text-sm font-medium text-[var(--text-secondary)] w-24">
                  Status
                </th>
                <th className="px-3 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredPages.map((page) => (
                  <PageRow
                    key={page.id}
                    page={page}
                    isSelected={selectedIds.has(page.id)}
                    onSelect={() => toggleSelect(page.id)}
                    onViewDetails={() => onSelectPage(page.id)}
                    hasSignal={hasSignal}
                    editingField={editingField}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onGetSuggestion={handleGetSuggestion}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredPages.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-2">
              {searchQuery || filterScore !== 'all' 
                ? 'No pages match your filters'
                : 'No pages found'}
            </p>
            {(searchQuery || filterScore !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilterScore('all')
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
