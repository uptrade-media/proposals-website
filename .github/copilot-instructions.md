# Proposals Website - AI Coding Assistant Instructions
**Project:** portal.uptrademedia.com (proposals-website)  
**Last Updated:** January 2025  
**Purpose:** Client portal with proposals, projects, files, messages, and billing

---

## ✅ IMPLEMENTATION STATUS: COMPLETE (100%)

### Backend Implementation Complete
All **39 Netlify Functions** implemented and tested:
- ✅ **Authentication (10 functions)** - Login, OAuth, verify, logout, password reset, support, account setup, magic links
- ✅ **Projects (4 functions)** - List, get, create, update
- ✅ **Proposals (5 functions)** - List, get, create, update, accept
- ✅ **Files (4 functions)** - Upload, list, download, delete (Netlify Blobs)
- ✅ **Messages (4 functions)** - List, send, read, thread
- ✅ **Billing (4 functions)** - Invoices list/create/pay, Square webhooks
- ✅ **Reports (3 functions)** - Dashboard metrics, revenue analytics, project analytics
- ✅ **Admin (6 functions)** - Client management, client creation with email, activity log

### Frontend Integration Complete
All **7 Zustand Stores** wired to backend:
- ✅ `auth-store.js` - Authentication and session management
- ✅ `projects-store.js` - Projects and proposals (9 methods)
- ✅ `files-store.js` - File upload/download (4 methods)
- ✅ `messages-store.js` - Messaging with threading (5 methods)
- ✅ `billing-store.js` - Invoices and payments (4 methods)
- ✅ `reports-store.js` - Analytics (4 methods)
- ✅ Admin.jsx component - Client management UI

### Database Schema Complete
**6 tables** with full relations (Drizzle ORM):
- `contacts` - Users (Google OAuth + password auth)
- `projects` - Client projects with budget tracking
- `proposals` - MDX proposals with signatures
- `files` - Netlify Blobs file storage
- `messages` - Threaded messaging system
- `invoices` - Square payment integration

**See:** `API-TESTING-GUIDE.md` for comprehensive testing documentation

---

## Critical Development Rules

### Package Manager
- **Always use `pnpm`** - Never suggest `npm` or `yarn`
  - ✅ `pnpm install`, `pnpm add`, `pnpm dev`
  - ❌ `npm install` will cause lock file conflicts

### Development Servers
- **Frontend dev**: `pnpm dev` (Vite on port 5173)
- **With functions**: `netlify dev` (port 8888, includes function proxy)
- **Build**: `pnpm build` → `dist/`

### Netlify Functions: Mixed Module Systems
**Both CommonJS and ES modules are supported**:

**CommonJS** (when dependencies require it):
```javascript
const { OAuth2Client } = require('google-auth-library')
exports.handler = async (event) => { }
```
Files: `auth-login.js`, `auth-google.js`, `proposals-sign.js`

**ES Modules** (when using jose or modern packages):
```javascript
import jwt from 'jsonwebtoken'
export async function handler(event) { }
```
Files: `auth-verify.js`, `auth-forgot.js`, `contact-support.js`

### Authentication
- **HttpOnly cookies only** - Session token: `um_session`
- **Never store auth tokens** in localStorage (OK for UI prefs like "remember email")
- **Two auth types**:
  1. Google OAuth users (db-backed, type='google')
  2. Legacy proposal clients (domain-mapped passwords, type='proposal')
- **Edge protection**: Only `/p/*` routes via `netlify/edge-functions/login-auth.js`

### Database
- **Current**: Single table `contacts` in `src/db/schema.ts`
- **Needed**: See `IMPLEMENTATION-PLAN.md` for full schema
- **Migrations**: Run via `drizzle-kit` when implementing features
- **Connection**: Supabase PostgreSQL via Supabase client

---

## Core Architecture

