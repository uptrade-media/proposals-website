# Contracts Module - Copilot Instructions

**Module:** Contracts (Per-Project Proposals)  
**Location:** Commerce → Sales → Contracts (for projects with services enabled)  
**Last Updated:** January 2026

---

## 🎯 Overview

The **Contracts Module** is a per-project version of the Proposals module, designed for clients to create, send, and manage contracts with their own customers. This is separate from the Proposals module (which is Uptrade Media → Client).

### Key Distinctions

| Feature | Uptrade Proposals | Client Contracts |
|---------|-------------------|------------------|
| **Who Creates** | Uptrade team | Client team |
| **Who Receives** | Our clients | Their customers |
| **Branding** | Uptrade branding | Project branding (brand_primary/brand_secondary) |
| **Components** | Uptrade proposal components | Industry-specific components |
| **URL** | portal.uptrademedia.com/p/xyz | portal.clientdomain.com/p/xyz |
| **AI Skills** | Same ProposalsSkill | Same ProposalsSkill (different constraints) |
| **Location** | Admin sidebar → Proposals | Commerce → Sales → Contracts |

---

## 🏗️ Architecture

### Same Skill, Different Constraints

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ProposalsSkill (Signal AI)                       │
│                     (Same skill for all projects)                        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ loads project constraints
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Contract Constraints (per project)                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ Uptrade Media    │  │ Charter Boats    │  │ Salon/Spa        │       │
│  │ (Proposals)      │  │ (Contracts)      │  │ (Contracts)      │       │
│  │                  │  │                  │  │                  │       │
│  │ • CriticalIssues │  │ • CruisePackage  │  │ • ServiceMenu    │       │
│  │ • ValueStack     │  │ • VesselSelector │  │ • AppointmentPkg │       │
│  │ • ComparisonTbl  │  │ • WeatherPolicy  │  │ • CancellationPol│       │
│  │ • Agency voice   │  │ • Friendly voice │  │ • Friendly voice │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Custom Portal Domains

Each client gets a CNAME for their portal:
```
portal.clientwebsite.com → portal.uptrademedia.com
```

Contract URLs follow the pattern:
```
portal.clientwebsite.com/p/{contract_id}
```

---

## 📍 Sidebar Navigation Changes

### Agency View (Uptrade Media org)

**BEFORE:**
```
Admin Tools ──────────
├── Prospects
├── SEO
├── Commerce
├── Proposals  ← REMOVE
├── Billing    ← REMOVE
└── ...
```

**AFTER:**
```
Admin Tools ──────────
├── Prospects
├── SEO
├── Commerce
│   └── Sales
│       ├── Overview
│       ├── Contracts  ← Uptrade's own contracts/proposals
│       └── Invoices   ← Uptrade's invoices
└── ...
```

### Client Org View

**BEFORE:**
```
Project Name ──────────
├── Dashboard
├── SEO
├── Commerce
└── ...

Org Services ──────────
├── Messages
├── Proposals  ← From Uptrade
├── Billing    ← From Uptrade
└── ...
```

**AFTER:**
```
Project Name ──────────
├── Dashboard
├── SEO
├── Commerce
│   └── Sales
│       ├── Contracts  ← Their own contracts
│       └── Invoices   ← Their invoices
└── ...

Uptrade Media ──────────  ← NEW COLLAPSIBLE SECTION
├── Proposals 📌         ← With notification badge
├── Invoices  📌         ← With notification badge
└── Messages             ← Already exists
```

### Notification Requirements

The "Uptrade Media" section needs notification badges:
- **Proposals**: Unread proposals (status: sent, not viewed)
- **Invoices**: Unpaid invoices (status: pending or overdue)

---

## 🎨 Project Branding

Contracts use project colors and branding:

```typescript
interface ProjectBranding {
  brand_primary: string    // e.g., "#1e3a5f"
  brand_secondary: string  // e.g., "#c9a227"
  logo_url?: string        // Project logo
  name: string             // Project/business name
}
```

### Contract Theming

```tsx
// Contract page loads project branding
const ContractPage = ({ contractId }) => {
  const { project } = useContract(contractId)
  
  return (
    <div 
      style={{ 
        '--brand-primary': project.brand_primary,
        '--brand-secondary': project.brand_secondary 
      }}
    >
      <ContractHeader logo={project.logo_url} name={project.name} />
      <ContractContent />
      <SignatureBlock />
      <PoweredByUptrade />  {/* Always visible at bottom */}
    </div>
  )
}
```

### "Powered by Uptrade Media"

