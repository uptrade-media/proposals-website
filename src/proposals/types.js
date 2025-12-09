/**
 * Proposal Type Definitions
 * 
 * Each proposal type has:
 * - id: Unique identifier
 * - label: Human-readable name
 * - description: Short description for AI/UI
 * - icon: Lucide icon name
 * - sections: Array of section types to include
 * - suggestedComponents: Components commonly used
 * - aiPromptContext: Additional context for AI generation
 */

export const PROPOSAL_TYPES = {
  brand_website: {
    id: 'brand_website',
    label: 'New Brand + Website',
    shortLabel: 'Brand + Site',
    description: 'Complete brand creation with custom website for new businesses or full rebrands',
    icon: 'Sparkles',
    color: 'purple',
    sections: [
      'hero',
      'executive_summary',
      'brand_discovery',
      'visual_identity',
      'website_build',
      'content_strategy',
      'seo_foundations',
      'timeline',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'BrandDiscoverySection',
      'VisualIdentityDeliverables',
      'WebsiteFeatureGrid',
      'ContentPackage',
      'SEOFoundations',
      'PricingTiers',
      'ProjectTimeline'
    ],
    aiPromptContext: `This is a full brand creation + website build. The client is either starting fresh or doing a complete rebrand. Include:
- Brand discovery and positioning workshop
- Naming assistance (if needed)
- Logo design with variations
- Brand guidelines/style guide
- Color palette, typography, visual system
- Custom website design and development
- Initial content writing and on-page SEO
- Technical SEO foundations baked in`
  },

  website_rebuild: {
    id: 'website_rebuild',
    label: 'Website Overhaul',
    shortLabel: 'Site Rebuild',
    description: 'Full redesign and rebuild for existing brands with outdated or underperforming sites',
    icon: 'RefreshCw',
    color: 'blue',
    sections: [
      'hero',
      'executive_summary',
      'current_state_audit',
      'critical_issues',
      'proposed_solution',
      'website_architecture',
      'performance_goals',
      'timeline',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'CurrentStateAudit',
      'CriticalIssues',
      'BeforeAfterComparison',
      'WebsiteArchitecture',
      'PerformanceGoals',
      'TechStackOverview',
      'PricingTiers',
      'ProjectTimeline'
    ],
    aiPromptContext: `This is a website overhaul for an existing brand. The client has a site but it's outdated, slow, or not converting. Include:
- Audit of current site issues (performance, UX, SEO)
- Competitive analysis positioning
- Full redesign in modern stack (Next.js/Vite)
- Performance and Lighthouse score improvements
- Structured data and technical SEO cleanup
- Information architecture optimization
- Content tightening and conversion focus
- Migration plan from old to new`
  },

  local_seo: {
    id: 'local_seo',
    label: 'Local SEO Expansion',
    shortLabel: 'Local SEO',
    description: 'City/county-specific pages and local search dominance package',
    icon: 'MapPin',
    color: 'green',
    sections: [
      'hero',
      'executive_summary',
      'local_opportunity',
      'keyword_research',
      'location_pages',
      'schema_strategy',
      'timeline',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'LocalOpportunityMap',
      'KeywordResearchTable',
      'LocationPageStrategy',
      'SchemaMarkupPlan',
      'InternalLinkingDiagram',
      'CompetitorGapAnalysis',
      'PricingTable',
      'ProjectTimeline'
    ],
    aiPromptContext: `This is a Local SEO expansion package, often sold as phase 2 after a core site. Common for law firms and home services. Include:
- City and county-specific service pages
- Keyword research based on SEMrush data
- Schema markup strategy for local business
- Internal linking architecture
- Google Business Profile optimization
- Local citations and directory strategy
- Content outlines for each location page`
  },

  seo_retainer: {
    id: 'seo_retainer',
    label: 'SEO & Content Retainer',
    shortLabel: 'SEO Retainer',
    description: 'Ongoing monthly SEO and content growth program',
    icon: 'TrendingUp',
    color: 'emerald',
    sections: [
      'hero',
      'executive_summary',
      'current_performance',
      'growth_strategy',
      'monthly_deliverables',
      'reporting_cadence',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'CurrentPerformanceSnapshot',
      'GrowthStrategyRoadmap',
      'MonthlyDeliverablesGrid',
      'ContentCalendar',
      'BacklinkStrategy',
      'ReportingDashboardPreview',
      'RetainerPricing',
      'KPITargets'
    ],
    aiPromptContext: `This is an ongoing SEO and content retainer, billed monthly. Include:
- Current performance baseline with metrics
- 6-12 month growth roadmap
- Monthly deliverables breakdown:
  - Content strategy and new pages/blogs
  - On-page updates and technical cleanup
  - Schema updates and structured data
  - Backlink outreach and local citations
  - Call tracking integration
  - Keyword expansion strategy
- Monthly reporting and communication cadence
- KPI targets and success metrics`
  },

  paid_ads: {
    id: 'paid_ads',
    label: 'Paid Ads + Lead Engine',
    shortLabel: 'Paid Ads',
    description: 'Google Ads and Meta campaigns with landing pages and conversion tracking',
    icon: 'Megaphone',
    color: 'orange',
    sections: [
      'hero',
      'executive_summary',
      'campaign_strategy',
      'ad_platforms',
      'landing_pages',
      'conversion_tracking',
      'testing_plan',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'CampaignStrategyOverview',
      'PlatformBreakdown',
      'LandingPageConcepts',
      'ConversionTrackingSetup',
      'ABTestingPlan',
      'AdCreativeExamples',
      'BudgetAllocation',
      'RetainerPricing'
    ],
    aiPromptContext: `This is a paid advertising and lead generation package. Include:
- Campaign strategy and goals
- Platform recommendations (Google Ads, Meta, etc.)
- Ad creative concepts and examples
- Landing page design and development
- Conversion tracking setup (GA4, call tracking)
- A/B testing plan for headlines, offers, forms
- Monthly optimization and reporting
- Budget recommendations and expected ROI`
  },

  media_package: {
    id: 'media_package',
    label: 'Media Package',
    shortLabel: 'Photo/Video',
    description: 'Professional photography, video production, and drone footage',
    icon: 'Video',
    color: 'pink',
    sections: [
      'hero',
      'executive_summary',
      'creative_vision',
      'shoot_schedule',
      'deliverables',
      'usage_rights',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'CreativeVisionBoard',
      'ShootSchedule',
      'DeliverablesList',
      'AssetFormats',
      'UsageRights',
      'EquipmentOverview',
      'PricingBreakdown',
      'ProductionTimeline'
    ],
    aiPromptContext: `This is a media production package (photo, video, drone). Include:
- Creative vision and style direction
- Shoot day schedule and logistics
- Deliverables breakdown:
  - Brand video, service explainers
  - Testimonial videos, case studies
  - Property tours, drone footage
  - B-roll library
- Edit packages for web, social, ads
- File formats and specifications
- Usage rights and licensing
- Typically scoped as X shoot days + Y finished assets`
  },

  web_app: {
    id: 'web_app',
    label: 'Custom Portal / Web App',
    shortLabel: 'Web App',
    description: 'Custom admin portals, client dashboards, and web applications',
    icon: 'LayoutDashboard',
    color: 'indigo',
    sections: [
      'hero',
      'executive_summary',
      'requirements_overview',
      'user_flows',
      'feature_breakdown',
      'tech_stack',
      'security',
      'timeline',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'RequirementsMatrix',
      'UserFlowDiagrams',
      'FeatureBreakdown',
      'TechStackOverview',
      'SecurityCompliance',
      'IntegrationsList',
      'DevelopmentPhases',
      'PricingTiers'
    ],
    aiPromptContext: `This is a custom web application or portal build. Include:
- Requirements and user needs overview
- User types and permission levels
- Feature breakdown by module:
  - Admin and client logins
  - Dashboard and reporting
  - Proposals, billing, messaging
  - Document management
  - CRM integration
  - Payment processing
  - AI-powered features
- Technology stack recommendations
- Security and compliance considerations
- Development phases and milestones
- Often sold as phase 2 after marketing site proves itself`
  },

  landing_page: {
    id: 'landing_page',
    label: 'Campaign Landing Page',
    shortLabel: 'Landing Page',
    description: 'Single conversion-focused page for campaigns or lead magnets',
    icon: 'MousePointerClick',
    color: 'cyan',
    sections: [
      'hero',
      'executive_summary',
      'campaign_context',
      'page_structure',
      'conversion_elements',
      'integration',
      'timeline',
      'investment',
      'next_steps'
    ],
    suggestedComponents: [
      'CampaignContext',
      'PageWireframe',
      'ConversionElements',
      'FormIntegration',
      'TrackingSetup',
      'ABTestingPlan',
      'QuickPricing',
      'FastTimeline'
    ],
    aiPromptContext: `This is a single landing page for a specific campaign or funnel. Include:
- Campaign context and goals
- Target audience and offer
- Page structure and sections
- Conversion elements (forms, CTAs, social proof)
- Integration requirements (email, CRM)
- Tracking and analytics setup
- Usually paired with ads or email sequences
- Fast turnaround timeline (1-2 weeks)`
  }
}