**Stack**: React 19 + Vite 7 + React Router + Zustand + Tailwind 4 + shadcn/ui  
**Backend**: Netlify Functions (mixed) + Edge (Deno) + Blobs  
**Auth**: JWT in HttpOnly cookies, Google OAuth via `google-auth-library`  
**External**: Resend (email), Netlify Blobs (storage), Square (payments - planned)

---

## Working Features (Implementation Details)

### 1. Authentication System ✅

**Functions:**
- `auth-login.js` - Domain-based password login (CommonJS)
- `auth-google.js` - Google OAuth handler (CommonJS)
- `auth-verify.js` - Session verification (ES Module)
- `auth-logout.js` - Logout handler (CommonJS)
- `auth-forgot.js` - Password reset (ES Module)
- `contact-support.js` - Support form (ES Module)

**Edge Function:**
- `login-auth.js` - Protects `/p/*` routes only

**Auth Patterns:**
```javascript
// Google OAuth users
{ type: 'google', userId, email, role, googleId, avatar }

// Domain-mapped proposal clients
{ type: 'proposal', email, slugs: ['row94', 'mbfm'] }

// Verify session in functions
const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET)
```

**Database:**
```typescript
contacts table:
- email, name, company, role (admin/client)
- googleId, avatar (for OAuth users)
- password (bcrypt hash, null for OAuth-only)
- accountSetup ('true'/'false' as text)
```

---

### 2. Proposal System ✅

**Components:**
- `ProposalGate.jsx` - Routes to MDX proposals
- `MDXProposalRenderer.jsx` - Client-side compilation via `@mdx-js/mdx`
- `ProposalLayout.jsx` - Wrapper with signature component
- `ProposalSignature.jsx` - Canvas signature (two-step workflow)

**Functions:**
- `proposals-sign.js` - Stores signatures in Netlify Blobs, sends emails

**MDX Proposals:**
- Located in `src/proposals/content/*.mdx`
- Frontmatter parsed with `gray-matter`
- Compiled in browser using `evaluate()` from `@mdx-js/mdx`
- Custom components in `src/components/mdx/ProposalBlocks.jsx`

**Signature Flow:**
1. Client signs → Stored in Netlify Blobs (`signed-contracts` store)
2. Admin receives email with counter-sign link
3. Admin counter-signs → Both receive fully executed contract
4. All metadata stored as JSON in blobs

---

### 3. Email Notifications ✅

**Service:** Resend (`pnpm add resend`)

**Usage Pattern:**
```javascript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: recipient.email,
  subject: 'Subject',
  html: emailTemplate
})
```

**Environment Variables:**
```bash
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=portal@uptrademedia.com
ADMIN_EMAIL=admin@uptrademedia.com
```

---

## Placeholder Features (No Backend) 🚧

The following components have complete UI but call non-existent APIs:

### Dashboard
- Calls: `/.netlify/functions/admin-clients-list`, `admin-proposals-list`
- Status: 404 - Functions don't exist

### Projects
- Calls: `/projects/*` REST API endpoints
- Status: 404 - No backend implementation

### Files
- Calls: `/files/*` REST API endpoints
- Status: 404 - No upload/download functions

### Messages
- Calls: `/messages/*` REST API endpoints
- Status: 404 - No messaging system

### Billing
- Calls: `/invoices/*` REST API endpoints
- Status: 404 - No Square integration

### Reports
- Calls: `/reports/*` REST API endpoints
- Status: 404 - No analytics backend

### Admin Panel
- Calls: `/.netlify/functions/admin-*` endpoints
- Status: 404 - Admin functions missing

**To implement:** See `IMPLEMENTATION-PLAN.md` for phased build-out (20 weeks, 640 hours)

---

## Common Development Patterns

### Adding a New Netlify Function
```javascript
// netlify/functions/new-feature.js
const jwt = require('jsonwebtoken')

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // 1. Verify auth
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }
  
  // 2. Parse request
  const { param } = JSON.parse(event.body || '{}')
  
  // 3. Database operation using Supabase client
  const supabase = createSupabaseAdmin()
  const { data: result, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('id', param)
  
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
  
  // 4. Return response
  return { statusCode: 200, body: JSON.stringify({ result }) }
}
```

