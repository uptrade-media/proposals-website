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
---
```

3. Write your proposal content using MDX components (see below)
4. Add the slug to `MDX_PROPOSALS` array in `src/pages/ProposalGate.jsx`
5. Access at `/p/your-slug`

## Available MDX Components

### Layout Components

**ExecutiveSummary**
```mdx
<ExecutiveSummary>
  Your executive summary content here. Use **bold** and *italic* markdown.
</ExecutiveSummary>
```

**Section**
```mdx
<Section title="Your Section Title">
  Section content here with full markdown support.
</Section>
```

### Data Visualization

**StatsGrid + StatCard**
```mdx
<StatsGrid>
  <StatCard 
    value="42" 
    label="Performance Score"
    description="Google PageSpeed Insights"
    trend="critical"  // critical | warning | down | up
  />
  <StatCard value="98%" label="Mobile Score" trend="up" />
</StatsGrid>
```

**CriticalIssues + IssueCard**
```mdx
<CriticalIssues>
  <IssueCard 
    severity="high"  // high | medium | low
    title="Issue Title"
    description="Detailed description of the issue"
    impact="Business impact description"
  />
</CriticalIssues>
```

### Pricing & Timeline

**PricingSection + PricingTier**
```mdx
<PricingSection title="Investment Options">
  <PricingTier
    name="Package Name"
    price="$12,500"
    description="Short description"
    features={[
      "Feature 1",
      "Feature 2",
      "Feature 3"
    ]}
    highlighted={true}  // optional, adds visual emphasis
  />
</PricingSection>
```

**Timeline + Phase**
```mdx
<Timeline>
  <Phase
    number={1}
    title="Phase Title"
    duration="3 weeks"
    description="Phase description"
    deliverables={[
      "Deliverable 1",
      "Deliverable 2"
    ]}
  />
</Timeline>
```

### New Website Build Components

**NewWebsiteBuild + WebsiteFeature**
For clients who need a new website (no existing site to audit):

```mdx
<NewWebsiteBuild
  tagline="From Invisible to Indispensable"
  description="We'll build you a high-performance website."
>
  <WebsiteFeature
    title="Mobile-First Design"
    description="Feature description"
    icon="📱"  // emoji or icon
  />
  <WebsiteFeature
    title="Online Booking"
    description="Feature description"
    icon="📅"
  />
</NewWebsiteBuild>
```

### Utility Components

**DownloadBlock**
```mdx
<DownloadBlock 
  title="Download Audit Report"
  description="Full 24-page technical audit"
  fileUrl="/path/to/file.pdf"
  fileSize="2.4 MB"
/>
```

## Example Proposals

- **row94-audit.mdx**: Audit-based proposal for existing website
- **new-website-demo.mdx**: New website build proposal (no existing site)

## Tips

1. Use standard Markdown for body text (paragraphs, lists, etc.)
2. Components are case-sensitive: `<Section>` not `<section>`
3. Props with arrays use JavaScript syntax: `features={["Item 1", "Item 2"]}`
4. Props with objects use JavaScript syntax: `brandColors={{ primary: "#000" }}`
5. You can mix Markdown and components freely
6. Frontmatter is required - it provides metadata to ProposalLayout

## Technical Details

- MDX files are loaded dynamically via `ProposalGate.jsx`
- Frontmatter is parsed with `gray-matter`
- MDX is compiled with `@mdx-js/mdx` using `evaluate()`
- Components are provided by `ProposalBlocks.jsx`
- Layout wrapper is `ProposalLayout.jsx`
- Renderer is `MDXProposalRenderer.jsx`
