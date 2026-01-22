# MDX Proposals

This directory contains MDX-based proposal files. MDX allows you to write proposals in Markdown with embedded React components for interactive elements.

## How to Create a New Proposal

1. Create a new `.mdx` file in `src/proposals/content/`
2. Add frontmatter metadata at the top:

```yaml
---
title: "Your Proposal Title"
client: "Client Name"
date: "January 15, 2025"
proposalId: "unique-slug"
heroVideo: "/path/to/video.mp4"  # optional
heroImage: "/path/to/image.jpg"  # optional
brandColors:
  primary: "#4bbf39"
  secondary: "#39bfb0"
showSignature: true  # optional, adds signature block
---
```

3. Write your proposal content using MDX components (see below)
4. Add the slug to `MDX_PROPOSALS` array in `src/pages/ProposalGate.jsx`
5. Access at `/p/your-slug`

## Proposal Templates

### Template A: Audit/Redesign (Existing Site)
Use when client has an existing website with problems.

```
1. CriticalIssues (show what's broken)
2. ExecutiveSummary (the solution vision)
3. StatsGrid (current metrics)
4. ComparisonTable (before vs after)
5. Section - "Proposed Solution"
6. Timeline (project phases)
7. WhyUs (why choose us)
8. PricingSection (investment)
9. SignalAISection (AI add-on)
10. CTASection (call to action)
```

### Template B: New Website (No Existing Site)
Use when client needs a brand new website.

```
1. ExecutiveSummary (the opportunity)
2. NewWebsiteBuild (features they'll get)
3. Section - "What's Included"
4. Timeline (project phases)
5. WhyUs (why choose us)
6. PricingSection (investment)
7. SignalAISection (AI add-on)
8. CTASection (call to action)
```

### Template C: Enterprise (Large Projects)
Use for multi-site or high-value clients.

```
1. ExecutiveSummary
2. CriticalIssues (if applicable)
3. WebsitePortfolio (multi-site breakdown)
4. StatsGrid + ComparisonTable
5. ValueStack (anchor the value high)
6. Timeline (detailed phases)
7. WhyUs + Testimonial
8. PricingSection (tiered options)
9. GuaranteeBadge (risk reversal)
10. SignalAISection
11. UrgencyBanner + CTASection
```

## Available MDX Components

### ExecutiveSummary - The Hook (REQUIRED)

The opening pitch that hooks the reader. NEVER skip this.

```mdx
<ExecutiveSummary>
  [Company Name] is ready to scale beyond referrals and establish a commanding 
  digital presence. Without a professional website, you're invisible to 78% of 
  potential customers who search online before booking.

  <MetricHighlight value="78%" label="Search Before Buying" />
  <MetricHighlight value="24/7" label="Online Booking" />

  We'll transform your expertise into a revenue-generating digital asset that 
  works around the clock.
</ExecutiveSummary>
```

### CriticalIssues - Create Urgency

Show what's broken and the cost of inaction. Use for audits/redesigns.

```mdx
<CriticalIssues>
  <IssueCard 
    severity="high"
    title="Mobile Experience Completely Broken"
    description="68% of your traffic comes from mobile, but your site shows errors on phones."
    impact="Losing an estimated $2,400/day in mobile revenue"
  />
  <IssueCard 
    severity="medium"
    title="5.8-Second Load Time"
    description="Google recommends under 2 seconds. Slow sites lose visitors."
    impact="53% of visitors abandon before seeing content"
  />
</CriticalIssues>
```

Severity levels: `high` (red), `medium` (orange), `low` (yellow)

### StatsGrid + StatCard - Data Visualization

Display metrics in a scannable grid format.

```mdx
<StatsGrid>
  <StatCard 
    value="42" 
    label="Performance Score"
    description="Google PageSpeed Insights"
    trend="critical"
  />
  <StatCard value="216" label="Monthly Visitors" trend="warning" />
  <StatCard value="2,400" label="Projected Traffic" trend="up" />
</StatsGrid>
```

Trend values: `critical`, `warning`, `down`, `up`

### NewWebsiteBuild - For New Sites

Showcase features for clients without existing websites.

```mdx
<NewWebsiteBuild
  tagline="From Invisible to Indispensable"
  description="We'll build a high-performance website that attracts premium clients."
>
  <WebsiteFeature
    title="Mobile-First Design"
    description="80% of customers browse on phones. We design mobile-first."
    icon="📱"
  />
  <WebsiteFeature
    title="Online Booking System"
    description="Customers book and pay 24/7. Automated reminders reduce no-shows."
    icon="📅"
  />
</NewWebsiteBuild>
```

Icons: 📱 📅 📸 💎 ⭐ 🎯 📍 ⚡ 🔒 📧 📊 🛒 💳 🤖

### ComparisonTable - Before/After

Side-by-side comparison that makes the choice obvious.