### Environment Variables (Netlify)
```bash
DATABASE_URL=postgresql://...
AUTH_JWT_SECRET=xxx
SESSION_COOKIE_NAME=um_session
GOOGLE_CLIENT_ID=xxx
RESEND_API_KEY=xxx
RESEND_FROM_EMAIL=portal@uptrademedia.com
ADMIN_EMAIL=admin@uptrademedia.com
```

### Frontend Components
```
/src/pages/billing/
  - InvoiceList.jsx
  - InvoiceDetail.jsx
  - PaymentForm.jsx (Square Web Payment SDK)
  
/src/lib/billing-store.js:
  - fetchInvoices()
  - createInvoice()
  - payInvoice()
  - downloadInvoice() (PDF via Square)
```

### Copilot Guidelines for Square
```typescript
// When modifying Square integration:
// 1. Never expose access tokens in frontend code
// 2. Always convert dollar amounts to cents (multiply by 100)
// 3. Store squareInvoiceId for webhook reconciliation
// 4. Implement idempotency for payment requests
// 5. Verify webhook signatures server-side
// 6. Use Square's sandbox environment for testing
// 7. Handle payment failures with clear user messages
// 8. Keep invoice status in sync between Square and database

// Amount conversion pattern:
const amountInCents = Math.round(dollarAmount * 100)
const squareAmount = { amount: amountInCents, currency: 'USD' }
```

---

## 4. Supabase Database Integration

### Purpose
Supabase Postgres database for all application data

### Environment Variables
```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_ANON_KEY
```
*Note: Netlify will populate these automatically during `netlify dev`*

### Client: Supabase JS
Schema defined in `src/db/schema.ts`

### Core Tables

#### Contacts (Users)
```typescript
contacts:
- id: uuid (primary key)
- email: string (unique)
- name: string
- company: string | null
- accountSetup: boolean // KEY: Determines auth flow
- googleId: string | null // For OAuth users
- avatar: string | null // Profile picture URL
- password: string | null // Bcrypt hash, null for Google users
- role: 'client' | 'admin'
- createdAt: timestamp
```

#### Audits
```typescript
audits:
- id: uuid
- contactId: uuid (foreign key)
- targetUrl: string
- scores: jsonb // PageSpeed & SEO metrics
- pdfUrl: string // Netlify Blob path
- status: 'pending' | 'completed' | 'failed'
- createdAt: timestamp

// Managed by audits-store.js
```

#### Proposals (MDX-Based)
```typescript
proposals:
- id: uuid
- contactId: uuid
- title: string
- status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined'
- totalAmount: decimal
- content: jsonb // MDX component tree
- validUntil: date
- acceptedAt: timestamp | null
- createdAt: timestamp

proposal_line_items:
- id: uuid
- proposalId: uuid
- description: string
- quantity: integer
- unitPrice: decimal
- total: decimal
```

**IMPORTANT**: Proposals are **server-rendered MDX**, not DocuSign documents

#### Projects
```typescript
projects:
- id: uuid
- contactId: uuid
- proposalId: uuid | null // Created from accepted proposals
- name: string
- status: 'active' | 'on-hold' | 'completed'
- startDate: date
- endDate: date | null

project_milestones:
- id: uuid
- projectId: uuid
- title: string
- status: 'pending' | 'in-progress' | 'completed'
- dueDate: date
- completedAt: timestamp | null
```

#### Files (Netlify Blobs)
```typescript
files:
- id: uuid
- contactId: uuid
- projectId: uuid | null
- filename: string
- blobPath: string // Netlify Blob storage key
- mimeType: string
- size: integer (bytes)
- category: 'audit' | 'proposal' | 'project' | 'message' | 'invoice'
- uploadedAt: timestamp

// Managed by files-store.js
```

