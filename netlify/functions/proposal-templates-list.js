// netlify/functions/proposal-templates-list.js
// List available proposal templates for quick creation
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

// Default templates when none exist in database
const DEFAULT_TEMPLATES = [
  {
    id: 'website-redesign',
    name: 'Website Redesign',
    description: 'Full website redesign with modern UX/UI',
    category: 'web',
    estimatedPrice: 8500,
    services: ['Design', 'Development', 'SEO Optimization', 'Content Migration']
  },
  {
    id: 'seo-package',
    name: 'SEO & Digital Marketing',
    description: 'Comprehensive SEO and digital marketing campaign',
    category: 'marketing',
    estimatedPrice: 2500,
    services: ['SEO Audit', 'Keyword Research', 'On-Page Optimization', 'Monthly Reporting']
  },
  {
    id: 'brand-identity',
    name: 'Brand Identity Package',
    description: 'Complete brand identity design including logo and guidelines',
    category: 'branding',
    estimatedPrice: 3500,
    services: ['Logo Design', 'Color Palette', 'Typography', 'Brand Guidelines']
  },
  {
    id: 'ecommerce-setup',
    name: 'E-Commerce Setup',
    description: 'Full e-commerce store setup with Shopify or WooCommerce',
    category: 'web',
    estimatedPrice: 12000,
    services: ['Store Setup', 'Product Import', 'Payment Integration', 'Training']
  },
  {
    id: 'monthly-retainer',
    name: 'Monthly Retainer',
    description: 'Ongoing website maintenance and marketing support',
    category: 'retainer',
    estimatedPrice: 1500,
    services: ['Website Updates', 'Security Monitoring', 'Analytics Review', 'Priority Support']
  }
]

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  // Only admins can view templates
  if (contact.role !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
  }

  try {
    const supabase = createSupabaseAdmin()

    // Check if we have custom templates in the database
    const { data: customTemplates, error: fetchError } = await supabase
      .from('proposal_templates')
      .select('*')
      .order('name', { ascending: true })

    // If table doesn't exist or is empty, return defaults
    if (fetchError || !customTemplates?.length) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          templates: DEFAULT_TEMPLATES,
          source: 'default'
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        templates: customTemplates,
        source: 'database'
      })
    }

  } catch (error) {
    console.error('Error fetching templates:', error)
    // Fallback to defaults on any error
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        templates: DEFAULT_TEMPLATES,
        source: 'default'
      })
    }
  }
}
