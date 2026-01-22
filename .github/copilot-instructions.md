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

## 🚨 CRITICAL: Database Schema is Source of Truth

**Before ANY database-related work:**
1. **CHECK** `docs/DATABASE-SCHEMA.md` for current schema
2. **VERIFY** table structure, column types, and relationships
3. **After migrations:** Run `pnpm pull-schema` to update docs

```bash
# Always run after any migration
pnpm pull-schema
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
- **Check `DATABASE-SCHEMA.md`** before any schema work
- **Run `pnpm pull-schema`** after any migration
- **ALWAYS use snake_case** for all database columns, tables, and constraints
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
pnpm pull-schema  # Update DATABASE-SCHEMA.md after migrations
```