#### Messages
```typescript
messages:
- id: uuid
- contactId: uuid
- threadId: uuid // Groups conversations
- sender: 'client' | 'team'
- content: text
- attachments: jsonb // Array of file IDs
- readAt: timestamp | null
- createdAt: timestamp

// Managed by messages-store.js
```

#### Notifications
```typescript
notifications:
- id: uuid
- contactId: uuid
- type: string // 'audit_complete', 'proposal_created', 'message_received', etc.
- subject: string
- relatedId: uuid | null // Links to audits, proposals, messages, etc.
- readAt: timestamp | null
- sentAt: timestamp // When email was sent
```

### Database Access Pattern
```typescript
// All database operations in Netlify functions use Supabase client
import { createSupabaseAdmin } from './utils/supabase.js'

const supabase = createSupabaseAdmin()

// Example: Fetch user with related data
const { data: contact, error } = await supabase
  .from('contacts')
  .select('*, audits(*)')
  .eq('email', email)
  .single()

// Example: Insert record
const { data, error } = await supabase
  .from('proposals')
  .insert({ title: 'New Proposal', contact_id: contactId })
  .select()
  .single()

// Example: Update record
const { error } = await supabase
  .from('proposals')
  .update({ status: 'sent' })
  .eq('id', proposalId)
```

### Copilot Guidelines for Database
```typescript
// When modifying database code:
// 1. NEVER run migrations from portal.uptrademedia.com
// 2. Migrations ONLY from www.uptrademedia.com
// 3. Always use Drizzle ORM, never raw SQL
// 4. Use transactions for multi-table operations
// 5. Check accountSetup flag before sending emails
// 6. Index foreign keys for query performance
// 7. Use JSONB for flexible schema (scores, content, attachments)
// 8. Always handle null values (googleId, avatar, password, etc.)

// Transaction pattern:
await db.transaction(async (tx) => {
  const proposal = await tx.insert(proposals).values({...})
  await tx.insert(proposal_line_items).values([...])
  await tx.insert(notifications).values({...})
})

// Google OAuth user check:
if (!user.password && user.googleId) {
  // This user can only authenticate via Google
  // Don't show password reset options
}
```

---

## 5. Netlify Blobs (File Storage)

### Purpose
Serverless file storage for:
- Audit PDFs
- Proposal documents (if any)
- Project files
- Message attachments
- Invoice documents

### Implementation
Files stored in Netlify Blobs, metadata in `files` table

### Upload Pattern
```javascript
// In Netlify function
import { getStore } from '@netlify/blobs'

export async function handler(event) {
  const store = getStore('uploads')
  const { filename, base64Data, category } = JSON.parse(event.body)
  
  // Upload to Netlify Blobs
  const blobPath = `${category}/${Date.now()}-${filename}`
  await store.set(blobPath, Buffer.from(base64Data, 'base64'))
  
  // Save metadata to database
  const file = await db.insert(files).values({
    contactId,
    filename,
    blobPath,
    mimeType,
    size,
    category
  }).returning()
  
  return {
    statusCode: 200,
    body: JSON.stringify({ file })
  }
}
```

### Download Pattern
```javascript
// In Netlify function
const store = getStore('uploads')
const fileData = await store.get(blobPath)

return {
  statusCode: 200,
  headers: {
    'Content-Type': mimeType,
    'Content-Disposition': `attachment; filename="${filename}"`
  },
  body: fileData.toString('base64'),
  isBase64Encoded: true
}
```

### Copilot Guidelines for Files
```typescript
// When modifying file operations:
// 1. Always validate file types and sizes before upload
// 2. Sanitize filenames to prevent path traversal
// 3. Store metadata in database for permissions checks
// 4. Use category field to organize storage
// 5. Implement proper access control in download functions
// 6. Clean up orphaned blobs periodically
// 7. Set appropriate MIME types for browser rendering

// File validation:
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/', 'application/pdf', 'application/zip']
if (size > MAX_SIZE) throw new Error('File too large')
if (!ALLOWED_TYPES.some(t => mimeType.startsWith(t))) {
  throw new Error('Invalid file type')
}
```