```mdx
<ComparisonTable 
  title="Your Transformation"
  beforeLabel="Current State"
  afterLabel="With Uptrade"
  items={[
    { feature: "Monthly Traffic", before: "216 visitors", after: "2,400+ visitors" },
    { feature: "Mobile Experience", before: "Broken", after: "Flawless" },
    { feature: "Lead Response", before: "4-6 hours", after: "Instant" }
  ]}
/>
```

### Timeline + Phase - Project Phases

Show the journey from signing to launch.

```mdx
<Timeline>
  <Phase
    number={1}
    title="Discovery & Strategy"
    duration="1 week"
    description="Understanding your business and goals"
    deliverables={[
      "Brand discovery session",
      "Competitive analysis",
      "Sitemap and wireframes"
    ]}
  />
  <Phase
    number={2}
    title="Design & Development"
    duration="3 weeks"
    deliverables={["Custom design", "Development", "Testing"]}
  />
</Timeline>
```

### PricingSection + PricingTier - Investment

Present pricing with value justification.

```mdx
<PricingSection title="Investment Options">
  <PricingTier
    name="Complete Website Package"
    price="$8,500"
    description="Everything you need to launch"
    features={[
      "Custom responsive design",
      "Up to 7 pages",
      "Online booking system",
      "SEO optimization",
      "30 days support"
    ]}
    highlighted={true}
  />
</PricingSection>
```

### SignalAISection - AI Upsell (ALWAYS INCLUDE)

Present Signal AI as an optional add-on. TAILOR to their industry.

```mdx
<SignalAISection 
  title="Add Intelligence to Your Business"
  description="Never miss another lead. Signal AI handles inquiries 24/7."
  benefits={[
    "AI chat widget answers customer questions instantly",
    "Automatic lead qualification and scoring",
    "Smart follow-up reminders",
    "Content suggestions based on SEO opportunities"
  ]}
  price="199"
  period="monthly"
/>
```

### WhyUs - Trust Building

Answer "why should I choose YOU?"

```mdx
<WhyUs 
  title="Why Choose Uptrade Media?"
  reasons={[
    { title: "Proven Track Record", description: "50+ successful projects" },
    { title: "Performance Guaranteed", description: "Sub-2-second loads or we fix it free" },
    { title: "Full Platform Included", description: "CRM, analytics, forms, marketing tools" }
  ]}
/>
```

### CTASection - The Close

Strong call-to-action before signature.

```mdx
<CTASection 
  title="Ready to Transform Your Digital Presence?"
  subtitle="Sign below to lock in your project slot."
  urgencyText="Limited availability - Only 4 new projects per month"
/>
```

### ValueStack - Total Value

Stack up all value to justify price.

```mdx
<ValueStack items={[
  { title: "Custom Website Design", value: "8,500" },
  { title: "Professional Copywriting", value: "2,100" },
  { title: "SEO Optimization", value: "1,500" },
  { title: "Training Session", value: "400" }
]} />
```

### UrgencyBanner - Time Pressure

Create urgency with deadlines.

```mdx
<UrgencyBanner 
  message="This pricing is valid until February 15, 2026."
  type="warning"
/>
```

Types: `warning` (orange), `danger` (red), `info` (blue)

### GuaranteeBadge - Risk Reversal

Remove risk from their decision.

```mdx
<GuaranteeBadge 
  title="Performance Guarantee"
  description="If your site doesn't load in under 2 seconds, we fix it free."
/>
```

### WebsitePortfolio - Multi-Site Projects

For clients with multiple websites.

```mdx
<WebsitePortfolio 
  title="Websites Included"
  websites={[
    {
      name: "Main Corporate Site",
      url: "example.com",
      status: "Rebuild",
      platform: "WordPress",
      issues: ["Slow", "Outdated"],
      scope: ["Full redesign", "Migration"]
    }
  ]}
/>
```

### Testimonial - Social Proof

Real client success stories.

```mdx
<Testimonial 
  quote="Our traffic tripled in 6 months."
  author="Sarah Chen"
  company: "Precision Auto"
  result="+300% Traffic"
/>
```

### ProcessSteps - Simple Flow

Numbered process visualization.

```mdx
<ProcessSteps 
  title="Getting Started is Easy"
  steps={[
    { title: "Sign This Proposal", description: "Click sign below" },
    { title: "Kickoff Call", description: "Within 48 hours" },
    { title: "We Get to Work", description: "Building starts immediately" }
  ]}
/>
```

## Tips for Compelling Proposals

1. **Personalization is everything** - Use company name throughout
2. **Lead with pain, sell the dream** - Start with problems, paint success
3. **Make it scannable** - Use visual components, not walls of text
4. **Build to the ask** - Show value BEFORE price
5. **Always include Signal AI** - Tailor benefits to their industry
6. **Create honest urgency** - Limited availability, pricing windows

## Technical Details

- MDX files are loaded dynamically via `ProposalGate.jsx`
- Frontmatter is parsed with `gray-matter`
- MDX is compiled with `@mdx-js/mdx` using `evaluate()`
- Components are provided by `ProposalBlocks.jsx`
- Layout wrapper is `ProposalLayout.jsx`
