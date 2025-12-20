// netlify/functions/proposals-create-ai-background.js
// Background function for AI proposal generation (15 min timeout)
const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const PROPOSAL_STYLE = `You are an elite sales copywriter and proposal specialist for Uptrade Media, a premium digital agency.

MISSION: Create ultra-high-converting proposals that close deals fast using our custom MDX components.

BRAND VOICE:
- Professional, confident, and authoritative
- Results-focused with measurable outcomes
- Client success obsessed
- Urgent but not pushy

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

13. **Testimonial** - Social proof (SKIP FOR NOW - we don't have real testimonials yet)
   DO NOT USE THIS COMPONENT until we have actual client testimonials.

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

15. **MetricHighlight** - Big bold single metric callout (use inside ExecutiveSummary for impact)
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

17. **BonusSection** - Limited-time bonus offers (creates urgency)
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
    },
    {
      name: "E-commerce Store", 
      url: "shop.example.com",
      status: "Migration",
      platform: "Shopify",
      issues: ["Poor checkout flow", "No analytics"],
      scope: ["Platform migration", "Conversion optimization", "Analytics integration"]
    }
  ]}
/>
\`\`\`

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

// Generate URL-safe slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const body = JSON.parse(event.body || '{}')
  const { proposalId, formData, createdBy } = body

  if (!proposalId || !formData) {
    console.error('[proposal-ai-background] Missing proposalId or formData')
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required data' }) }
  }

  console.log(`[proposal-ai-background] Starting generation for proposal: ${proposalId}`)

  try {
    const { 
      contactId,
      proposalType,
      pricing,
      clientInfo,
      projectInfo,
      heroImageUrl,
      auditResults,
      aiConversation,
      validUntil
    } = formData

    // Extract nested fields
    const clientName = clientInfo?.name || formData.clientName
    const clientCompany = clientInfo?.company || formData.clientCompany
    const projectType = proposalType || formData.projectType
    const budget = pricing?.totalPrice || pricing?.basePrice || formData.budget
    const timeline = projectInfo?.timeline || formData.timeline
    const goals = projectInfo?.goals || formData.goals
    const challenges = projectInfo?.challenges || formData.challenges
    const notes = projectInfo?.notes || formData.notes

    // Get contact info
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, email, name, company')
      .eq('id', contactId)
      .single()

    console.log('[Proposal AI] Generating proposal for:', clientName, projectType)

    // Format audit results for AI context (use already destructured auditResults)
    let auditContext = ''
    const auditData = auditResults || formData.auditData
    if (auditData) {
      const { performance, seo, accessibility, bestPractices, grade, coreWebVitals, opportunities, seoDetails } = auditData
      
      auditContext = `
WEBSITE AUDIT RESULTS (Grade: ${grade || 'N/A'}):
Scores:
- Overall Performance: ${performance || 'N/A'}/100 (Mobile: ${auditData.performanceMobile || 'N/A'})
- SEO Score: ${seo || 'N/A'}/100
- Accessibility: ${accessibility || 'N/A'}/100
- Best Practices: ${bestPractices || 'N/A'}/100`

      if (coreWebVitals) {
        auditContext += `

Core Web Vitals (Key Performance Metrics):
- LCP (Largest Contentful Paint): Mobile ${coreWebVitals.lcp?.mobile || 'N/A'}, Desktop ${coreWebVitals.lcp?.desktop || 'N/A'} ${coreWebVitals.lcp?.score < 50 ? '⚠️ NEEDS IMPROVEMENT' : ''}
- CLS (Cumulative Layout Shift): Mobile ${coreWebVitals.cls?.mobile || 'N/A'}, Desktop ${coreWebVitals.cls?.desktop || 'N/A'} ${coreWebVitals.cls?.score < 50 ? '⚠️ NEEDS IMPROVEMENT' : ''}
- TBT (Total Blocking Time): Mobile ${coreWebVitals.tbt?.mobile || 'N/A'}, Desktop ${coreWebVitals.tbt?.desktop || 'N/A'}
- Speed Index: Mobile ${coreWebVitals.speedIndex?.mobile || 'N/A'}, Desktop ${coreWebVitals.speedIndex?.desktop || 'N/A'}
- Time to Interactive: Mobile ${coreWebVitals.tti?.mobile || 'N/A'}, Desktop ${coreWebVitals.tti?.desktop || 'N/A'}`
      }

      if (opportunities?.length > 0) {
        auditContext += `