// ============================================
// AI PROMPT TEMPLATES
// ============================================

/**
 * Base system prompt for all proposal generation
 */
export const AI_SYSTEM_PROMPT = `You are an expert proposal writer for Uptrade Media, a boutique digital agency specializing in web design, development, SEO, and marketing for small-to-medium businesses, particularly professional services (law firms, medical practices, home services).

Your proposals are:
- Professional yet conversational
- Data-driven with specific metrics when available
- Focused on outcomes and ROI
- Clear about what's included AND what's not
- Legally binding documents that protect both parties

Writing Style:
- Use "we" for Uptrade Media
- Address the client directly as "you" or by name
- Be specific, not vague ("increase organic traffic by 40%" not "improve your online presence")
- Include concrete deliverables with clear descriptions
- Break down complex work into understandable phases

Structure every proposal with:
1. Executive Summary (hook them in 2 paragraphs)
2. Problem Statement (show you understand their pain)
3. Proposed Solution (the vision and transformation)
4. Scope & Deliverables (detailed breakdown of what they get)
5. Timeline (realistic phases with milestones)
6. Investment (fixed price + optional add-ons)
7. Terms & Conditions (legal protections)
8. Next Steps (clear CTA to accept)

Always include pricing as a FIXED amount (not hourly estimates).
Always include add-ons as optional enhancements.
Always include clear exclusions to prevent scope creep.`

