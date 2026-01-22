// src/components/ContactSelector.jsx
/**
 * Searchable Contact Selector
 * 
 * Used for selecting contacts (leads, customers, prospects, clients)
 * in contract/proposal creation.
 */
import React, { useState, useMemo } from 'react'
import { Button } from './ui/button'
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from './ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import { Badge } from './ui/badge'
import { 
  User, 
  Building2, 
  Check, 
  ChevronsUpDown,
  Mail
} from 'lucide-react'
import { cn } from '../lib/utils'

// Contact type labels
const TYPE_LABELS = {
  prospect: 'Prospect',
  lead: 'Lead',
  client: 'Client',
  customer: 'Customer',
  team: 'Team'
}

// Type badge colors
const TYPE_COLORS = {
  prospect: 'bg-purple-100 text-purple-700 border-purple-200',
  lead: 'bg-blue-100 text-blue-700 border-blue-200',
  client: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  customer: 'bg-green-100 text-green-700 border-green-200',
  team: 'bg-gray-100 text-gray-700 border-gray-200'
}

export function ContactSelector({
  contacts = [],
  selectedContact,
  onSelect,
  placeholder = 'Select a contact...',
  className = '',
  disabled = false,
  filterTypes = null // Optional array to filter contact types
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Filter contacts by search term and optional type filter
  const filteredContacts = useMemo(() => {
    let filtered = contacts

    // Filter by types if specified
    if (filterTypes && filterTypes.length > 0) {
      filtered = filtered.filter(c => filterTypes.includes(c.contact_type))
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(c => 
        (c.name?.toLowerCase().includes(q)) ||
        (c.email?.toLowerCase().includes(q)) ||
        (c.company?.toLowerCase().includes(q))
      )
    }

    return filtered
  }, [contacts, search, filterTypes])

  const handleSelect = (contact) => {
    onSelect(contact)
    setOpen(false)
    setSearch('')
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
            "w-full justify-between h-auto min-h-[40px] font-normal",
            !selectedContact && "text-[var(--text-tertiary)]",
            className
          )}
        >
          {selectedContact ? (
            <div className="flex items-center gap-2 py-1">
              <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                {selectedContact.avatar_url ? (
                  <img 
                    src={selectedContact.avatar_url} 
                    alt="" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-[var(--brand-primary)]" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium text-[var(--text-primary)]">{selectedContact.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{selectedContact.email}</p>
              </div>
              <Badge 
                variant="outline" 
                className={cn("ml-auto text-[10px]", TYPE_COLORS[selectedContact.contact_type] || TYPE_COLORS.lead)}
              >
                {TYPE_LABELS[selectedContact.contact_type] || selectedContact.contact_type}
              </Badge>
            </div>
          ) : (
            <span className="text-[var(--text-tertiary)]">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search by name, email, or company..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm">
              <p className="text-[var(--text-secondary)]">No contacts found</p>
            </CommandEmpty>
            <CommandGroup heading="Contacts">
              {filteredContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.id}
                  onSelect={() => handleSelect(contact)}
                  className="flex items-center gap-3 py-3"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center flex-shrink-0">
                    {contact.avatar_url ? (
                      <img 
                        src={contact.avatar_url} 
                        alt="" 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-[var(--text-secondary)]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--text-primary)] truncate">
                        {contact.name}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] py-0 h-4", TYPE_COLORS[contact.contact_type] || TYPE_COLORS.lead)}
                      >
                        {TYPE_LABELS[contact.contact_type] || contact.contact_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      {contact.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {contact.company}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Check mark if selected */}
                  {selectedContact?.id === contact.id && (
                    <Check className="w-4 h-4 text-[var(--brand-primary)]" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default ContactSelector
