// src/pages/commerce/components/CommerceConstants.js
// Shared configuration objects for the Commerce module

import {
  Package,
  Zap,
  Calendar,
  Wallet,
  Users,
  BarChart3,
  FileText,
  Receipt,
  CreditCard,
  UserPlus,
  UserCheck,
  Crown,
  AlertCircle,
  Ticket,
  Tag,
  Copy,
  Download,
  Clock,
  DollarSign,
  Sparkles,
} from 'lucide-react'

// Status config for badges - dark mode compatible
export const STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  draft: { label: 'Draft', className: 'bg-[var(--glass-bg-inset)] text-[var(--text-secondary)] border-[var(--glass-border)]' },
  archived: { label: 'Archived', className: 'bg-[var(--glass-bg-inset)] text-[var(--text-tertiary)] border-[var(--glass-border)]' },
  sold_out: { label: 'Sold Out', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' },
}

// Price type config for services and events
export const PRICE_TYPE_CONFIG = {
  fixed: { label: 'Fixed', icon: DollarSign },
  hourly: { label: 'Hourly', icon: Clock },
  quote: { label: 'Quote', icon: FileText },
  free: { label: 'Free', icon: Sparkles },
}

// Sidebar navigation - Highlights + Products + Services + Events + Sales dropdowns
export const SIDEBAR_SECTIONS = {
  highlights: { id: 'highlights', label: 'Highlights', icon: Sparkles },
  products: {
    id: 'products',
    label: 'Products',
    icon: Package,
    items: [
      { id: 'all', label: 'All Products', filter: {} },
      { id: 'active', label: 'Active', filter: { status: 'active' } },
      { id: 'draft', label: 'Draft', filter: { status: 'draft' } },
      { id: 'archived', label: 'Archived', filter: { status: 'archived' } },
    ],
  },
  services: {
    id: 'services',
    label: 'Services',
    icon: Zap,
    items: [
      { id: 'all', label: 'All Services', filter: {} },
      { id: 'active', label: 'Active', filter: { status: 'active' } },
      { id: 'draft', label: 'Draft', filter: { status: 'draft' } },
      { id: 'archived', label: 'Archived', filter: { status: 'archived' } },
    ],
  },
  events: {
    id: 'events',
    label: 'Events',
    icon: Calendar,
    items: [
      { id: 'all', label: 'All Events', filter: {} },
      { id: 'active', label: 'Upcoming', filter: { status: 'active' } },
      { id: 'draft', label: 'Draft', filter: { status: 'draft' } },
      { id: 'archived', label: 'Past', filter: { status: 'archived' } },
    ],
  },
  sales: {
    id: 'sales',
    label: 'Sales',
    icon: Wallet,
    items: [
      { id: 'overview', label: 'Overview', icon: BarChart3, filter: {} },
      { id: 'contracts', label: 'Contracts', icon: FileText, filter: {} },
      { id: 'invoices', label: 'Invoices', icon: Receipt, filter: {} },
      { id: 'transactions', label: 'Transactions', icon: CreditCard, filter: {} },
    ],
  },
  customers: {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    items: [
      // Core views
      { id: 'all', label: 'All Customers', icon: Users, filter: {} },
      { id: 'new', label: 'New Customers', icon: UserPlus, filter: { segment: 'new' } },
      { id: 'repeat', label: 'Repeat Customers', icon: UserCheck, filter: { segment: 'repeat' } },
      { id: 'vip', label: 'VIP / High Value', icon: Crown, filter: { segment: 'vip' } },
      { id: 'at-risk', label: 'At Risk', icon: AlertCircle, filter: { segment: 'at-risk' } },
      // Context views (divider in UI)
      { id: 'divider-context', divider: true, label: 'By Purchase Type' },
      { id: 'product-buyers', label: 'Product Buyers', icon: Package, filter: { type: 'product' } },
      { id: 'service-clients', label: 'Service Clients', icon: Zap, filter: { type: 'service' } },
      { id: 'event-attendees', label: 'Event Attendees', icon: Ticket, filter: { type: 'event' } },
      // Organization (divider in UI)
      { id: 'divider-org', divider: true, label: 'Organization' },
      { id: 'segments', label: 'Segments & Tags', icon: Tag, filter: {} },
      { id: 'duplicates', label: 'Duplicates / Merge', icon: Copy, filter: {} },
      { id: 'import-export', label: 'Import / Export', icon: Download, filter: {} },
    ],
  },
}