/**
 * Generate the full AI prompt for a proposal
 * @param {string} typeId - The proposal type ID
 * @param {object} clientData - Client information
 * @param {object} projectData - Project details
 * @returns {string} Complete prompt for AI generation
 */
export function generateProposalPrompt(typeId, clientData, projectData) {
  const type = PROPOSAL_TYPES[typeId]
  if (!type) throw new Error(`Unknown proposal type: ${typeId}`)

  const template = AI_PROMPT_TEMPLATES[typeId]
  if (!template) throw new Error(`No template for type: ${typeId}`)

  // Build the user prompt
  const userPrompt = `
## Proposal Request

**Type:** ${type.label}
**Client:** ${clientData.name}${clientData.company ? ` (${clientData.company})` : ''}
**Industry:** ${clientData.industry || 'Not specified'}

### Client Context
${projectData.context || 'No additional context provided.'}

### Goals
${projectData.goals || 'Not specified'}

### Challenges/Pain Points
${projectData.challenges || 'Not specified'}

### Budget Guidance
${projectData.budget || 'To be determined based on scope'}

### Timeline Preference
${projectData.timeline || 'Standard timeline'}

### Additional Notes
${projectData.notes || 'None'}

${projectData.auditData ? `
### Audit Results (Include in AuditCallout)
- Performance Score: ${projectData.auditData.performance}/100
- SEO Score: ${projectData.auditData.seo}/100
- Accessibility Score: ${projectData.auditData.accessibility}/100
- Best Practices: ${projectData.auditData.bestPractices}/100
- Key Issues: ${projectData.auditData.issues?.join(', ') || 'None flagged'}
` : ''}

---

## Type-Specific Instructions

${type.aiPromptContext}

---

## Template Structure

${template}

---

## Output Format

Generate the proposal content as structured JSON matching this schema:
\`\`\`json
{
  "title": "Proposal title",
  "subtitle": "One-line value proposition",
  "sections": [
    {
      "type": "executive_summary",
      "title": "Section title",
      "content": "Section content with markdown formatting"
    }
  ],
  "deliverables": [
    {
      "name": "Deliverable name",
      "description": "What it is",
      "why": "Why it matters",
      "includes": ["Item 1", "Item 2"]
    }
  ],
  "phases": [
    {
      "name": "Phase name",
      "duration": "X weeks",
      "milestones": ["Milestone 1", "Milestone 2"]
    }
  ],
  "investment": {
    "total": 15000,
    "breakdown": [
      { "item": "Item name", "amount": 5000 }
    ]
  },
  "addOns": [
    {
      "name": "Add-on name",
      "price": 2500,
      "description": "What it adds"
    }
  ],
  "exclusions": ["What's NOT included"],
  "paymentSchedule": [
    { "milestone": "Upon signing", "percent": 50, "amount": 7500 }
  ],
  "validUntil": "YYYY-MM-DD",
  "estimatedStart": "X weeks from acceptance"
}
\`\`\`
`

  return {
    system: AI_SYSTEM_PROMPT,
    user: userPrompt
  }
}