Every contract includes a footer:
```tsx
<footer className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
  <a href="https://uptrademedia.com" target="_blank" rel="noopener noreferrer">
    Powered by Uptrade Media
  </a>
</footer>
```

---

## 🧩 Component Architecture

### Directory Structure

```
src/components/contracts/
├── core/                           # Shared across all industries
│   ├── ContractHero.jsx           # Header with logo, title
│   ├── SignatureBlock.jsx         # E-signature capture
│   ├── PricingTable.jsx           # Line items, totals
│   ├── PaymentSchedule.jsx        # Deposit milestones
│   ├── DateSelector.jsx           # Availability calendar
│   ├── TermsCheckbox.jsx          # Accept terms
│   ├── PoweredByUptrade.jsx       # Footer attribution
│   └── RichTextSection.jsx        # For non-Signal projects
│
├── uptrade/                        # Uptrade proposal components
│   ├── CriticalIssues.jsx
│   ├── ValueStack.jsx
│   ├── ComparisonTable.jsx
│   ├── WebsitePortfolio.jsx
│   ├── BonusSection.jsx
│   └── MetricHighlight.jsx
│
├── charter-boats/                  # Industry: Charter boats
│   ├── CruisePackageSelector.jsx
│   ├── VesselSelector.jsx
│   ├── CateringMenuBuilder.jsx
│   ├── WeatherPolicyCard.jsx
│   └── GuestCountSelector.jsx
│
├── events/                         # Industry: Event venues
│   ├── VenueDetails.jsx
│   ├── EventTimeline.jsx
│   ├── VendorRequirements.jsx
│   └── LiabilityWaiver.jsx
│
├── services/                       # Industry: Service businesses
│   ├── ServicePackageSelector.jsx
│   ├── SessionDurationPicker.jsx
│   ├── RecurringSchedule.jsx
│   └── CancellationPolicy.jsx
│
└── construction/                   # Industry: Contractors
    ├── ScopeOfWorkBuilder.jsx
    ├── MaterialsEstimate.jsx
    ├── MilestonePayments.jsx
    └── ChangeOrderSection.jsx
```

### Component Registry

```typescript
// Contract components are registered per industry
const COMPONENT_REGISTRY = {
  core: ['ContractHero', 'SignatureBlock', 'PricingTable', 'PaymentSchedule'],
  uptrade: ['CriticalIssues', 'ValueStack', 'ComparisonTable', 'BonusSection'],
  'charter-boats': ['CruisePackageSelector', 'VesselSelector', 'WeatherPolicyCard'],
  'events': ['VenueDetails', 'EventTimeline', 'LiabilityWaiver'],
  'services': ['ServicePackageSelector', 'SessionDurationPicker', 'RecurringSchedule'],
}

// Projects specify their industry in settings
// Available components = core + industry-specific
```

---

## 🤖 AI Contract Creation (Signal)

### For Projects WITH Signal Enabled

Full AI-powered contract creation:

```typescript
// Signal ContractsSkill
const ContractsSkill = {
  name: 'contracts',
  
  tools: {
    // Analyze customer needs and generate contract draft
    draftContract: async (params) => {
      const projectConstraints = await loadProjectConstraints(params.projectId)
      const customerContext = params.customerInfo
      
      return await intelligence.generate({
        systemPrompt: buildContractPrompt(projectConstraints),
        userPrompt: `Draft a ${projectConstraints.documentLabel} for ${customerContext}`,
        tools: projectConstraints.allowedComponents,
      })
    },
    
    // Generate pricing recommendations
    suggestPricing: async (params) => { ... },
    
    // Generate terms based on business type
    generateTerms: async (params) => { ... },
  }
}
```

### For Projects WITHOUT Signal

Rich text editor fallback:

```tsx
const ContractEditor = ({ hasSignal }) => {
  if (hasSignal) {
    return <AIContractBuilder />
  }
  
  // Rich text editor for manual contract creation
  return (
    <div>
      <ContractHero editable />
      <RichTextEditor 
        placeholder="Describe your services, terms, and conditions..."
        toolbar={['bold', 'italic', 'heading', 'list', 'link']}
      />
      <PricingTable editable />
      <SignatureBlock />
    </div>
  )
}
```

---

## 💾 Database Schema

### ⚠️ IMPORTANT: Contracts Use the Proposals Table

**Contracts are stored in the existing `proposals` table** with `doc_type = 'contract'`. This unified approach allows:
- Sharing existing proposal infrastructure
- Same MDX rendering pipeline
- Same signature capture system
- Same analytics tracking