TOP IMPROVEMENT OPPORTUNITIES (Use these to justify value):`
        opportunities.forEach((opp, i) => {
          auditContext += `\n${i + 1}. ${opp.title}${opp.savings ? ` - Potential savings: ${opp.savings}` : ''}`
          if (opp.description) auditContext += `\n   ${opp.description.substring(0, 150)}...`
        })
      }

      if (seoDetails) {
        auditContext += `

SEO AUDIT DETAILS:
- Page Title: "${seoDetails.title || 'MISSING'}" (${seoDetails.titleLength || 0} chars - ${seoDetails.titleLength >= 30 && seoDetails.titleLength <= 60 ? 'Good' : 'Needs optimization'})
- Meta Description: ${seoDetails.metaDescriptionLength || 0} chars ${!seoDetails.metaDescription ? '⚠️ MISSING' : seoDetails.metaDescriptionLength >= 120 && seoDetails.metaDescriptionLength <= 160 ? '✓ Good' : '⚠️ Needs optimization'}
- H1 Tag: ${seoDetails.hasH1 ? `Yes (${seoDetails.h1Count} total)` : '⚠️ MISSING'}
- Robots.txt: ${seoDetails.hasRobotsTxt ? '✓ Present' : '⚠️ MISSING'}
- Sitemap: ${seoDetails.hasSitemap ? '✓ Present' : '⚠️ MISSING'}
- HTTPS: ${seoDetails.isHttps ? '✓ Secure' : '⚠️ NOT SECURE'}`
      }

      auditContext += `

USE THIS AUDIT DATA TO:
- Identify and emphasize specific pain points in "The Challenge" section
- Justify the investment with data-driven improvements
- Create urgency around fixing critical issues
- Reference specific metrics when discussing expected improvements`
    }

    // Generate AI content (using gpt-5.2 - background function has 15 min timeout)
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: PROPOSAL_STYLE },
        { 
          role: 'user', 
          content: `Create an ultra-high-converting business proposal:

CLIENT INFORMATION:
- Name: ${clientName}
- Company: ${clientCompany || 'Not specified'}
- Industry: ${clientInfo?.industry || 'Not specified'}
- Brand Name: ${clientInfo?.brandName || clientCompany || 'Not specified'}
- Goals: ${goals || 'Not specified'}
- Challenges: ${challenges || 'Not specified'}

PROJECT DETAILS:
- Type: ${projectType}
- Website URL: ${projectInfo?.websiteUrl || 'Not specified'}
- Budget/Price: $${budget || 'To be discussed'}
- Timeline: ${timeline || 'Standard timeline'}
- Start Date: ${projectInfo?.startDate || 'Flexible'}
- Additional Context: ${projectInfo?.context || 'None'}
- Notes: ${notes || 'None'}
${auditContext}
${pricing?.addOns?.length ? `\nONE-TIME ADD-ONS SELECTED:\n${pricing.addOns.filter(a => !a.isRecurring).map(a => `- ${a.name}: $${a.price}`).join('\n')}` : ''}
${pricing?.addOns?.some(a => a.isRecurring) ? `\nMONTHLY RETAINER/SERVICE FEES (NOT included in project price - billed separately):\n${pricing.addOns.filter(a => a.isRecurring).map(a => `- ${a.name}: $${a.price}/month`).join('\n')}\n\nNOTE: Include a section about the ongoing monthly services in the proposal.` : ''}
${pricing?.paymentTerms ? `\nPAYMENT TERMS: ${pricing.paymentTerms}` : ''}
${pricing?.customTerms ? `\nCUSTOM TERMS: ${pricing.customTerms}` : ''}

Generate a complete, conversion-optimized proposal using our CUSTOM MDX COMPONENTS.

