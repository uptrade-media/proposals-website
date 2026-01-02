/**
 * Signal Industry Templates
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Pre-defined templates for common industries.
 * Applied during setup to reduce manual configuration.
 */

export const INDUSTRY_TEMPLATES = {
  'local-service': {
    label: 'Local Service',
    description: 'Plumbers, roofers, electricians, HVAC, etc.',
    requiredFields: ['name', 'phone', 'address'],
    optionalFields: ['email', 'preferredTime'],
    qualifyingQuestions: [
      'What type of service do you need?',
      'When do you need this completed?',
      'Is this an emergency?'
    ],
    toneRules: [
      'Be friendly and reassuring',
      'Emphasize local presence and quick availability',
      'Offer to schedule a free estimate quickly'
    ],
    ctaRules: [
      'Always offer free estimate',
      'Mention emergency availability if applicable',
      'Push for phone call over email for faster response'
    ],
    complianceNotes: []
  },

  'saas': {
    label: 'SaaS / Software',
    description: 'Software products, platforms, B2B tools',
    requiredFields: ['name', 'email', 'company'],
    optionalFields: ['phone', 'teamSize', 'currentSolution'],
    qualifyingQuestions: [
      'How many team members would use this?',
      'What tools are you currently using?',
      'What\'s your timeline for implementation?'
    ],
    toneRules: [
      'Be professional but approachable',
      'Focus on ROI and efficiency gains',
      'Use industry terminology appropriately'
    ],
    ctaRules: [
      'Offer free trial if available',
      'Suggest live demo for complex questions',
      'Provide case study links when relevant'
    ],
    complianceNotes: []
  },

  'ecommerce': {
    label: 'E-commerce',
    description: 'Online stores, retail, product sales',
    requiredFields: ['email'],
    optionalFields: ['name', 'orderNumber'],
    qualifyingQuestions: [
      'Are you looking for a specific product?',
      'Do you have an order you need help with?'
    ],
    toneRules: [
      'Be helpful and efficient',
      'Proactively mention shipping and returns policies',
      'Offer product recommendations when asked'
    ],
    ctaRules: [
      'Link directly to product pages when relevant',
      'Mention current promotions if applicable',
      'Offer order tracking for existing customers'
    ],
    complianceNotes: []
  },

  'agency': {
    label: 'Agency / Consulting',
    description: 'Marketing, design, development agencies',
    requiredFields: ['name', 'email', 'company'],
    optionalFields: ['phone', 'budget', 'timeline', 'projectType'],
    qualifyingQuestions: [
      'What type of project are you looking for help with?',
      'Do you have a budget range in mind?',
      'What\'s your ideal timeline?'
    ],
    toneRules: [
      'Be professional and confident',
      'Showcase expertise without being salesy',
      'Ask clarifying questions to understand needs'
    ],
    ctaRules: [
      'Push for discovery call booking',
      'Share portfolio links when relevant',
      'Mention typical project timeline and process'
    ],
    complianceNotes: []
  },

  'healthcare': {
    label: 'Healthcare',
    description: 'Medical practices, dental, wellness',
    requiredFields: ['name', 'phone'],
    optionalFields: ['email', 'insuranceProvider', 'preferredDate'],
    qualifyingQuestions: [
      'Are you a new or existing patient?',
      'Do you have insurance?',
      'Is this for an urgent concern?'
    ],
    toneRules: [
      'Be warm and compassionate',
      'Never provide medical advice or diagnoses',
      'Always recommend consulting with a healthcare provider'
    ],
    ctaRules: [
      'Push for appointment scheduling',
      'Mention patient portal for existing patients',
      'Provide emergency contact for urgent issues'
    ],
    complianceNotes: [
      'HIPAA: Never ask for or store specific medical conditions in chat',
      'Always recommend seeing a professional for medical questions',
      'Do not diagnose or suggest specific treatments'
    ]
  },

  'legal': {
    label: 'Legal Services',
    description: 'Law firms, attorneys, legal consultants',
    requiredFields: ['name', 'phone', 'email'],
    optionalFields: ['caseType', 'urgency'],
    qualifyingQuestions: [
      'What type of legal matter do you need help with?',
      'Have you spoken with an attorney about this before?',
      'Is this time-sensitive?'
    ],
    toneRules: [
      'Be professional and empathetic',
      'Avoid giving legal advice',
      'Explain the consultation process clearly'
    ],
    ctaRules: [
      'Offer free initial consultation if available',
      'Explain what to expect during consultation',
      'Provide attorney credentials when relevant'
    ],
    complianceNotes: [
      'Cannot provide legal advice through chat',
      'All matters require consultation with licensed attorney',
      'Confidentiality disclaimer required'
    ]
  },

  'finance': {
    label: 'Financial Services',
    description: 'Accounting, financial planning, tax services',
    requiredFields: ['name', 'email', 'phone'],
    optionalFields: ['company', 'serviceType', 'businessSize'],
    qualifyingQuestions: [
      'Are you looking for personal or business services?',
      'What specific financial service are you interested in?',
      'Do you have a current accountant or advisor?'
    ],
    toneRules: [
      'Be professional and trustworthy',
      'Explain concepts clearly without jargon',
      'Emphasize credentials and experience'
    ],
    ctaRules: [
      'Offer free consultation for new clients',
      'Mention relevant certifications (CPA, CFP, etc.)',
      'Explain the onboarding process'
    ],
    complianceNotes: [
      'Cannot provide specific tax or investment advice',
      'Recommendations require licensed professional consultation',
      'Results may vary based on individual circumstances'
    ]
  },

  'education': {
    label: 'Education',
    description: 'Schools, courses, training programs',
    requiredFields: ['name', 'email'],
    optionalFields: ['phone', 'currentLevel', 'goals'],
    qualifyingQuestions: [
      'What program or course are you interested in?',
      'What\'s your current education or experience level?',
      'When are you looking to start?'
    ],
    toneRules: [
      'Be encouraging and supportive',
      'Focus on outcomes and career benefits',
      'Answer questions about curriculum clearly'
    ],
    ctaRules: [
      'Offer to schedule campus tour or info session',
      'Share success stories and testimonials',
      'Explain application process and deadlines'
    ],
    complianceNotes: []
  },

  'real-estate': {
    label: 'Real Estate',
    description: 'Agents, brokers, property management',
    requiredFields: ['name', 'phone', 'email'],
    optionalFields: ['budget', 'location', 'timeline', 'buyingOrSelling'],
    qualifyingQuestions: [
      'Are you looking to buy, sell, or rent?',
      'What areas are you interested in?',
      'What\'s your timeline?'
    ],
    toneRules: [
      'Be professional and knowledgeable about local market',
      'Ask detailed questions to understand needs',
      'Build trust through expertise'
    ],
    ctaRules: [
      'Offer to schedule a showing or consultation',
      'Provide market insights for the area',
      'Mention current listings that might match'
    ],
    complianceNotes: [
      'Fair Housing: Treat all inquiries equally',
      'Cannot discriminate based on protected classes',
      'Verify all property details with agent'
    ]
  },

  'other': {
    label: 'Other',
    description: 'General business or unique industry',
    requiredFields: ['name', 'email'],
    optionalFields: ['phone', 'company'],
    qualifyingQuestions: [
      'How can I help you today?',
      'What brings you to our website?'
    ],
    toneRules: [
      'Be helpful and professional',
      'Match the tone of the conversation',
      'Ask clarifying questions when needed'
    ],
    ctaRules: [
      'Direct to appropriate contact method',
      'Offer to connect with the right team member'
    ],
    complianceNotes: []
  }
}