### Key Columns for Contracts

The following columns were added to `proposals` table (see migration `20260112_proposals_commerce_integration.sql`):

```sql
-- Distinguish proposals from contracts
doc_type VARCHAR(20) DEFAULT 'proposal' CHECK (doc_type IN ('proposal', 'contract'))

-- Link to commerce service (for AI context)
offering_id UUID REFERENCES commerce_offerings(id) ON DELETE SET NULL

-- Magic link for public viewing (contracts only)
access_token TEXT
access_token_expires TIMESTAMPTZ

-- External recipient info (for contracts to non-portal users)
recipient_name VARCHAR(255)
recipient_email VARCHAR(255)
recipient_company VARCHAR(255)
```

### Scoping Rules

| doc_type | org_id | project_id | Description |
|----------|--------|------------|-------------|
| `proposal` | SET | NULL | Uptrade proposal to client org |
| `contract` | NULL | SET | Client contract to their customer |

### Querying Contracts

```typescript
// Get contracts for a project (not org-level proposals)
const { data } = await supabase
  .from('proposals')
  .select('*')
  .eq('project_id', projectId)
  .eq('doc_type', 'contract')
  .order('created_at', { ascending: false })

// Get proposals for an org (Uptrade to client)
const { data } = await supabase
  .from('proposals')
  .select('*')
  .eq('org_id', orgId)
  .eq('doc_type', 'proposal')
```

### Commerce Integration

Contracts can link to `commerce_offerings` for service context:

```typescript
// Create contract from commerce service
const contract = await commerceApi.createContract(projectId, {
  offering_id: selectedService.id,
  title: `${selectedService.name} Agreement`,
  recipient_name: 'John Doe',
  recipient_email: 'john@example.com',
  total_amount: selectedService.price,
  metadata: {
    service: selectedService
  }
})
```

### Magic Link Flow

1. **Create Contract** → Generates `access_token` (UUID)
2. **Send Contract** → Email with: `https://portal.uptrademedia.com/c/{access_token}`
3. **View Contract** → Public page verifies token and expiry
4. **Sign Contract** → Updates `signed_at`, `client_signed_name`
5. **Notify Creator** → Email sent to contract creator

---

## 🔗 Invoice Integration

When a contract is signed with payment required:

1. **Auto-create invoice** in `commerce_sales`
2. **Link contract to invoice** via `invoice_id`
3. **Send payment link** to recipient
4. **Track payment status** on contract

```typescript
const handleContractSigned = async (contract: Contract) => {
  if (contract.total > 0) {
    // Create invoice from contract
    const invoice = await createInvoiceFromContract(contract, {
      paymentProcessor: projectSettings.paymentProcessor,  // stripe/square
      dueDate: addDays(new Date(), 7),
    })
    
    // Update contract with invoice reference
    await updateContract(contract.id, { invoice_id: invoice.id })
    
    // Send payment request email
    await sendPaymentRequestEmail(contract.recipient_email, invoice)
  }
}
```

---

## 🛣️ Routes & Pages

### Frontend Routes

```typescript
// Commerce routes with Contracts
{
  path: 'commerce',
  children: [
    { path: '', element: <CommerceOverview /> },
    { path: 'offerings', element: <OfferingsList /> },
    { path: 'offerings/:id', element: <OfferingDetail /> },
    { path: 'sales', children: [
      { path: '', element: <SalesOverview /> },
      { path: 'contracts', element: <ContractsList /> },
      { path: 'contracts/new', element: <ContractCreate /> },
      { path: 'contracts/:id', element: <ContractDetail /> },
      { path: 'contracts/:id/edit', element: <ContractEdit /> },
      { path: 'invoices', element: <InvoicesList /> },
      { path: 'invoices/:id', element: <InvoiceDetail /> },
    ]},
  ]
}

// Public contract view (customer-facing)
{ path: 'p/:contractId', element: <PublicContractView /> }
```

### Public Contract View

The public view at `portal.clientdomain.com/p/{id}`:

```tsx
const PublicContractView = () => {
  const { contractId } = useParams()
  const { contract, project, loading } = usePublicContract(contractId)
  
  // Apply project branding
  useEffect(() => {
    if (project) {
      document.documentElement.style.setProperty('--brand-primary', project.brand_primary)
      document.documentElement.style.setProperty('--brand-secondary', project.brand_secondary)
    }
  }, [project])
  
  return (
    <div className="min-h-screen bg-background">
      <ContractHeader logo={project.logo_url} businessName={project.name} />
      <ContractContent content={contract.content} />
      {contract.status === 'sent' && (
        <SignatureCapture 
          onSign={handleSign}
          termsAccepted={termsAccepted}
        />
      )}
      <PoweredByUptrade />
    </div>
  )
}
```