CRITICAL: You MUST use our custom React components, NOT standard markdown headers.

AVAILABLE CORE COMPONENTS:

1. <ExecutiveSummary> - Opening hook and transformation promise
   <ExecutiveSummary>Your compelling intro text here...</ExecutiveSummary>

2. <CriticalIssues title="The Challenge"> - Pain points with severity
   <CriticalIssues title="What's Holding You Back">
     <IssueCard title="Slow Page Speed" description="Your site takes 8+ seconds to load" severity="critical" />
     <IssueCard title="Poor Mobile Experience" description="Mobile users struggle to convert" severity="high" />
   </CriticalIssues>

3. <Section> - General purpose section wrapper
   <Section>## The Solution\n\nYour content here...</Section>

4. <PricingSection> with <PricingTier> - Investment section
   <PricingSection>
     <PricingTier name="Website Rebuild" price={6000} period="one-time"
       description="Complete conversion-focused rebuild" highlighted={true}
       features={["Custom design", "Speed optimization", "SEO foundations"]} />
   </PricingSection>

5. <Timeline> with <Phase> - Project timeline
   <Timeline>
     <Phase number={1} title="Discovery" duration="Week 1" deliverables={["Kickoff call", "Sitemap"]} />
     <Phase number={2} title="Design" duration="Weeks 2-3" deliverables={["Homepage", "Templates"]} />
   </Timeline>

ADVANCED CONVERSION COMPONENTS (use these for world-class proposals):

6. <ValueStack items={[{title: "Custom Design", value: 3000}, ...]}> - Value stacking before price

7. <GuaranteeBadge title="Results Guarantee" description="If you don't see improvement in 90 days..." /> - Trust building

8. <UrgencyBanner message="Only 2 spots left for Q1" type="warning" /> - Create urgency (warning|danger|info)

9. <ComparisonTable title="Before & After" items={[{feature: "Load Time", before: "8+ seconds", after: "Under 2 seconds"}]} /> - Comparison

10. <ProcessSteps steps={[{title: "Step 1", description: "What happens"}]} /> - Visual process

11. <BonusSection title="Special Bonus" items={[{title: "Free SEO Audit", value: 500}]} expiresText="Accept by Friday" /> - Bonus offers

12. <CTASection title="Ready to Transform?" subtitle="Let's build something great" urgencyText="Pricing valid 14 days" /> - Strong CTA

13. <IconFeatureGrid features={[{icon: "globe", title: "Global Reach", description: "..."}]} /> - Feature grid

14. <MetricHighlight value="47%" label="Increase in Leads" trend="+12% MoM" /> - Big metric display

15. <WebsitePortfolio> - FOR MULTI-SITE PROPOSALS ONLY. Use when client has 2+ websites.
    <WebsitePortfolio 
      title="Websites Included"
      subtitle="Complete overhaul of your digital portfolio"
      websites={[
        {
          name: "Main Corporate Site",
          url: "example.com",
          status: "Rebuild",
          platform: "WordPress",
          issues: ["Slow load times", "Poor mobile UX", "Outdated design"],
          scope: ["Complete redesign", "Speed optimization", "Mobile-first rebuild"]
        },
        {
          name: "E-commerce Store", 
          url: "shop.example.com",
          status: "Migration",
          platform: "Wix",
          issues: ["SEO limitations", "No custom checkout"],
          scope: ["Migrate to Next.js", "Custom checkout flow", "SEO foundations"]
        },
        {
          name: "Blog/Content Site",
          url: "blog.example.com", 
          status: "Optimization",
          platform: "WordPress",
          issues: ["Slow performance"],
          scope: ["Performance tuning", "CDN setup"]
        }
      ]}
      showTotals={true}
    />
    Status options: "Rebuild" (red), "Migration" (orange), "Optimization" (blue), "Maintenance" (green), "New" (green)

PROPOSAL STRUCTURE (use this exact order):

<ExecutiveSummary>
Compelling hook about transformation. Specific outcomes: "Increase leads by 40%, cut bounce rate in half, dominate local search."
</ExecutiveSummary>