/**
 * Type-specific prompt templates with section guidance
 */
export const AI_PROMPT_TEMPLATES = {
  brand_website: `
### Brand + Website Proposal Structure

**Executive Summary:**
Hook them with the transformation - from invisible/inconsistent brand to market leader with cohesive identity and high-converting website.

**Problem Statement:**
- Brand confusion or lack of recognition
- Inconsistent visual identity across touchpoints
- No website or embarrassingly outdated one
- Losing deals because they look less credible than competitors

**Brand Discovery Section:**
Detail the brand discovery workshop process:
- Stakeholder interviews
- Competitive analysis
- Brand personality/archetype exercise
- Positioning statement development

**Visual Identity Deliverables:**
- Primary logo + variations (stacked, horizontal, icon-only)
- Color palette with hex codes and usage guidelines
- Typography system (headings, body, accents)
- Brand guidelines PDF (15-20 pages)
- Social media templates
- Business card design
- Email signature template

**Website Build Section:**
- Custom design (no templates)
- Responsive across all devices
- Core pages: Home, About, Services, Contact
- Blog/Resource section setup
- On-page SEO foundations
- Speed optimization
- Analytics integration

**Recommended Pricing:**
- Small brand + 5-page site: $8,000-12,000
- Full brand + 8-10 page site: $15,000-25,000
- Enterprise brand + custom site: $30,000+

**Typical Add-ons:**
- Additional logo variations: $500-1,000
- Social media kit expansion: $1,500
- Video brand intro: $3,000-5,000
- Photography session: $2,000-4,000
`,

  website_rebuild: `
### Website Overhaul Proposal Structure

**Executive Summary:**
Lead with audit findings - their current site is costing them money. Position the rebuild as an investment with measurable ROI.

**REQUIRED: Audit Callout Section**
If audit data is provided, create an AuditCallout comparing:
- Current Performance score → Target (95+)
- Current SEO score → Target (100)
- Current accessibility → Target (95+)
- Load time reduction targets

**Critical Issues Section:**
List 5-8 specific problems from the audit:
- Slow load times (X seconds)
- Mobile usability issues
- Missing structured data
- Broken links or 404s
- Outdated content
- Security vulnerabilities
- Poor Core Web Vitals

**Proposed Solution:**
Frame as a complete transformation:
- Modern tech stack (Next.js/Vite, not WordPress)
- Performance-first architecture
- Conversion-focused design
- SEO cleanup and foundations

**Website Architecture Section:**
- Sitemap and page structure
- User flow optimization
- Content hierarchy recommendations
- CTA placement strategy

**Performance Goals:**
Set measurable targets:
- Lighthouse Performance: 95+
- Time to Interactive: <2s
- First Contentful Paint: <1s
- Core Web Vitals: All green

**Recommended Pricing:**
- Small site (5-7 pages) rebuild: $8,000-12,000
- Medium site (10-15 pages) rebuild: $15,000-25,000
- Large/complex rebuild: $25,000-50,000

**Typical Add-ons:**
- Content rewriting: $150-300/page
- Professional photography: $2,000-4,000
- SEO retainer (ongoing): $1,500-3,000/month
- Maintenance package: $300-500/month
`,

  local_seo: `
### Local SEO Expansion Proposal Structure

**Executive Summary:**
Position as market expansion - they'll dominate search in surrounding cities/counties, capturing leads competitors don't even know exist.

**Local Opportunity Section:**
- List target cities/areas with search volume
- Show keyword opportunities by location
- Competitor presence analysis
- Map/visual of service area coverage

**Keyword Research Section:**
Present a table of opportunities:
| Location | Service + City | Monthly Volume | Difficulty | Opportunity |
Example: "Personal Injury Lawyer Dallas" - 2,400/mo - Medium - High

**Location Pages Strategy:**
- Number of pages to create
- Content structure for each (500-800 words)
- Unique local content strategy (not just find/replace city name)
- Local testimonials and case studies integration
- Schema markup for each location

**Technical SEO Components:**
- LocalBusiness schema for each location
- Internal linking architecture
- XML sitemap updates
- Google Business Profile optimization per location
- Local citation building strategy

**Recommended Pricing:**
- 5-10 location pages: $3,000-5,000
- 10-20 location pages: $5,000-8,000
- 20+ location pages: $8,000-15,000
- Plus ongoing SEO retainer recommended

**Typical Add-ons:**
- GBP management: $500/location
- Local citation building: $1,000-2,000
- Monthly content updates: $500-1,000/month
- Call tracking setup: $500 + $100/month
`,

  seo_retainer: `
### SEO & Content Retainer Proposal Structure

**Executive Summary:**
Position as ongoing growth partnership, not just maintenance. Show the compounding value of consistent SEO investment.

**Current Performance Snapshot:**
- Organic traffic trends (6-12 months)
- Keyword rankings summary
- Top performing pages
- Conversion rates from organic
- Competitor comparison

**Growth Strategy Roadmap:**
6-12 month plan with quarterly goals:
- Q1: Foundation and quick wins
- Q2: Content expansion
- Q3: Authority building
- Q4: Scaling and optimization

**Monthly Deliverables Grid:**
Create a clear breakdown of what's included each month:
- X new blog posts/pages
- X pages optimized/updated
- Technical SEO audit items
- Schema updates
- Backlink outreach
- Reporting and strategy call

**Content Calendar Preview:**
Show example topics for first 3 months based on keyword research.

**Reporting & Communication:**
- Monthly performance reports
- Keyword ranking tracking
- Traffic and conversion trends
- Strategy call schedule
- Slack/email access

**Recommended Pricing:**
- Starter (small sites): $1,500-2,000/month
- Growth (medium sites): $2,500-4,000/month
- Enterprise: $5,000-10,000/month
Minimum 6-month commitment recommended

**Typical Add-ons:**
- Premium backlink acquisition: $1,000-2,000/month
- Video content creation: $500-1,500/video
- Paid ads management: $1,000-2,000/month
- Advanced analytics setup: $1,500 one-time
`,

  paid_ads: `
### Paid Ads + Lead Engine Proposal Structure

**Executive Summary:**
Position as a complete lead generation system, not just ad management. They're buying leads, not clicks.

**Campaign Strategy Section:**
- Campaign objectives and KPIs
- Target audience definition
- Geographic targeting
- Budget allocation by platform
- Expected lead volume and cost-per-lead

**Platform Breakdown:**
For each platform (Google Ads, Meta, etc.):
- Campaign structure
- Targeting strategy
- Ad types (Search, Display, Video, etc.)
- Estimated performance

**Landing Page Section:**
- Number of landing pages needed
- Conversion-focused design approach
- A/B testing plan
- Form strategy and lead capture

**Conversion Tracking Setup:**
- Google Analytics 4 configuration
- Conversion tracking pixels
- Call tracking integration
- CRM integration (if applicable)
- Attribution modeling

**Testing & Optimization Plan:**
- Initial testing phase approach
- Headline and creative testing
- Audience testing
- Landing page optimization
- Scaling criteria

**Recommended Pricing:**
Setup:
- Basic (1 platform, 1-2 campaigns): $2,500-4,000
- Standard (2 platforms, landing pages): $5,000-8,000
- Enterprise (full funnel): $10,000-15,000

Management:
- 15-20% of ad spend OR
- Flat fee: $1,500-5,000/month

**Typical Add-ons:**
- Additional landing pages: $1,500-2,500 each
- Video ad production: $2,000-5,000
- Retargeting sequences: $1,500
- Email automation: $2,000-4,000
`,

  media_package: `
### Media Package Proposal Structure

**Executive Summary:**
Position as brand asset creation - these are investments that will be used across all marketing for years.

**Creative Vision Section:**
- Visual style direction
- Mood board references
- Shot list overview
- Brand alignment notes

**Shoot Schedule:**
Day-by-day breakdown:
- Locations
- Shot types
- Subjects/talent
- Equipment needs
- Time estimates

**Deliverables Breakdown:**
Video deliverables:
- Hero brand video (length, style)
- Service explainer videos
- Testimonial interviews
- Property/product tours
- B-roll library footage
- Social media cuts

Photo deliverables:
- Team/headshot portraits
- Office/location shots
- Product/service photography
- Lifestyle/action shots
- Stock library for marketing

**Technical Specs:**
- Video resolution/format
- Photo resolution/format
- Delivery method
- Raw footage availability

**Usage Rights:**
- Full commercial use
- Social media
- Advertising
- Website
- Print materials
- Duration/territory

**Recommended Pricing:**
- Half-day shoot (4 hrs): $2,000-3,500
- Full-day shoot (8 hrs): $4,000-6,000
- Multi-day production: $6,000-15,000
Plus editing/post-production

**Typical Add-ons:**
- Drone footage: $800-1,500
- Talent/actors: $500-1,000/day
- Location fees: Varies
- Rush editing: +50%
- Additional edits: $200-500/revision round
`,

  web_app: `
### Custom Portal / Web App Proposal Structure

**Executive Summary:**
Position as a competitive advantage - custom software that solves their specific problems, not a one-size-fits-all SaaS.

**Requirements Overview:**
- Business problem being solved
- Current workflow/pain points
- User types and needs
- Integration requirements
- Scale considerations

**User Flows Section:**
For each user type:
- Primary actions
- Key screens
- Permissions/access levels
- Mobile requirements

**Feature Breakdown:**
By module, detail:
- Feature name
- What it does
- Why it matters
- Technical complexity (for pricing)

Common modules:
- Authentication & user management
- Dashboard & reporting
- Data management (CRUD)
- Communication/messaging
- File management
- Integrations (payment, email, etc.)
- AI features

**Tech Stack Recommendations:**
- Frontend: React/Next.js/Vite
- Backend: Node.js/Netlify Functions
- Database: Postgres/Supabase
- Storage: Netlify Blobs/S3
- Hosting: Netlify/Vercel
- Integrations: List relevant APIs

**Security & Compliance:**
- Authentication method
- Data encryption
- Access controls
- Backup strategy
- Compliance requirements (HIPAA, etc.)

**Development Phases:**
- Discovery & Planning
- Design & Prototyping
- Core Development
- Testing & QA
- Launch & Training

**Recommended Pricing:**
- Simple portal (5-10 features): $15,000-25,000
- Medium complexity: $25,000-50,000
- Enterprise app: $50,000-150,000+

**Typical Add-ons:**
- Additional user roles: $1,500-3,000
- Advanced reporting: $3,000-5,000
- AI features: $5,000-15,000
- Mobile app: $15,000-30,000
- Ongoing maintenance: $500-2,000/month
`,

  landing_page: `
### Campaign Landing Page Proposal Structure

**Executive Summary:**
Position as conversion optimization - this page exists for one purpose: turn visitors into leads.

**Campaign Context:**
- What's driving traffic (ads, email, social)
- Target audience
- Offer/CTA
- Success metrics

**Page Structure:**
Section-by-section breakdown:
1. Hero (headline, subhead, CTA)
2. Problem/Pain points
3. Solution overview
4. Features/Benefits
5. Social proof (testimonials, logos)
6. FAQ/Objection handling
7. Final CTA

**Conversion Elements:**
- Form strategy (fields, placement)
- CTA design and copy
- Trust signals
- Urgency elements
- Exit intent strategy

**Integration Requirements:**
- Form submission destination
- Email automation trigger
- CRM integration
- Thank you page/redirect
- Tracking pixels

**A/B Testing Plan:**
Elements to test:
- Headlines
- CTA copy/color
- Form length
- Social proof placement
- Offer variations

**Recommended Pricing:**
- Simple landing page: $1,500-2,500
- Conversion-optimized page: $2,500-4,000
- Full funnel (landing + thank you + email): $4,000-6,000

**Typical Add-ons:**
- Additional page variants: $500-1,000
- Email sequence (3-5 emails): $1,500-2,500
- A/B testing management: $500/month
- Conversion rate optimization: $1,000-2,000/month
`
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get proposal type by ID
export function getProposalType(id) {
  return PROPOSAL_TYPES[id] || null
}

// Get all proposal types as array
export function getProposalTypesList() {
  return Object.values(PROPOSAL_TYPES)
}

// Get icon component for a proposal type
export function getProposalTypeIcon(id) {
  const icons = {
    brand_website: 'Sparkles',
    website_rebuild: 'RefreshCw',
    local_seo: 'MapPin',
    seo_retainer: 'TrendingUp',
    paid_ads: 'Megaphone',
    media_package: 'Video',
    web_app: 'LayoutDashboard',
    landing_page: 'MousePointerClick'
  }
  return icons[id] || 'FileText'
}

// Get color classes for a proposal type
export function getProposalTypeColors(id) {
  const colors = {
    purple: {
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
      gradient: 'from-purple-500 to-violet-600'
    },
    blue: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
      gradient: 'from-blue-500 to-cyan-600'
    },
    green: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200',
      gradient: 'from-green-500 to-emerald-600'
    },
    emerald: {
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
      gradient: 'from-emerald-500 to-teal-600'
    },
    orange: {
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
      gradient: 'from-orange-500 to-amber-600'
    },
    pink: {
      bg: 'bg-pink-500',
      bgLight: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200',
      gradient: 'from-pink-500 to-rose-600'
    },
    indigo: {
      bg: 'bg-indigo-500',
      bgLight: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-200',
      gradient: 'from-indigo-500 to-purple-600'
    },
    cyan: {
      bg: 'bg-cyan-500',
      bgLight: 'bg-cyan-50',
      text: 'text-cyan-600',
      border: 'border-cyan-200',
      gradient: 'from-cyan-500 to-blue-600'
    }
  }
  
  const type = PROPOSAL_TYPES[id]
  return type ? colors[type.color] : colors.blue
}

export default PROPOSAL_TYPES