---

## 6. State Management (Zustand)

### Store Architecture
All stores in `src/lib/*-store.js`:

```javascript
// auth-store.js
- user: object | null
- isAuthenticated: boolean
- login(email, password)
- loginWithGoogle(credential)
- verifySession() // Checks /api/me
- logout()

// audits-store.js
- audits: array
- fetchAudits()
- getAudit(id)
- downloadAuditPdf(id)

// projects-store.js
- projects: array
- proposals: array
- fetchProjects()
- fetchProposals()
- acceptProposal(id)

// files-store.js
- files: array
- uploadFile(file, category)
- downloadFile(id)
- deleteFile(id)

// messages-store.js
- threads: array
- messages: object (keyed by threadId)
- sendMessage(threadId, content, attachments)
- markAsRead(messageId)

// billing-store.js
- invoices: array
- fetchInvoices()
- payInvoice(id)
- downloadInvoice(id)
```

### Axios Configuration
```javascript
// Set up in auth-store.js
axios.interceptors.request.use(config => {
  // Session cookie is automatically sent (HttpOnly)
  return config
})

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Session expired, redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### Copilot Guidelines for State
```typescript
// When modifying Zustand stores:
// 1. Never store sensitive data in Zustand (use HttpOnly cookies)
// 2. Always set loading/error states
// 3. Use axios interceptors for auth
// 4. Clear store state on logout
// 5. Optimistic updates for better UX
// 6. Normalize data structures (avoid nested arrays)

// Pattern for API calls in stores:
fetchData: async () => {
  set({ isLoading: true, error: null })
  try {
    const res = await axios.get('/api/data')
    set({ data: res.data, isLoading: false })
  } catch (error) {
    set({ error: error.message, isLoading: false })
  }
}
```

---

## 7. MDX Proposals (No DocuSign)

### Overview
**DocuSign was removed.** Proposals are now server-rendered MDX documents.

### Proposal Content Structure
```typescript
// Stored as JSONB in proposals.content
{
  components: [
    { type: 'heading', level: 1, text: 'Web Design Proposal' },
    { type: 'paragraph', text: 'Custom website design for...' },
    { type: 'pricing-table', items: [...] },
    { type: 'timeline', milestones: [...] },
    { type: 'signature-block', signerName: '', signedAt: null }
  ]
}
```

### Server-Side Rendering
```javascript
// In Netlify function
import { compile } from '@mdx-js/mdx'
import { renderToString } from 'react-dom/server'

const mdxSource = proposalContentToMDX(proposal.content)
const { default: ProposalComponent } = await compile(mdxSource)
const html = renderToString(<ProposalComponent />)

return {
  statusCode: 200,
  headers: { 'Content-Type': 'text/html' },
  body: html
}
```

### Acceptance Flow
```
1. Client views proposal at /proposals/{id}
2. Clicks "Accept Proposal"
3. Frontend calls /.netlify/functions/accept-proposal
4. Backend:
   - Updates proposal.status = 'accepted'
   - Creates project from proposal
   - Creates invoice if needed
   - Sends confirmation email via Resend
5. Redirects to project dashboard
```

### Copilot Guidelines for Proposals
```typescript
// When modifying proposals:
// 1. Proposals are MDX, not DocuSign documents
// 2. Content is JSONB, not HTML strings
// 3. Server-render for security (prevent XSS)
// 4. Validate proposal structure before saving
// 5. Create project automatically on acceptance
// 6. Track proposal views in audit logs
// 7. Handle line item calculations server-side

