/**
 * Proposal Block Definitions
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Centralized MDX component definitions for AI proposal generation.
 * Used by ProposalsSkill and proposals-create-ai.js
 * 
 * CRITICAL: These component definitions match the frontend MDX renderer.
 * Changes here must be synced with src/components/mdx/ProposalBlocks.jsx
 */

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT NAMES (for validation)
// ═══════════════════════════════════════════════════════════════════════════════

export const PROPOSAL_COMPONENT_NAMES = [
  // Core components
  'ProposalHero',
  'Section',
  'ExecutiveSummary',
  'StatsGrid',
  'StatCard',
  'CriticalIssues',
  'IssueCard',
  'PricingSection',
  'PricingTier',
  'Timeline',
  'Phase',
  'NewWebsiteBuild',
  'WebsiteFeature',
  'DownloadBlock',
  
  // Advanced conversion components
  'ValueStack',
  'GuaranteeBadge',
  'UrgencyBanner',
  'Testimonial',
  'ComparisonTable',
  'ProcessSteps',
  'MetricHighlight',
  'CTASection',
  'IconFeatureGrid',
  'BonusSection',
  'WebsitePortfolio'
]

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT DOCUMENTATION (for AI context)
// ═══════════════════════════════════════════════════════════════════════════════

export const PROPOSAL_COMPONENTS = `
AVAILABLE MDX COMPONENTS - USE THESE INSTEAD OF PLAIN MARKDOWN:

1. **ExecutiveSummary** - Opening hook with transformation promise
\`\`\`mdx
<ExecutiveSummary>
Your compelling opening with **bold key points** and a clear value proposition.
- Bullet point benefits
- Why they need this now
</ExecutiveSummary>
\`\`\`

2. **Section** - Main content sections (replaces ## headers)
\`\`\`mdx
<Section title="Section Title">
Your content here. Supports markdown formatting.
### Subheadings work
- Bullet lists
- More bullets
</Section>
\`\`\`

3. **StatsGrid / StatCard** - Display impressive metrics in a grid
\`\`\`mdx
<StatsGrid>
  <StatCard value="47%" label="Average Conversion Increase" change="+12%" trend="up" />
  <StatCard value="3x" label="ROI in 6 Months" />
  <StatCard value="2 weeks" label="Time to Launch" />
  <StatCard value="98%" label="Client Satisfaction" change="+5%" trend="up" />
</StatsGrid>
\`\`\`
Props:
- value: (required) The main number/stat
- label: (required) Description of what it measures
- change: (optional) Change amount like "+12%"
- trend: (optional) "up" (green) or "down" (red) for color coding
- icon: (optional) Icon component

4. **CriticalIssues / IssueCard** - Highlight problems (great for audits)
\`\`\`mdx
<CriticalIssues title="Critical Issues We Found">
  <IssueCard 
    severity="critical" 
    title="Slow Page Load Time" 
    description="Your site takes 8 seconds to load, causing 53% of visitors to leave before seeing your content."
  />
  <IssueCard 
    severity="high" 
    title="Missing Meta Tags" 
    description="Search engines can't properly index your content, making you invisible to potential customers."
  />
  <IssueCard 
    severity="medium" 
    title="No Analytics Tracking" 
    description="You're flying blind without data on visitor behavior and conversion paths."
  />
</CriticalIssues>
\`\`\`
Severity levels (required): "critical" | "high" | "medium"

5. **PricingSection / PricingTier** - Investment breakdown
\`\`\`mdx
<PricingSection title="Your Investment">
  <PricingTier
    name="Complete Website Package"
    price={15000}
    period="one-time"
    description="Everything you need to launch a high-converting website"
    features={["Custom 12-Page Design", "Mobile-First Responsive", "SEO Foundation", "Speed Optimization", "Contact Forms & CRM Integration", "60-Day Post-Launch Support"]}
    highlighted={true}
  />
</PricingSection>
\`\`\`
Props:
- name: (required) Package/tier name
- price: (required) Number, displayed as currency
- period: (optional) e.g., "one-time", "per month", "per year"
- description: (optional) Short description of the tier
- features: (required) Array of strings for feature list
- highlighted: (optional) If true, adds emphasis styling

6. **Timeline / Phase** - Project timeline with phases
\`\`\`mdx
<Timeline title="Project Timeline">
  <Phase 
    number={1}
    title="Discovery & Strategy" 
    duration="Week 1-2"
    description="Deep dive into your business, goals, and target audience."
    deliverables={["Brand questionnaire", "Competitor analysis", "Sitemap & wireframes", "Project roadmap"]}
  />
  <Phase 
    number={2}
    title="Design & Development" 
    duration="Week 3-5"
    description="Custom design and build of your new website."
    deliverables={["Homepage mockup", "Interior page designs", "Mobile designs", "Development build"]}
  />
  <Phase 
    number={3}
    title="Launch & Optimize" 
    duration="Week 6"
    description="Go live with training and ongoing support."
    deliverables={["Final QA testing", "Site launch", "Training session", "30-day support"]}
  />
</Timeline>
\`\`\`
Props:
- number: (optional) Phase number displayed in circle
- title: (required) Phase name
- duration: (optional) Time estimate e.g., "Week 1-2"
- description: (optional) Brief description of the phase
- deliverables: (optional) Array of specific deliverables

7. **UrgencyBanner** - Create urgency with deadline
\`\`\`mdx
<UrgencyBanner 
  message="This pricing is guaranteed until January 15th. Only 2 project slots remain for Q1."
  type="warning"
/>
\`\`\`
Props:
- message: (required) The urgency message
- type: (optional) "warning" (orange), "danger" (red), or "info" (blue)

8. **GuaranteeBadge** - Risk reversal
\`\`\`mdx
<GuaranteeBadge 
  title="100% Satisfaction Guarantee"
  description="If you're not completely satisfied with the final result, we'll revise until you are—at no extra cost."
/>
\`\`\`

9. **ValueStack** - Stack value before pricing (shows "What You're Getting" header automatically)
\`\`\`mdx
<ValueStack
  items={[
    { title: "Custom Website Design", value: 8000 },
    { title: "SEO Optimization Package", value: 3000 },
    { title: "Content Strategy Session", value: 2000 },
    { title: "BONUS: 3 Month Priority Support", value: 1500, included: true }
  ]}
/>
\`\`\`
Props for each item:
- title: (required) The name/description of what they're getting
- value: (optional) Dollar value displayed as "Value: $X"
- included: (optional) If false, item shows without "Included" badge

10. **CTASection** - Strong call-to-action (signature block follows automatically)
\`\`\`mdx
<CTASection
  title="Ready to Transform Your Digital Presence?"
  subtitle="Accept this proposal to secure your spot. Your dedicated team is ready to start."
  urgencyText="Pricing valid through January 15th"
/>
\`\`\`
Props:
- title: (required) Main headline
- subtitle: (optional) Supporting text
- urgencyText: (optional) Shows with clock icon for deadline pressure

11. **ProcessSteps** - Show your methodology
\`\`\`mdx
<ProcessSteps
  steps={[
    { title: "Discovery", description: "We learn your business inside and out" },
    { title: "Strategy", description: "Custom roadmap for success" },
    { title: "Execute", description: "Our experts bring the vision to life" },
    { title: "Optimize", description: "Continuous improvement for growth" }
  ]}
/>
\`\`\`

12. **NewWebsiteBuild / WebsiteFeature** - For website projects
\`\`\`mdx
<NewWebsiteBuild tagline="Your New Digital Home" description="A modern website built for conversions">
  <WebsiteFeature title="Mobile-First Design" description="Flawless on every device" icon="📱" />
  <WebsiteFeature title="Lightning Fast" description="Loads in under 1 second" icon="⚡" />
</NewWebsiteBuild>
\`\`\`

13. **Testimonial** - Social proof
\`\`\`mdx
<Testimonial
  quote="Working with Uptrade transformed our online presence completely."
  author="John Smith"
  role="CEO"
  company="Example Corp"
/>
\`\`\`
Note: Only use with actual client testimonials, not fabricated quotes.

14. **ComparisonTable** - Before/After visual comparison
\`\`\`mdx
<ComparisonTable
  title="The Transformation"
  beforeLabel="Current State"
  afterLabel="With Uptrade"
  items={[
    { feature: "Page Load Time", before: "8.2 seconds", after: "Under 1 second" },
    { feature: "Mobile Experience", before: "Broken layouts", after: "Perfect on all devices" },
    { feature: "SEO Visibility", before: "Page 3+", after: "Page 1 rankings" },
    { feature: "Lead Generation", before: "2-3/month", after: "15-20/month" }
  ]}
/>
\`\`\`

15. **MetricHighlight** - Big bold single metric callout
\`\`\`mdx
<MetricHighlight value="312%" label="Average Traffic Increase" trend="in 90 days" />
\`\`\`
Props:
- value: (required) The big number/stat
- label: (required) What it measures
- trend: (optional) Context like timeframe

16. **IconFeatureGrid** - Feature grid with icons
\`\`\`mdx
<IconFeatureGrid features={[
  { icon: "globe", title: "Global CDN", description: "Lightning-fast worldwide" },
  { icon: "shield", title: "SSL Security", description: "Bank-level encryption" },
  { icon: "smartphone", title: "Mobile-First", description: "Perfect on any device" },
  { icon: "search", title: "SEO Optimized", description: "Built to rank" },
  { icon: "zap", title: "Fast Loading", description: "Under 1 second" },
  { icon: "chart", title: "Analytics", description: "Track everything" }
]} />
\`\`\`
Available icons: globe, smartphone, search, mail, calendar, zap, award, target, chart, users, trending

17. **BonusSection** - Limited-time bonus offers
\`\`\`mdx
<BonusSection 
  title="Sign This Week Bonus"
  items={[
    { title: "Free SEO Audit", value: 500 },
    { title: "Priority Onboarding", value: 750 },
    { title: "30-Day Extended Support", value: 1000 }
  ]}
  expiresText="Only available if you accept by Friday"
/>
\`\`\`

18. **WebsitePortfolio** - For multi-site projects
\`\`\`mdx
<WebsitePortfolio
  title="Websites Included"
  subtitle="Complete overhaul of your digital ecosystem"
  websites={[
    {
      name: "Main Corporate Site",
      url: "example.com",
      status: "Rebuild",
      platform: "WordPress",
      issues: ["Slow loading", "Not mobile-friendly", "Outdated design"],
      scope: ["Modern redesign", "Mobile optimization", "Speed optimization", "SEO setup"]
    }
  ]}
/>
\`\`\`
`

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSAL STYLE GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

