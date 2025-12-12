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

MISSION: Create ultra-high-converting proposals that close deals fast.

BRAND VOICE:
- Professional, confident, and authoritative
- Results-focused with measurable outcomes
- Client success obsessed
- Urgent but not pushy

PSYCHOLOGICAL TRIGGERS TO USE:
- Urgency: Limited availability, pricing expiration, competitor advantage loss
- Social proof: Reference industry benchmarks and success stories
- Fear of missing out: What they'll lose by waiting
- Exclusivity: Position as premium, selective partnership
- Risk reversal: Guarantees, clear expectations

PROPOSAL STRUCTURE:
1. Executive Summary - Compelling hook + key transformation promise
2. The Problem - Paint their pain points vividly
3. The Solution - Your unique approach and methodology  
4. Deliverables & Scope - Crystal clear what's included
5. Investment - Value-stacked pricing with urgency triggers
6. Timeline - Clear milestones with start date urgency
7. Why Uptrade - Credibility, differentiators, trust signals
8. Next Steps - Strong CTA with urgency

CONVERSION TECHNIQUES:
- Lead with transformation, not features
- Use specific numbers (3x ROI, 47% increase, etc.)
- Create urgency (pricing valid for X days, Q2 launch window)
- Stack value before revealing price
- Use comparison anchoring
- Include risk reversal/guarantee language
- End with clear, urgent call-to-action

URGENCY TRIGGERS - USE THESE THROUGHOUT:
You MUST include urgency triggers in your proposals. These will be rendered as visual components:

1. **Pricing Expiration** (REQUIRED):
   - Set validUntil to 7-14 days from today
   - Mention "This pricing is guaranteed until [date]" in Investment section
   - Reference what happens after expiration (prices increase, availability changes)

2. **Limited Availability** (use when appropriate):
   - "We're only accepting 2 new projects this quarter"
   - "Our Q1 calendar is filling up fast"
   - "Limited spots available for [month] launch"
   - Return a "limitedSlots" message like "Only 2 spots left for Q1"

3. **Start Date Urgency**:
   - "To hit your [goal/launch date], we need to begin by [date]"
   - "Every week of delay costs approximately $X in lost [revenue/opportunity]"
   - Reference seasonal windows, competitor timing, market conditions

4. **Competitor Risk**:
   - "While you're deciding, competitors are moving forward"
   - "Your competitors are already investing in [service]"
   - Reference industry trends and first-mover advantages

5. **Bonus Offers** (return in bonusOffer field):
   - "Sign within 48 hours to receive [bonus]"
   - Free strategy session, extra month of support, priority onboarding
   - Example: { "title": "Sign This Week Bonus", "description": "Get a free 30-minute SEO audit ($500 value) when you accept by Friday" }

6. **Risk Reversal / Guarantees** (return in guarantee field):
   - Satisfaction guarantees
   - Performance benchmarks
   - Example: { "title": "Results Guarantee", "description": "If you don't see measurable improvement in 90 days, we'll work for free until you do." }

URGENCY PLACEMENT:
- Executive Summary: Hint at limited availability
- Investment Section: Pricing expiration, comparison to value received
- Timeline Section: Start date urgency, what delays cost
- Next Steps: Strong deadline-driven CTA with bonus offer`

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
${pricing?.addOns?.length ? `\nADD-ONS SELECTED:\n${pricing.addOns.map(a => `- ${a.name}: $${a.price}`).join('\n')}` : ''}
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
