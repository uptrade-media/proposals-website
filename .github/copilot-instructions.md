# Uptrade Portal - Copilot Instructions

**Project:** portal.uptrademedia.com  
**Stack:** React 19 + Vite + Zustand + Tailwind + shadcn/ui  
**Backend:** Portal API (NestJS) + Signal API (AI) + Netlify Functions (legacy)  
**Last Updated:** January 2026

---

## 🚨 CRITICAL: Hot Reload Development

**DO NOT RESTART SERVERS** - They run with `pnpm dev:all` with hot reload enabled.
- Code changes automatically compile and refresh
- Just edit files and wait for the compiler to finish
- Never manually kill/restart the server process

---

## 🚨 CRITICAL: Use Supabase MCP Server for Database Work

**ALWAYS use the Supabase MCP server for database operations:**
- Creating migrations
- Modifying schema (tables, columns, constraints)
- Adding/updating RLS policies
- Running database queries
- Checking table structures

**Available MCP Tools:**
- `mcp_supabase_query` - Execute SQL queries
- `mcp_supabase_list_tables` - List all tables
- `mcp_supabase_describe_table` - Get table structure
- `mcp_supabase_create_migration` - Create new migration file
- `mcp_supabase_apply_migration` - Apply pending migrations
- `mcp_supabase_list_migrations` - View migration status

**Benefits:**
- Direct access to Supabase instance
- Safe, validated SQL generation
- Automatic migration file creation
- RLS policy management
- No manual SQL file writing

**Connection String (for psql migrations):**
```bash
# Get connection string from Supabase Dashboard > Settings > Database
# DO NOT commit credentials to Git!
psql "$SUPABASE_DB_URL" -f migration.sql
```

**Recommended Workflow:**
1. **Schema Validation**: Use MCP server to check current schema (`mcp_supabase_describe_table`)
2. **Migration Creation**: Create SQL migration file in `supabase/migrations/`
3. **Migration Deployment**: Run via psql with connection string above
4. **Verification**: Use MCP server to verify changes applied correctly

**Example workflow:**
```bash
# 1. Check current schema (MCP server - read-only)
mcp_supabase_describe_table('signal_actions')

# 2. Create migration file manually
# supabase/migrations/YYYYMMDDHHMMSS_description.sql

# 3. Deploy migration (direct connection)
psql "$SUPABASE_DB_URL" -f migration.sql

# 4. Verify (MCP server)
mcp_supabase_describe_table('signal_actions')
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (portal.uptrademedia.com)                   │
│                         React + Vite + Zustand                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   PORTAL API      │   │   SIGNAL API      │   │ NETLIFY FUNCTIONS │
│   (NestJS)        │   │   (NestJS)        │   │   (Legacy)        │
│                   │   │                   │   │                   │
│ • Messages        │   │ • Echo AI Chat    │   │ • Auth            │
│ • Engage          │   │ • AI Skills       │   │ • Some legacy     │
│ • Analytics       │   │ • Knowledge Base  │   │                   │
│ • SEO             │   │ • Memory/Learning │   │                   │
│ • CRM             │   │                   │   │                   │
│                   │   │                   │   │                   │
│ api.uptrade...    │   │ signal.uptrade... │   │ /.netlify/funcs   │
└───────────────────┘   └───────────────────┘   └───────────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
                    ┌─────────────────────────────┐
                    │         SUPABASE            │
                    │   PostgreSQL + Auth + RLS   │
                    └─────────────────────────────┘
```

---

## 🎨 Brand Color System

**ALWAYS use brand colors from ThemeProvider** - Never hardcode colors or use random values.

### CSS Variables Available

ThemeProvider provides these CSS variables:
- `--brand-primary` - Primary brand color (from project/org settings)
- `--brand-primary-hover` - Darkened primary for hover states
- `--brand-secondary` - Secondary brand color
- `--brand-secondary-hover` - Darkened secondary for hover states

### Color Usage Rules

**✅ CORRECT:**
```jsx
// Solid brand color
<div style={{ color: 'var(--brand-primary)' }}>

// Brand color with opacity (15% opacity)
<div style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}>

// Gradient (always primary -> secondary)
<div style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}>

// Icon with brand color
<Icon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
```