// Line item total calculation:
const lineItems = proposalLineItems.map(item => ({
  ...item,
  total: item.quantity * item.unitPrice
}))
const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0)
```

---

## Critical Reminders for Copilot

### Security
- **Never** expose API keys, tokens, or secrets in frontend code
- **Always** validate user input server-side
- **Always** check permissions before database operations
- **Use** HttpOnly cookies for session management
- **Verify** JWT tokens in every Netlify function

### Database
- **Only** run migrations from www.uptrademedia.com
- **Always** use Drizzle ORM (no raw SQL)
- **Check** `accountSetup` flag before sending emails
- **Handle** null values for Google OAuth users

### Email Flow (✅ IMPLEMENTED)
```typescript
// Decision tree for emails:
if (!user.accountSetup) {
  sendAccountSetupEmail() // Includes Google OAuth option + 24h magic link
} else {
  sendMagicLinkEmail() // Auto-login with 24h expiration
}

// Implementation:
// - admin-clients-create.js: Sends setup email on client creation
// - proposals-create.js: Sends appropriate email when proposal assigned
// - auth-validate-setup-token.js: Validates setup tokens
// - auth-complete-setup.js: Completes account setup
// - auth-magic-login.js: Handles magic link authentication
// See EMAIL-NOTIFICATIONS-COMPLETE.md for full details
```

### Error Handling
- **Log** all errors with context for debugging
- **Return** user-friendly error messages
- **Handle** API rate limits gracefully
- **Implement** retry logic for transient failures

### Testing
- **Test** in Square sandbox before production
- **Verify** email delivery in Resend dashboard
- **Check** database migrations in dev first
- **Validate** file uploads with various types/sizes

---

## Common Modification Patterns

### Adding a New Netlify Function
```javascript
// netlify/functions/new-feature.js
import { getAuthUser } from './utils/auth'
import { db } from './utils/db'

export async function handler(event) {
  // 1. Verify authentication
  const user = await getAuthUser(event)
  if (!user) return { statusCode: 401, body: 'Unauthorized' }
  
  // 2. Parse request
  const { param } = JSON.parse(event.body)
  
  // 3. Validate input
  if (!param) return { statusCode: 400, body: 'Missing param' }
  
  // 4. Database operation
  const result = await db.insert(table).values({...})
  
  // 5. Return response
  return {
    statusCode: 200,
    body: JSON.stringify({ result })
  }
}
```

### Adding a New Zustand Store
```javascript
// src/lib/feature-store.js
import { create } from 'zustand'
import axios from 'axios'

export const useFeatureStore = create((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  
  fetchItems: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await axios.get('/api/items')
      set({ items: res.data, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  addItem: async (item) => {
    const res = await axios.post('/api/items', item)
    set(state => ({ items: [...state.items, res.data] }))
  }
}))
```

### Adding Email Notification
```javascript
// In Netlify function
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

// Send email
await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: user.email,
  subject: 'Notification Subject',
  html: emailTemplate
})

// Track in database
await db.insert(notifications).values({
  contactId: user.id,
  type: 'notification_type',
  subject: 'Notification Subject',
  relatedId: itemId,
  sentAt: new Date()
})
```

---

## Deployment Checklist

Before deploying any changes:

- [ ] Test authentication flow (all three modes)
- [ ] Verify email delivery (Resend dashboard)
- [ ] Check Square integration (sandbox first)
- [ ] Test file upload/download
- [ ] Verify database queries (no N+1 problems)
- [ ] Check error handling and logging
- [ ] Review security (no exposed secrets)
- [ ] Test mobile responsiveness
- [ ] Verify MDX proposal rendering
- [ ] Check notification tracking

---

## Support & Documentation

- **Resend Dashboard**: https://resend.com/emails
- **Square Dashboard**: https://developer.squareup.com/
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Netlify Dashboard**: https://app.netlify.com/
- **Drizzle ORM Docs**: https://orm.drizzle.team/

For questions about architecture decisions, refer to this audit document.