export const PROPOSAL_STYLE = `You are an elite sales copywriter and proposal specialist for Uptrade Media, a premium digital agency.

MISSION: Create ultra-high-converting proposals that close deals fast using our custom MDX components.

BRAND VOICE:
- Professional, confident, and authoritative
- Results-focused with measurable outcomes
- Client success obsessed
- Urgent but not pushy

${PROPOSAL_COMPONENTS}

MANDATORY STRUCTURE FOR EVERY PROPOSAL:
1. <ExecutiveSummary> - Hook them immediately with transformation promise
2. Problem section (use <CriticalIssues> if audit data available, otherwise <Section> with pain points)
3. <ComparisonTable> - Show the before/after transformation visually
4. Solution section with <ProcessSteps> or <IconFeatureGrid>
5. <ValueStack> - Stack all the value they're getting (shows "What You're Getting")
6. <PricingSection> with <PricingTier> - The investment
7. <Timeline> with <Phase> components - When things happen
8. <BonusSection> - Limited-time extras if applicable
9. <UrgencyBanner> - Create deadline pressure
10. <GuaranteeBadge> - Remove risk with guarantee
11. <CTASection> - Strong close (signature block follows automatically)

CONVERSION TECHNIQUES:
- Lead with transformation, not features
- Use specific numbers (3x ROI, 47% increase, etc.)
- Create urgency (pricing valid for X days, Q2 launch window)
- Stack value before revealing price
- Use comparison anchoring
- Include risk reversal/guarantee language
- End with clear, urgent call-to-action

URGENCY TRIGGERS - WEAVE THESE THROUGHOUT:
1. Pricing Expiration: "This pricing is guaranteed until [date]"
2. Limited Availability: "Only 2 project slots remain for Q1"
3. Start Date Urgency: "To hit your launch date, we need to begin by [date]"
4. Competitor Risk: "While you're deciding, competitors are moving forward"
5. Bonus Offers: "Sign within 48 hours to receive [bonus]"`

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSAL GENERATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const PROPOSAL_OUTPUT_SCHEMA = {
  title: 'Proposal title',
  description: '1-2 sentence compelling description',
  mdxContent: 'Full MDX proposal content using the COMPONENTS above',
  lineItems: [
    {
      title: 'Service name',
      serviceType: 'web-design|seo|marketing|development|consulting|custom',
      description: 'Service description',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }
  ],
  totalAmount: 0,
  suggestedValidDays: 10,
  keyValueProps: ['Value 1', 'Value 2', 'Value 3'],
  deliverables: ['Deliverable 1', 'Deliverable 2'],
  urgencyTriggers: ['Urgency message 1', 'Urgency message 2'],
  limitedSlots: 'Only 2 project slots available for Q1 2025',
  bonusOffer: {
    title: 'Sign This Week Bonus',
    description: 'Accept by [date] and receive [bonus worth $X]'
  },
  guarantee: {
    title: 'Our Guarantee',
    description: 'Satisfaction or performance guarantee statement'
  },
  timeline: {
    phases: [
      { name: 'Phase name', duration: 'X weeks', description: '...' }
    ],
    totalDuration: 'X weeks',
    startDateUrgency: 'To launch by [goal date], we need to begin by [start date]'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  PROPOSAL_STYLE,
  PROPOSAL_COMPONENTS,
  PROPOSAL_COMPONENT_NAMES,
  PROPOSAL_OUTPUT_SCHEMA
}