**❌ NEVER:**
```jsx
// ❌ Random colors
<div className="bg-blue-500 text-purple-600">

// ❌ Hardcoded hex
<div style={{ color: '#4bbf39' }}>

// ❌ Non-brand gradients
<div style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}>
```

### Module Tile Pattern

For module tiles, cards, and feature highlights:
- **Background**: `color-mix(in srgb, var(--brand-primary) 15%, transparent)`
- **Icon/Text**: `var(--brand-primary)`
- **Hover**: Use `--brand-primary-hover`

```jsx
<div 
  className="p-2.5 rounded-xl"
  style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
>
  <Icon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
</div>
```

---

## 🤖 Signal AI Branding

**ALWAYS use "Signal" branding for AI features** - Never say "AI" alone.

### Naming Convention

| ❌ NEVER | ✅ ALWAYS |
|----------|-----------|
| AI Insights | Signal Insights |
| AI Brain | Signal SEO / Signal Brain |
| AI-powered | Signal-powered |
| AI recommendations | Signal recommendations |
| Train AI | Train Signal |

### Icon Usage

**Use SignalIcon instead of Brain icon** for all AI/Signal-related features:

```jsx
// ✅ CORRECT
import SignalIcon from '@/components/ui/SignalIcon'
<SignalIcon className="h-5 w-5" />

// ❌ NEVER
import { Brain } from 'lucide-react'
<Brain className="h-5 w-5" />
```

### Signal Icon with Brand Colors

```jsx
<div 
  className="p-2.5 rounded-xl"
  style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
>
  <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
</div>
```

---

## Organization & Project Hierarchy

### Core Concept: `org_id` vs `project_id`

Every record uses `project_id` as the primary identifier. Projects belong to Organizations.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    UPTRADE MEDIA (Super Admin Org)                      │
│                    Has access to ALL org dashboards                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   CLIENT ORG A    │   │   CLIENT ORG B    │   │   CLIENT ORG C    │
│   (org_id: uuid)  │   │   (org_id: uuid)  │   │   (org_id: uuid)  │
│                   │   │                   │   │                   │
│ ┌───────────────┐ │   │ ┌───────────────┐ │   │ ┌───────────────┐ │
│ │  Project 1    │ │   │ │  Project 1    │ │   │ │  Project 1    │ │
│ │  (project_id) │ │   │ │  (project_id) │ │   │ │  (project_id) │ │
│ │  • SEO        │ │   │ │  • SEO        │ │   │ │  • SEO        │ │
│ │  • Analytics  │ │   │ │  • Analytics  │ │   │ │  • Analytics  │ │
│ │  • Engage     │ │   │ │  • Engage     │ │   │ │  • Engage     │ │
│ │  • CRM        │ │   │ │  • CRM        │ │   │ │  • CRM        │ │
│ └───────────────┘ │   │ └───────────────┘ │   │ └───────────────┘ │
│ ┌───────────────┐ │   │                   │   │                   │
│ │  Project 2    │ │   │                   │   │                   │
│ │  (project_id) │ │   │                   │   │                   │
│ └───────────────┘ │   │                   │   │                   │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

### What Uses org_id vs project_id

| Scope | Tables/Features | Why |
|-------|----------------|-----|
| **org_id ONLY** | `billing`, `invoices`, `proposals`, `projects` | Billing/proposals are per organization |
| **project_id** | `seo_*`, `analytics_*`, `engage_*`, `crm_*` | Project-specific modules |
| **user-scoped** | `messages`, `notifications` | Per-user, contacts within same org + Uptrade team |

### Access Levels

| User Type | Sidebar Modules | Messaging Access |
|-----------|-----------------|------------------|
| **Admin (you)** | All modules, all orgs | Can message anyone in entire DB |
| **Uptrade Team** | All modules for assigned orgs | Can message users in assigned orgs |
| **Org-Level User** | Org modules + Project modules | Can message within their org |
| **Project-Level User** | Project Dashboard + Project modules | Can message within their org |

### Portal Sidebar Structure

```
Org-Level User sees:
├── 📊 Dashboard (org overview)
├── 📄 Projects
├── 📋 Proposals  
├── 💰 Billing
├── ─────────────────────
├── [Project Dropdown] ← Select project from top-left
├── 📈 SEO
├── 📧 Email/Outreach
├── 🎯 Engage
├── 👥 CRM
├── 📊 Analytics
└── 💬 Messages

Project-Level User sees:
├── 📊 Dashboard (project-specific)
├── 💬 Messages
├── ─────────────────────
├── 📈 SEO
├── 📧 Email/Outreach
├── 🎯 Engage
├── 👥 CRM
└── 📊 Analytics
```