---

## 📋 Feature Visibility Rules

### Contracts Tab Visibility

Contracts appear in Commerce → Sales ONLY for projects with services enabled:

```typescript
// In Commerce sidebar/navigation
const showContractsTab = useMemo(() => {
  const enabledTypes = commerceSettings?.enabled_types || []
  return enabledTypes.includes('services') || enabledTypes.includes('events')
}, [commerceSettings])
```

### Sidebar Logic

```typescript
// Client org sidebar - "Uptrade Media" section
const UptradeSectionItems = [
  { 
    id: 'uptrade-proposals', 
    label: 'Proposals', 
    icon: Send,
    badge: unreadProposalsCount,  // From Uptrade TO them
    route: '/proposals'
  },
  { 
    id: 'uptrade-invoices', 
    label: 'Invoices', 
    icon: DollarSign,
    badge: unpaidInvoicesFromUptrade,  // Invoices FROM Uptrade
    route: '/billing'
  },
]

// Render as collapsible section
<CollapsibleSection title="Uptrade Media" defaultOpen={hasNotifications}>
  {UptradeSectionItems.map(item => <SidebarItem {...item} />)}
</CollapsibleSection>
```

---

## 🔔 Notification System

### Proposal/Invoice Notifications for Clients

```typescript
// Notification types for "Uptrade Media" section
interface ClientNotifications {
  unreadProposals: number    // Proposals sent but not viewed
  pendingSignatures: number  // Proposals viewed but not signed
  unpaidInvoices: number     // Invoices pending/overdue
}

// Fetch on sidebar mount
const fetchClientNotifications = async (orgId: string) => {
  const [proposals, invoices] = await Promise.all([
    supabase.from('proposals')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'sent')
      .is('viewed_at', null),
    supabase.from('invoices')
      .select('id')
      .eq('org_id', orgId)
      .in('status', ['pending', 'overdue']),
  ])
  
  return {
    unreadProposals: proposals.data?.length || 0,
    unpaidInvoices: invoices.data?.length || 0,
  }
}
```

---

## 🚀 Implementation Phases

### Phase 1: Database & Backend
- [ ] Create `contracts` table
- [ ] Add `contract_constraints` to projects
- [ ] Create `contract_templates` table
- [ ] Portal API endpoints for contracts CRUD

### Phase 2: Core Components
- [ ] Build core contract components (Hero, Signature, Pricing)
- [ ] Build RichTextSection for non-Signal projects
- [ ] Build PoweredByUptrade footer
- [ ] Implement project branding theming

### Phase 3: Contract Creation
- [ ] Contract creation page (with/without Signal)
- [ ] Template selection
- [ ] Variable input form
- [ ] Preview mode

### Phase 4: Public View & Signing
- [ ] Public contract view page
- [ ] Signature capture component
- [ ] Terms acceptance flow
- [ ] Email notifications

### Phase 5: Invoice Integration
- [ ] Auto-create invoice on signature
- [ ] Payment request flow
- [ ] Payment status tracking

### Phase 6: Sidebar Restructuring
- [ ] Move Uptrade proposals/billing to Commerce for agency
- [ ] Add "Uptrade Media" collapsible section for clients
- [ ] Implement notification badges
- [ ] Update navigation logic

### Phase 7: Industry Components
- [ ] Build industry-specific component libraries
- [ ] Implement component registry
- [ ] Signal constraint generation for new projects

---

## 📝 Key Implementation Notes

1. **Same Skill, Different Constraints**: The ProposalsSkill handles both Uptrade proposals and client contracts - just loads different constraints per project.

2. **Non-Signal Fallback**: Projects without Signal use a rich text editor with core components only.

3. **Always "Powered by Uptrade"**: Every contract includes attribution footer that cannot be removed.

4. **Project Branding**: Contracts use `brand_primary` and `brand_secondary` from project settings.

5. **Custom Domains**: Each client can have `portal.theirsite.com` CNAME pointing to our portal.

6. **Invoice Auto-Creation**: When a contract with payment is signed, an invoice is automatically created.

7. **Notification Badges**: The "Uptrade Media" section shows notification counts for unread proposals and unpaid invoices.

8. **Visibility Rules**: Contracts tab only appears for projects with services or events enabled in commerce settings.

---

*Contracts = Client's proposals to their customers. Same AI skill, different branding.*
