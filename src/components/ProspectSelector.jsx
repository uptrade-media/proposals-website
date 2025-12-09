// src/components/ProspectSelector.jsx
/**
 * Searchable Prospect/Client Selector
 * 
 * Used in proposal creation to quickly find and select
 * a prospect or existing client.
 */
import React, { useState, useEffect, useMemo } from 'react'
import { Button } from './ui/button'
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator 
} from './ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import { Badge } from './ui/badge'
import { 
  Search, 
  User, 
  Building2, 
  Check, 
  ChevronsUpDown, 
  UserPlus,
  Star,
  Clock,
  Mail,
  Phone
} from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'

// Pipeline stage labels
const STAGE_LABELS = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
}

// Stage colors
const STAGE_COLORS = {
  new_lead: 'bg-gray-500',
  contacted: 'bg-blue-500',
  qualified: 'bg-purple-500',
  proposal_sent: 'bg-orange-500',
  negotiation: 'bg-yellow-500',
  won: 'bg-green-500',
  lost: 'bg-red-500'
}

export default function ProspectSelector({
  value,
  onChange,
  placeholder = 'Select prospect or client...',
  className = '',
  showCreateNew = false,
  onCreateNew,
  disabled = false
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [prospects, setProspects] = useState([])
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Load prospects and clients
  const loadData = async () => {
    if (hasLoaded) return
    
    setIsLoading(true)
    try {
      const [prospectsRes, clientsRes] = await Promise.all([
        api.get('/.netlify/functions/crm-prospects-list'),
        api.get('/.netlify/functions/admin-clients-list')
      ])
      
      setProspects(prospectsRes.data.prospects || [])
      setClients(clientsRes.data.clients || [])
      setHasLoaded(true)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load data when popover opens
  useEffect(() => {
    if (open && !hasLoaded) {
      loadData()
    }
  }, [open])

  // Filter results by search
  const filteredProspects = useMemo(() => {
    if (!search) return prospects
    const q = search.toLowerCase()
    return prospects.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.company?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  }, [prospects, search])

  const filteredClients = useMemo(() => {
    if (!search) return clients
    const q = search.toLowerCase()
    return clients.filter(c => 
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [clients, search])

  // Find selected item
  const selectedItem = useMemo(() => {
    if (!value) return null
    
    const prospect = prospects.find(p => p.id === value)
    if (prospect) return { ...prospect, type: 'prospect' }
    
    const client = clients.find(c => c.id === value)
    if (client) return { ...client, type: 'client' }
    
    return null
  }, [value, prospects, clients])

  const handleSelect = (item, type) => {
    onChange({
      id: item.id,
      type,
      name: item.name,
      email: item.email,
      company: item.company,
      phone: item.phone,
      website: item.website,
      industry: item.industry,
      pipelineStage: item.pipeline_stage
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between h-auto min-h-10 py-2 glass-bg border-[var(--glass-border)]',
            !selectedItem && 'text-[var(--text-tertiary)]',
            className
          )}
        >
          {selectedItem ? (
            <div className="flex items-center gap-3 text-left">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                {selectedItem.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {selectedItem.name}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      'text-[10px] px-1.5 py-0',
                      selectedItem.type === 'prospect' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    )}
                  >
                    {selectedItem.type === 'prospect' ? 'Prospect' : 'Client'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                  {selectedItem.company && (
                    <span className="truncate">{selectedItem.company}</span>
                  )}
                  {selectedItem.company && selectedItem.email && <span>•</span>}
                  {selectedItem.email && (
                    <span className="truncate">{selectedItem.email}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by name, company, or email..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-[var(--text-tertiary)]">
                Loading...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <p className="text-sm text-[var(--text-tertiary)]">No results found</p>
                    {showCreateNew && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setOpen(false)
                          onCreateNew?.()
                        }}
                        className="mt-2"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create new prospect
                      </Button>
                    )}
                  </div>
                </CommandEmpty>

                {/* Prospects */}
                {filteredProspects.length > 0 && (
                  <CommandGroup heading="Prospects">
                    {filteredProspects.slice(0, 10).map(prospect => (
                      <CommandItem
                        key={prospect.id}
                        value={prospect.id}
                        onSelect={() => handleSelect(prospect, 'prospect')}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                          {prospect.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text-primary)] truncate">
                              {prospect.name}
                            </span>
                            {prospect.pipeline_stage && (
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  'text-[10px] px-1.5 py-0 text-white',
                                  STAGE_COLORS[prospect.pipeline_stage]
                                )}
                              >
                                {STAGE_LABELS[prospect.pipeline_stage]}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                            {prospect.company && (
                              <>
                                <Building2 className="h-3 w-3" />
                                <span className="truncate">{prospect.company}</span>
                              </>
                            )}
                            {prospect.email && (
                              <>
                                <Mail className="h-3 w-3 ml-1" />
                                <span className="truncate">{prospect.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {value === prospect.id && (
                          <Check className="h-4 w-4 text-[var(--brand-primary)]" />
                        )}
                      </CommandItem>
                    ))}
                    {filteredProspects.length > 10 && (
                      <div className="py-2 px-4 text-xs text-[var(--text-tertiary)] text-center">
                        Showing 10 of {filteredProspects.length} prospects. Refine your search.
                      </div>
                    )}
                  </CommandGroup>
                )}

                {filteredProspects.length > 0 && filteredClients.length > 0 && (
                  <CommandSeparator />
                )}

                {/* Clients */}
                {filteredClients.length > 0 && (
                  <CommandGroup heading="Existing Clients">
                    {filteredClients.slice(0, 10).map(client => (
                      <CommandItem
                        key={client.id}
                        value={client.id}
                        onSelect={() => handleSelect(client, 'client')}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                          {client.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text-primary)] truncate">
                              {client.name}
                            </span>
                            <Star className="h-3 w-3 text-yellow-500" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                            {client.company && (
                              <>
                                <Building2 className="h-3 w-3" />
                                <span className="truncate">{client.company}</span>
                              </>
                            )}
                            {client.email && (
                              <>
                                <Mail className="h-3 w-3 ml-1" />
                                <span className="truncate">{client.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {value === client.id && (
                          <Check className="h-4 w-4 text-[var(--brand-primary)]" />
                        )}
                      </CommandItem>
                    ))}
                    {filteredClients.length > 10 && (
                      <div className="py-2 px-4 text-xs text-[var(--text-tertiary)] text-center">
                        Showing 10 of {filteredClients.length} clients. Refine your search.
                      </div>
                    )}
                  </CommandGroup>
                )}

                {/* Create New Option */}
                {showCreateNew && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setOpen(false)
                          onCreateNew?.()
                        }}
                        className="flex items-center gap-2 text-[var(--brand-primary)]"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Create new prospect</span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
