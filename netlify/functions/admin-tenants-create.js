// netlify/functions/admin-tenants-create.js
// Create a new organization (tenant) - super admin only
// This creates the org record, schema, and initial tables
import { createSupabasePublic, getAuthenticatedUser } from './utils/supabase.js'

// Available features that can be enabled per tenant
const AVAILABLE_FEATURES = {
  analytics: { label: 'Website Analytics', tables: ['sessions', 'page_views', 'scroll_depth'] },
  blog: { label: 'Blog Manager', tables: ['blog_posts'] },
  crm: { label: 'Lead Management', tables: ['contacts', 'activities', 'notes'] },
  projects: { label: 'Projects', tables: ['projects'], adminOnly: true },
  proposals: { label: 'Proposals', tables: ['proposals', 'proposal_line_items'], adminOnly: true },
  billing: { label: 'Invoices & Payments', tables: ['invoices', 'invoice_items', 'payments'] },
  ecommerce: { label: 'Products & Orders', tables: ['products', 'orders', 'order_items'] },
  files: { label: 'File Manager', tables: ['files'] },
  messages: { label: 'Messages', tables: ['messages'] },
  email_manager: { label: 'Outreach', tables: ['email_campaigns', 'email_tracking', 'sms_campaigns'] },
  seo: { label: 'SEO Manager', tables: ['seo_sites', 'seo_pages', 'seo_queries'] }
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // Verify authentication
  const { user, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  if (!isSuperAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Super admin access required' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      name, 
      slug, 
      domain, 
      features = {},
      crm_fields = [],
      theme = {},
      plan = 'free',
      adminEmail,
      adminName
    } = body

    // Validate required fields
    if (!name || !slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name and slug are required' })
      }
    }

    // Validate slug format (alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Slug must be lowercase alphanumeric with hyphens only' })
      }
    }

    const supabase = createSupabasePublic()
    const schemaName = `org_${slug.replace(/-/g, '_')}`

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Organization with this slug already exists' })
      }
    }

    // Build features object with defaults
    const orgFeatures = {
      analytics: features.analytics ?? false,
      blog: features.blog ?? false,
      crm: features.crm ?? false,
      projects: features.projects ?? false,
      proposals: features.proposals ?? false,
      billing: features.billing ?? false,
      ecommerce: features.ecommerce ?? false,
      files: features.files ?? true, // Files enabled by default
      messages: features.messages ?? true, // Messages enabled by default
      email_manager: features.email_manager ?? false,
      seo: features.seo ?? false
    }

    // Create organization record
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        domain: domain || null,
        schema_name: schemaName,
        features: orgFeatures,
        crm_fields,
        theme: {
          primaryColor: theme.primaryColor || '#4bbf39',
          logoUrl: theme.logoUrl || null,
          faviconUrl: theme.faviconUrl || null
        },
        plan,
        status: 'active'
      })
      .select()
      .single()

    if (orgError) {
      console.error('[AdminTenants] Error creating organization:', orgError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create organization: ' + orgError.message })
      }
    }

    // Create secrets record (empty - will be populated via UI)
    await supabase
      .from('organization_secrets')
      .insert({ organization_id: organization.id })

    // Create schema using SQL
    const { error: schemaError } = await supabase.rpc('execute_sql', {
      sql: `CREATE SCHEMA IF NOT EXISTS ${schemaName};`
    })

    if (schemaError) {
      console.error('[AdminTenants] Error creating schema:', schemaError)
      // Clean up org record if schema creation failed
      await supabase.from('organizations').delete().eq('id', organization.id)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create database schema' })
      }
    }

    // Grant permissions on the new schema
    await supabase.rpc('execute_sql', {
      sql: `
        GRANT USAGE ON SCHEMA ${schemaName} TO service_role;
        GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO service_role;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schemaName} TO service_role;
        GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;
        GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO authenticated;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schemaName} TO authenticated;
      `
    })

    // Create base tables that every tenant needs
    await createBaseTables(supabase, schemaName)

    // Create feature-specific tables based on enabled features
    for (const [featureKey, enabled] of Object.entries(orgFeatures)) {
      if (enabled && AVAILABLE_FEATURES[featureKey]) {
        await createFeatureTables(supabase, schemaName, featureKey)
      }
    }

    // Add admin user if provided
    if (adminEmail) {
      await supabase
        .from('user_organizations')
        .insert({
          user_email: adminEmail,
          organization_id: organization.id,
          role: 'owner',
          is_primary: true
        })

      // Create contact record in the new org schema
      // Note: We can't easily insert into the new schema from here
      // The admin will need to sign up or be created separately
    }

    // Log the action
    await supabase
      .from('org_access_logs')
      .insert({
        user_email: user.email,
        organization_id: organization.id,
        action: 'create',
        resource_type: 'tenant',
        metadata: { name, slug, features: orgFeatures }
      })

    // Generate tracking script
    const baseUrl = process.env.URL || 'https://portal.uptrademedia.com'
    const trackingScript = `<!-- Uptrade Portal Analytics -->
<script>
  window.UPTRADE_CONFIG = {
    orgId: '${organization.id}',
    orgSlug: '${organization.slug}',
    apiEndpoint: '${baseUrl}/.netlify/functions'
  };
</script>
<script src="${baseUrl}/tracking.js" defer></script>
<!-- End Uptrade Portal Analytics -->`

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        organization,
        trackingScript,
        message: `Organization "${name}" created successfully`
      })
    }
  } catch (error) {
    console.error('[AdminTenants] Exception:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * Create base tables that every tenant needs
 */
async function createBaseTables(supabase, schemaName) {
  // Contacts table (every tenant needs this)
  await supabase.rpc('execute_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ${schemaName}.contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auth_user_id UUID,
        email TEXT UNIQUE,
        name TEXT,
        phone TEXT,
        company TEXT,
        website TEXT,
        role TEXT DEFAULT 'client',
        avatar TEXT,
        google_id TEXT,
        notes TEXT,
        tags JSONB DEFAULT '[]',
        source TEXT DEFAULT 'manual',
        pipeline_stage TEXT DEFAULT 'new',
        account_setup TEXT DEFAULT 'false',
        custom_fields JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_${schemaName.replace('org_', '')}_contacts_email 
        ON ${schemaName}.contacts(email);
    `
  })
}

/**
 * Create tables for a specific feature
 */
async function createFeatureTables(supabase, schemaName, featureKey) {
  // For now, we'll add table creation SQL for each feature as needed
  // This can be expanded with more complex migrations

  switch (featureKey) {
    case 'analytics':
      await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${schemaName}.sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            visitor_id TEXT NOT NULL,
            started_at TIMESTAMPTZ DEFAULT NOW(),
            ended_at TIMESTAMPTZ,
            page_count INTEGER DEFAULT 0,
            referrer TEXT,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            device_type TEXT,
            browser TEXT,
            country TEXT,
            city TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS ${schemaName}.page_views (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID REFERENCES ${schemaName}.sessions(id),
            path TEXT NOT NULL,
            title TEXT,
            time_on_page INTEGER,
            scroll_depth INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_${schemaName.replace('org_', '')}_sessions_visitor 
            ON ${schemaName}.sessions(visitor_id);
          CREATE INDEX IF NOT EXISTS idx_${schemaName.replace('org_', '')}_pageviews_session 
            ON ${schemaName}.page_views(session_id);
        `
      })
      break

    case 'files':
      await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${schemaName}.files (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            contact_id UUID REFERENCES ${schemaName}.contacts(id),
            filename TEXT NOT NULL,
            storage_path TEXT NOT NULL,
            mime_type TEXT,
            file_size INTEGER,
            category TEXT DEFAULT 'general',
            is_public BOOLEAN DEFAULT false,
            uploaded_by UUID,
            uploaded_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      })
      break

    case 'messages':
      await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${schemaName}.messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            contact_id UUID REFERENCES ${schemaName}.contacts(id),
            thread_id UUID,
            sender_email TEXT NOT NULL,
            recipient_email TEXT NOT NULL,
            subject TEXT,
            body TEXT,
            is_read BOOLEAN DEFAULT false,
            attachments JSONB DEFAULT '[]',
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_${schemaName.replace('org_', '')}_messages_contact 
            ON ${schemaName}.messages(contact_id);
          CREATE INDEX IF NOT EXISTS idx_${schemaName.replace('org_', '')}_messages_thread 
            ON ${schemaName}.messages(thread_id);
        `
      })
      break

    case 'billing':
      await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${schemaName}.invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            contact_id UUID REFERENCES ${schemaName}.contacts(id),
            invoice_number TEXT UNIQUE,
            status TEXT DEFAULT 'draft',
            subtotal INTEGER DEFAULT 0,
            tax INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            due_date TIMESTAMPTZ,
            paid_at TIMESTAMPTZ,
            payment_method TEXT,
            square_invoice_id TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS ${schemaName}.invoice_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID REFERENCES ${schemaName}.invoices(id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            unit_price INTEGER NOT NULL,
            total INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      })
      break

    case 'blog':
      await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${schemaName}.blog_posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            excerpt TEXT,
            content TEXT,
            content_html TEXT,
            featured_image TEXT,
            author TEXT,
            category TEXT,
            tags JSONB DEFAULT '[]',
            meta_title TEXT,
            meta_description TEXT,
            status TEXT DEFAULT 'draft',
            featured BOOLEAN DEFAULT false,
            published_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_${schemaName.replace('org_', '')}_posts_slug 
            ON ${schemaName}.blog_posts(slug);
          CREATE INDEX IF NOT EXISTS idx_${schemaName.replace('org_', '')}_posts_status 
            ON ${schemaName}.blog_posts(status);
        `
      })
      break

    // Add more feature cases as needed
    default:
      console.log(`[AdminTenants] No table creation defined for feature: ${featureKey}`)
  }
}
