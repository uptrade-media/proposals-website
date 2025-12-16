// netlify/functions/admin-tenants-update.js
// Update organization details and feature flags - super admin only
import { createSupabasePublic, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
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
      id,
      name, 
      domain, 
      features,
      crm_fields,
      theme,
      plan,
      status
    } = body

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Organization id is required' })
      }
    }

    const supabase = createSupabasePublic()

    // Get current organization
    const { data: currentOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentOrg) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Organization not found' })
      }
    }

    // Build update object (only include provided fields)
    const updates = {}
    
    if (name !== undefined) updates.name = name
    if (domain !== undefined) updates.domain = domain
    if (plan !== undefined) updates.plan = plan
    if (status !== undefined) updates.status = status
    
    if (features !== undefined) {
      // Merge with existing features
      updates.features = { ...currentOrg.features, ...features }
    }
    
    if (crm_fields !== undefined) {
      updates.crm_fields = crm_fields
    }
    
    if (theme !== undefined) {
      updates.theme = { ...currentOrg.theme, ...theme }
    }

    // Check if any new features were enabled (we may need to create tables)
    const newFeatures = []
    if (features) {
      for (const [key, enabled] of Object.entries(features)) {
        if (enabled && !currentOrg.features[key]) {
          newFeatures.push(key)
        }
      }
    }

    // Update organization
    const { data: organization, error: updateError } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[AdminTenants] Error updating organization:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update organization' })
      }
    }

    // Create tables for newly enabled features
    if (newFeatures.length > 0) {
      for (const featureKey of newFeatures) {
        await createFeatureTables(supabase, currentOrg.schema_name, featureKey)
      }
    }

    // Log the action
    await supabase
      .from('org_access_logs')
      .insert({
        user_email: user.email,
        organization_id: id,
        action: 'update',
        resource_type: 'tenant',
        metadata: { 
          updates,
          newFeatures: newFeatures.length > 0 ? newFeatures : undefined
        }
      })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        organization,
        newFeaturesEnabled: newFeatures,
        message: `Organization "${organization.name}" updated successfully`
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
 * Create tables for a specific feature (same as in create function)
 */
async function createFeatureTables(supabase, schemaName, featureKey) {
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
        `
      })
      break

    case 'seo':
      await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ${schemaName}.seo_sites (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            domain TEXT UNIQUE NOT NULL,
            gsc_property_url TEXT,
            gsc_connected BOOLEAN DEFAULT false,
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS ${schemaName}.seo_pages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            site_id UUID REFERENCES ${schemaName}.seo_sites(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            title TEXT,
            meta_description TEXT,
            h1 TEXT,
            target_keyword TEXT,
            word_count INTEGER,
            last_crawled_at TIMESTAMPTZ,
            indexing_status TEXT DEFAULT 'unknown',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS ${schemaName}.seo_queries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            site_id UUID REFERENCES ${schemaName}.seo_sites(id) ON DELETE CASCADE,
            page_id UUID REFERENCES ${schemaName}.seo_pages(id),
            query TEXT NOT NULL,
            clicks INTEGER DEFAULT 0,
            impressions INTEGER DEFAULT 0,
            ctr NUMERIC(5,4) DEFAULT 0,
            position NUMERIC(5,2) DEFAULT 0,
            date DATE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_seo_queries_date ON ${schemaName}.seo_queries(date);
        `
      })
      break

    default:
      console.log(`[AdminTenants] No table creation defined for feature: ${featureKey}`)
  }
}
