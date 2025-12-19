// scripts/update-gwa-features.mjs
// Update GWA's tenant features to include all modules

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GWA_PROJECT_ID = 'e0f443de-6ea8-4200-9e9b-afa000348fe7'

async function updateFeatures() {
  console.log('Updating GWA tenant features...')
  
  const features = [
    'analytics',
    'blog', 
    'seo',
    'email',
    'ecommerce',
    'forms',
    'clients'
  ]
  
  const { data, error } = await supabase
    .from('projects')
    .update({ 
      tenant_features: features,
      updated_at: new Date().toISOString()
    })
    .eq('id', GWA_PROJECT_ID)
    .select()
    .single()
  
  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
  
  console.log('✓ Updated GWA features:', data.tenant_features)
}

updateFeatures()