{/* IF client has multiple websites, add WebsitePortfolio here after ExecutiveSummary */}

<CriticalIssues title="What's Holding You Back">
  <IssueCard title="Critical Issue" description="Specific impact with numbers" severity="critical" />
  <IssueCard title="High Priority Issue" description="Another pain point" severity="high" />
  <IssueCard title="Medium Issue" description="Additional challenge" severity="medium" />
</CriticalIssues>

<Section>
## The Transformation

Our proven approach using bullet points.
</Section>

<Section>
## Key Metrics We'll Track

So results are measurable - include 3-4 MetricHighlight components showing specific KPIs you'll improve:
<MetricHighlight value="2.5s" label="Target Load Time" trend="From 8+ seconds" />
<MetricHighlight value="40%" label="Lead Increase" trend="Within 90 days" />
<MetricHighlight value="50%" label="Bounce Rate Reduction" trend="Mobile & Desktop" />
</Section>

<ComparisonTable 
  title="Your Results" 
  beforeLabel="Current State" 
  afterLabel="With Uptrade"
  items={[
    {feature: "Page Speed", before: "8+ seconds", after: "Under 2 seconds"},
    {feature: "Mobile Experience", before: "Poor", after: "Optimized"},
    {feature: "Lead Generation", before: "Minimal", after: "Conversion-focused"}
  ]} 
/>

<ValueStack items={[
  {title: "Custom Responsive Design", value: 4000},
  {title: "Speed Optimization", value: 1500},
  {title: "SEO Foundations", value: 1000},
  {title: "Lead Capture System", value: 800}
]} />

<PricingSection>
  <PricingTier name="Complete Package" price={TOTAL_PRICE} period="one-time"
    description="Everything you need to dominate online" highlighted={true}
    features={["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"]} />
</PricingSection>

<UrgencyBanner message="Only 2 project spots available this quarter" type="warning" />

<Timeline>
  <Phase number={1} title="Discovery & Strategy" duration="Week 1" deliverables={["Kickoff", "Research", "Sitemap"]} />
  <Phase number={2} title="Design" duration="Weeks 2-3" deliverables={["Homepage", "Templates", "Mobile"]} />
  <Phase number={3} title="Development" duration="Weeks 4-5" deliverables={["Build", "Integrations", "Testing"]} />
  <Phase number={4} title="Launch" duration="Week 6" deliverables={["Final review", "Go live", "Training"]} />
</Timeline>

<GuaranteeBadge 
  title="Our Guarantee" 
  description="If you don't see measurable improvement in 90 days, we'll work for free until you do." 
/>

<BonusSection 
  title="Accept This Week Bonus" 
  items={[
    {title: "Free 30-min SEO Strategy Session", value: 500},
    {title: "Priority Support for 3 months", value: 300}
  ]} 
  expiresText="Available when you accept by [Friday's date]" 
/>

<CTASection 
  title="Ready to Transform Your Digital Presence?" 
  subtitle="Join successful businesses who chose to invest in growth"
  urgencyText="Pricing guaranteed for 14 days only"
/>

Return JSON with:
{
  "title": "Proposal title",
  "description": "1-2 sentence compelling description",
  "mdxContent": "Full MDX proposal content with ALL sections using our components",
  "lineItems": [{"serviceType": "web-design", "description": "Service", "quantity": 1, "unitPrice": 0, "total": 0}],
  "totalAmount": 0,
  "suggestedValidDays": 10,
  "keyValueProps": ["Value 1", "Value 2", "Value 3"],
  "deliverables": ["Deliverable 1", "Deliverable 2"],
  "urgencyTriggers": ["Urgency 1", "Urgency 2"],
  "limitedSlots": "Only 2 project slots available for Q1 2025",
  "bonusOffer": {"title": "Sign This Week", "description": "Get bonus worth $X"},
  "guarantee": {"title": "Our Guarantee", "description": "Performance guarantee"},
  "timeline": {"phases": [{"name": "Phase", "duration": "X weeks"}], "totalDuration": "6 weeks"}
}

