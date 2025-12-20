// netlify/functions/proposals-create-ai.js
// AI-powered proposal generator - similar to blog-create-ai.js
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getAuthenticatedUser } from './utils/supabase.js'

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
   For now, skip social proof or reference case study results without quotes.

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

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Authenticate using Supabase
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  // Only admins can create proposals
  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Only admins can create proposals' })
    }
  }

  try {

    // Parse request body
    const formData = JSON.parse(event.body || '{}')
    
    // Support both old and new format
    const { 
      contactId,
      projectId,
      // Old format
      clientName: legacyClientName,
      clientCompany: legacyClientCompany,
      projectType: legacyProjectType,
      services,
      budget,
      timeline: legacyTimeline,
      goals: legacyGoals,
      challenges: legacyChallenges,
      notes: legacyNotes,
      validUntil,
      // New format from ProposalAIDialog
      proposalType,
      pricing,
      clientInfo,
      projectInfo,
      heroImageUrl,
      auditResults,
      aiConversation
    } = formData

    // Normalize data from either format
    const clientName = clientInfo?.name || legacyClientName
    const clientCompany = clientInfo?.company || legacyClientCompany
    const brandName = clientInfo?.brandName || clientCompany || clientName
    const clientIndustry = clientInfo?.industry || 'Not specified'
    const projectType = proposalType || legacyProjectType
    const timeline = projectInfo?.timeline || legacyTimeline
    const startDate = projectInfo?.startDate
    const goals = projectInfo?.goals || legacyGoals
    const challenges = projectInfo?.challenges || legacyChallenges
    const websiteUrl = projectInfo?.websiteUrl
    const notes = projectInfo?.notes || legacyNotes
    const context = projectInfo?.context
    const totalPrice = pricing?.totalPrice || pricing?.basePrice || budget
    const addOns = pricing?.addOns || formData.addOns || []
    const paymentTerms = pricing?.paymentTerms

    // Validate required fields
    if (!contactId || !clientName || !projectType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['contactId', 'clientName/clientInfo.name', 'projectType/proposalType']
        })
      }
    }

    // Verify contact exists
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, company')
      .eq('id', contactId)
      .single()

    if (contactError || !contactData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    console.log('[Proposal AI] Generating proposal for:', brandName, projectType)
    console.log('[Proposal AI] Audit results:', auditResults ? 'Present' : 'Not provided')

    // Build audit data section for the AI prompt
    let auditSection = ''
    if (auditResults) {
      auditSection = `
WEBSITE AUDIT DATA (Use this to inform your proposal with specific issues to address):
- Website: ${websiteUrl || 'Current website'}
- Performance Score: ${auditResults.performance || 'N/A'}/100
- SEO Score: ${auditResults.seo || 'N/A'}/100
- Accessibility Score: ${auditResults.accessibility || 'N/A'}/100
- Best Practices Score: ${auditResults.bestPractices || 'N/A'}/100`
      
      // Include detailed audit data if available
      if (auditResults.fullAuditJson) {
        const fullAudit = typeof auditResults.fullAuditJson === 'string' 
          ? JSON.parse(auditResults.fullAuditJson) 
          : auditResults.fullAuditJson
        
        // Extract key issues from full audit
        const opportunities = fullAudit?.lighthouseResult?.audits || {}
        const failedAudits = Object.entries(opportunities)
          .filter(([_, audit]) => audit.score !== null && audit.score < 0.5)
          .slice(0, 10)
          .map(([key, audit]) => `- ${audit.title}: ${audit.displayValue || 'Needs improvement'}`)
        
        if (failedAudits.length > 0) {
          auditSection += `

KEY ISSUES IDENTIFIED (reference these specifically in your proposal):
${failedAudits.join('\n')}`
        }
      }
    }

    // Build AI conversation context if provided
    let aiConversationContext = ''
    if (aiConversation && aiConversation.length > 0) {
      const relevantMessages = aiConversation
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10) // Last 10 messages
        .map(m => `${m.role === 'user' ? 'Client Info' : 'AI'}: ${m.content}`)
        .join('\n')
      
      if (relevantMessages) {
        aiConversationContext = `

ADDITIONAL CONTEXT FROM DISCOVERY:
${relevantMessages}`
      }
    }

    // Generate AI content
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: PROPOSAL_STYLE },
        { 
          role: 'user', 
          content: `Create an ultra-high-converting business proposal:

CLIENT INFORMATION:
- Name: ${clientName}
- Company: ${clientCompany || 'Not specified'}
- Brand Name (use this in proposal): ${brandName}
- Industry: ${clientIndustry}
- Goals: ${goals || 'Not specified'}
- Challenges: ${challenges || 'Not specified'}
- Additional Context: ${context || 'None'}

PROJECT DETAILS:
- Type: ${projectType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
- Website URL: ${websiteUrl || 'Not provided'}
- Budget/Price: $${totalPrice || 'To be discussed'}
- Timeline: ${timeline || 'Standard timeline'}
- Preferred Start Date: ${startDate || 'ASAP'}
- Payment Terms: ${paymentTerms || 'Standard terms'}
- Additional Notes: ${notes || 'None'}
${auditSection}
${addOns.length ? `
ADD-ONS SELECTED:
${addOns.map(a => `- ${a.name}: $${a.price}${a.isRecurring ? '/month' : ''}`).join('\n')}` : ''}
${aiConversationContext}

Generate a complete, conversion-optimized proposal in MDX format. Use these techniques:
- Open with a compelling transformation promise
- Paint their pain points vividly before presenting solution
${auditResults ? '- REFERENCE THE SPECIFIC AUDIT SCORES AND ISSUES to show you understand their current situation' : ''}
- Stack massive value before the investment section
- Include urgency triggers (limited slots, pricing expires, competitor risk)
- Use specific numbers and metrics
- End with a powerful, urgent call-to-action

CRITICAL: USE OUR CUSTOM MDX COMPONENTS, NOT PLAIN MARKDOWN HEADERS!

STRUCTURE YOUR MDX PROPOSAL LIKE THIS:

1. <ExecutiveSummary> - Opening hook with transformation promise and key benefits
2. ${auditResults ? '<CriticalIssues> with <IssueCard> components - Show the audit findings' : '<Section title="The Challenge"> - Their pain points'}
3. <Section title="Our Solution"> - Your unique approach with <ProcessSteps>
4. ${projectType === 'website_rebuild' ? '<NewWebsiteBuild> with <WebsiteFeature> cards' : '<Section title="What You Get"> with bullet lists'}
5. <ValueStack> - Stack up all the value they're getting
6. <PricingSection> with <PricingTier> - Investment breakdown
7. <Timeline> with <Phase> components - Clear project phases
8. <UrgencyBanner> - Create urgency with deadline
9. <GuaranteeBadge> - Risk reversal
10. <CTASection> - Strong call-to-action

EXAMPLE STRUCTURE:
\`\`\`mdx
<ExecutiveSummary>
Opening paragraph about transformation...

**Key outcomes:**
- Benefit 1
- Benefit 2
</ExecutiveSummary>

${auditResults ? `<CriticalIssues title="Current Website Issues">
  <IssueCard severity="critical" title="Issue Title" description="Description" />
</CriticalIssues>` : `<Section title="The Challenge">
Content about their pain points...
</Section>`}

<Section title="Our Solution">
<ProcessSteps steps={[
  { title: "Step 1", description: "..." },
  { title: "Step 2", description: "..." }
]} />
</Section>

<ValueStack
  items={[
    { label: "Service 1", value: 5000 },
    { label: "Service 2", value: 3000 }
  ]}
  totalValue={8000}
  yourPrice={${totalPrice || 0}}
/>

<Timeline title="Project Timeline">
  <Phase name="Phase 1" duration="Week 1-2" description="..." />
  <Phase name="Phase 2" duration="Week 3-4" description="..." />
</Timeline>

<UrgencyBanner message="This pricing is guaranteed until [date]. Only 2 slots remain." />

<GuaranteeBadge 
  title="100% Satisfaction Guarantee"
  description="If you're not happy, we'll make it right."
/>

<CTASection
  title="Ready to Get Started?"
  description="Accept this proposal to secure your spot."
/>
\`\`\`

Return JSON with:
{
  "title": "Proposal title",
  "description": "1-2 sentence compelling description",
  "mdxContent": "Full MDX proposal content using the COMPONENTS above (NOT ## headers)",
  "lineItems": [
    {
      "title": "Service name",
      "serviceType": "web-design|seo|marketing|development|consulting|custom",
      "description": "Service description",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0
    }
  ],
  "totalAmount": ${totalPrice || 0},
  "suggestedValidDays": 10,
  "keyValueProps": ["Value 1", "Value 2", "Value 3"],
  "deliverables": ["Deliverable 1", "Deliverable 2"],
  "urgencyTriggers": ["Urgency message 1", "Urgency message 2"],
  "limitedSlots": "Only 2 project slots available for Q1 2025",
  "bonusOffer": {
    "title": "Sign This Week Bonus",
    "description": "Accept by [date] and receive [bonus worth $X]"
  },
  "guarantee": {
    "title": "Our Guarantee",
    "description": "Satisfaction or performance guarantee statement"
  },
  "timeline": {
    "phases": [
      { "name": "Phase name", "duration": "X weeks", "description": "..." }
    ],
    "totalDuration": "X weeks",
    "startDateUrgency": "To launch by [goal date], we need to begin by [start date]"
  }
}

CRITICAL: 
- Use the EXACT pricing provided ($${totalPrice})
- USE MDX COMPONENTS like <ExecutiveSummary>, <Section>, <Timeline>, etc. NOT ## markdown headers
- Include urgency triggers throughout using <UrgencyBanner>
- Make it ready to send and close the deal
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

    console.log('[Proposal AI] Saving with heroImageUrl:', heroImageUrl)

    // Create proposal in database
    const { data: proposal, error: createError } = await supabase
      .from('proposals')
      .insert({
        contact_id: contactId,
        project_id: projectId || null,
        slug: proposalSlug,
        title: aiContent.title,
        description: aiContent.description,
        mdx_content: aiContent.mdxContent,
        status: 'draft',
        total_amount: totalPrice ? String(totalPrice) : (aiContent.totalAmount ? String(aiContent.totalAmount) : null),
        valid_until: validUntilDate,
        hero_image_url: heroImageUrl || null,
        brand_name: brandName || null,
        timeline: timeline || null,
        payment_terms: paymentTerms || null,
        metadata: {
          keyValueProps: aiContent.keyValueProps,
          deliverables: aiContent.deliverables,
          urgencyTriggers: aiContent.urgencyTriggers,
          limitedSlots: aiContent.limitedSlots,
          bonusOffer: aiContent.bonusOffer,
          guarantee: aiContent.guarantee,
          timelinePhases: aiContent.timeline
        }
      })
      .select()
      .single()

    if (createError) {
      console.error('Create proposal error:', createError)
      throw createError
    }

    // Insert line items
    if (aiContent.lineItems && aiContent.lineItems.length > 0) {
      const lineItemsToInsert = aiContent.lineItems.map((item, index) => ({
        proposal_id: proposal.id,
        title: item.title || item.serviceType || 'Service',
        item_type: item.serviceType || item.itemType || 'custom',
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || 0,
        total_price: item.total || (item.quantity || 1) * (item.unitPrice || 0),
        sort_order: index
      }))

      const { error: lineItemsError } = await supabase
        .from('proposal_line_items')
        .insert(lineItemsToInsert)

      if (lineItemsError) {
        console.error('Line items error:', lineItemsError)
        // Non-fatal
      }
    }

    // Format response
    const formattedProposal = {
      id: proposal.id,
      contactId: proposal.contact_id,
      projectId: proposal.project_id,
      slug: proposal.slug,
      title: proposal.title,
      description: proposal.description,
      mdxContent: proposal.mdx_content,
      status: proposal.status,
      totalAmount: proposal.total_amount ? parseFloat(proposal.total_amount) : null,
      validUntil: proposal.valid_until,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      // Include AI-generated metadata including urgency triggers
      aiMetadata: {
        keyValueProps: aiContent.keyValueProps,
        deliverables: aiContent.deliverables,
        timeline: aiContent.timeline,
        lineItems: aiContent.lineItems,
        // Urgency triggers for high conversion
        urgencyTriggers: aiContent.urgencyTriggers,
        limitedSlots: aiContent.limitedSlots,
        bonusOffer: aiContent.bonusOffer,
        guarantee: aiContent.guarantee
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        proposalId: proposal.id, // For frontend compatibility
        proposal: formattedProposal,
        message: 'AI proposal generated successfully',
        preview: true // Indicates this is a draft for review
      })
    }

  } catch (error) {
    console.error('Error generating AI proposal:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate proposal',
        message: error.message 
      })
    }
  }
}