---

## Critical Development Rules

### Package Manager
```bash
# ALWAYS use pnpm
pnpm install
pnpm add <package>
pnpm dev

# NEVER use npm or yarn
```

### Authentication
- **Supabase Auth** - Primary authentication via `supabase.auth.getUser()`
- **JWT Magic Links** - For account setup, proposal viewing, password reset (24h expiry)
- **HttpOnly Cookies** - `sb-access-token` cookie for session

### Database
- **Supabase JS Client ONLY** - Never Drizzle, TypeORM, or Prisma
- **Use Supabase MCP server** for all schema queries and migrations
- **ALWAYS use snake_case** - Database columns, tables, constraints, API request/response fields, DTOs, type definitions
- **NEVER use camelCase** - Prevents mismatches between frontend, backend, and database
- **Key tables:** `user_organizations` (not org_users), `project_api_keys`, `analytics_page_views`

---

## API Routing

| API | URL | Purpose |
|-----|-----|---------|
| **Portal API** | api.uptrademedia.com | Business operations (messages, engage, analytics, SEO, CRM, Commerce) |
| **Signal API** | signal.uptrademedia.com | AI operations only (Echo chat, skills, knowledge) |
| **Netlify** | /.netlify/functions | Legacy auth, some CRUD |

---

## Commerce Module

**Design Doc:** `docs/COMMERCE-MODULE-DESIGN.md`

The Commerce module is a unified system for managing all products, services, classes, events, and sales. It consolidates the previous E-commerce and My Sales modules.

### Core Concepts

| Offering Type | Description | Key Features |
|---------------|-------------|--------------|
| **Products** | Physical/digital goods | Inventory, variants, Shopify sync |
| **Services** | Consultations, work | Booking, duration, Sync integration |
| **Classes** | Scheduled sessions | Capacity, recurring, schedules |
| **Events** | One-time/recurring | Ticketing, capacity, dates |

### Key Integrations

- **Signal Knowledge Base**: All offerings auto-sync to Signal for AI context
- **Echo AI**: Clients with Signal can use Echo to create/modify offerings
- **Files Module**: Product images stored in `Commerce/{type}/{slug}/` folders
- **Forms Module**: Associate intake/booking forms to offerings
- **Sync Module**: Booking flows use Sync for availability
- **Site-Kit**: Checkout and booking components for client sites

### Adaptive UI

Dashboard adapts based on `commerce_settings.enabled_types`:
- Service-only businesses see clean service dashboard
- E-commerce businesses see product catalogs
- Configuration in Project Settings → Commerce

### Commerce Settings (Project Settings)

```
Commerce Types: ☑ Products  ☑ Services  ☐ Classes  ☐ Events
Payment Processors: Stripe (connected), Square, Shopify
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `commerce_offerings` | Unified products/services/classes/events |
| `commerce_categories` | Organization hierarchy |
| `commerce_variants` | Product variants (size, color) |
| `commerce_schedules` | Class/event schedules |
| `commerce_sales` | All transactions (replaces my_sales) |
| `commerce_settings` | Per-project commerce config |
| `customers` | Customers (auto-created from sales) |

### CRM vs Customers

| Module | Purpose | Who Uses |
|--------|---------|----------|
| **CRM** | Prospects, leads, pre-sale pipeline | Uptrade workflow |
| **Outreach** | Email campaigns, syncs contacts | Marketing |
| **Customers** | People who have purchased | Non-Uptrade clients |

Customers are automatically created when a sale is made. Includes purchase history, Gmail thread linking, tags, and notes.

### Feature Tracking IDs

Use these IDs when implementing Commerce features:
- `C-001` to `C-008`: Core Infrastructure
- `C-101` to `C-107`: Integrations
- `C-201` to `C-205`: Sales & Analytics
- `C-301` to `C-305`: AI Features
- `C-401` to `C-405`: Site-Kit Integration
- `C-501` to `C-505`: Advanced Features

---

## Commands

```bash
pnpm dev          # Vite dev server (port 5173)
netlify dev       # With Netlify Functions (port 8888)
pnpm build        # Production build
```