CRITICAL: 
- Use ALL the advanced components for world-class design
- The mdxContent MUST use our JSX components, not plain markdown
- Use the EXACT pricing provided ($${budget || formData.pricing?.totalPrice || 'TBD'})
- Include ValueStack, GuaranteeBadge, UrgencyBanner, ComparisonTable, BonusSection, CTASection
- Set suggestedValidDays to 7-14 days
- Return ONLY valid JSON`
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 8000,
      response_format: { type: 'json_object' }
    })

    const aiContent = JSON.parse(response.choices[0].message.content)
    
    // Generate slug
    const proposalSlug = generateSlug(aiContent.title) + '-' + Date.now()

    // Calculate valid until date
    const validUntilDate = validUntil || (() => {
      const date = new Date()
      date.setDate(date.getDate() + (aiContent.suggestedValidDays || 30))
      return date.toISOString().split('T')[0]
    })()

    // Update existing proposal with generated content
    // Note: AI metadata (urgency triggers, bonuses, etc.) is embedded in the MDX content
    const { data: proposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        slug: proposalSlug,
        title: aiContent.title,
        description: aiContent.description,
        mdx_content: aiContent.mdxContent,
        status: 'draft',
        total_amount: aiContent.totalAmount ? String(aiContent.totalAmount) : null,
        valid_until: validUntilDate
      })
      .eq('id', proposalId)
      .select()
      .single()

    if (updateError) {
      console.error('[proposal-ai-background] Update proposal error:', updateError)
      throw updateError
    }

    console.log(`[proposal-ai-background] Proposal generated successfully: ${proposalId}`)

    // Insert line items
    if (aiContent.lineItems && aiContent.lineItems.length > 0) {
      try {
        const lineItemsToInsert = aiContent.lineItems.map((item, index) => ({
          proposal_id: proposalId,
          title: item.description?.substring(0, 100) || 'Service',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || 0,
          total_price: item.total || (item.quantity || 1) * (item.unitPrice || 0),
          item_type: item.serviceType || 'service',
          is_optional: false,
          selected: true,
          sort_order: index
        }))

        const { error: lineItemsError } = await supabase
          .from('proposal_line_items')
          .insert(lineItemsToInsert)
        
        if (lineItemsError) {
          console.log('[proposal-ai-background] Line items insert error:', lineItemsError.message)
        }
      } catch (lineItemsError) {
        console.log('[proposal-ai-background] Line items error:', lineItemsError.message)
      }
    }

    // Create draft recurring invoice if there are monthly retainers
    const recurringAddOns = pricing?.addOns?.filter(a => a.isRecurring) || []
    if (recurringAddOns.length > 0 && contactId) {
      try {
        const monthlyTotal = recurringAddOns.reduce((sum, a) => sum + (a.price || 0), 0)
        const itemDescriptions = recurringAddOns.map(a => a.name).join(', ')
        
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            contact_id: contactId,
            proposal_id: proposalId,
            status: 'draft',
            amount: monthlyTotal.toString(),
            currency: 'USD',
            description: `Monthly Retainer: ${itemDescriptions}`,
            is_recurring: true,
            recurring_interval: 'monthly',
            notes: `Auto-generated from proposal. Monthly services: ${recurringAddOns.map(a => `${a.name} ($${a.price}/mo)`).join(', ')}`
          })
          .select()
          .single()
        
        if (invoiceError) {
          console.log('[proposal-ai-background] Draft invoice create error:', invoiceError.message)
        } else {
          console.log(`[proposal-ai-background] Draft recurring invoice created: ${invoice?.id}`)
        }
      } catch (invoiceError) {
        console.log('[proposal-ai-background] Invoice error:', invoiceError.message)
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, proposalId }) }

  } catch (error) {
    console.error('[proposal-ai-background] Error:', error)
    
    // Update proposal with error status
    await supabase
      .from('proposals')
      .update({ 
        status: 'failed', 
        description: `Generation failed: ${error.message}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}

// Mark as background function (15 minute timeout)
exports.config = {
  type: "background"
}