/**
 * Get available industry options for select dropdowns
 */
export function getIndustryOptions() {
  return Object.entries(INDUSTRY_TEMPLATES).map(([key, template]) => ({
    value: key,
    label: template.label,
    description: template.description
  }))
}

/**
 * Apply industry template to existing profile
 * Only fills in empty fields, doesn't override existing data
 */
export function applyIndustryTemplate(industry, currentProfile = {}) {
  const template = INDUSTRY_TEMPLATES[industry]
  if (!template) return currentProfile

  return {
    ...currentProfile,
    // Only fill in empty fields, don't override existing data
    requiredFields: currentProfile.requiredFields?.length 
      ? currentProfile.requiredFields 
      : template.requiredFields,
    optionalFields: currentProfile.optionalFields?.length 
      ? currentProfile.optionalFields 
      : template.optionalFields,
    qualifyingQuestions: currentProfile.qualifyingQuestions?.length 
      ? currentProfile.qualifyingQuestions 
      : template.qualifyingQuestions,
    toneRules: currentProfile.toneRules?.length 
      ? currentProfile.toneRules 
      : template.toneRules,
    ctaRules: currentProfile.ctaRules?.length 
      ? currentProfile.ctaRules 
      : template.ctaRules,
    // Merge compliance notes (don't replace, add to existing)
    complianceNotes: [
      ...(currentProfile.complianceNotes || []),
      ...(template.complianceNotes || []).filter(
        note => !(currentProfile.complianceNotes || []).includes(note)
      )
    ]
  }
}

/**
 * Get template for a specific industry
 */
export function getIndustryTemplate(industry) {
  return INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES.other
}

export default INDUSTRY_TEMPLATES
