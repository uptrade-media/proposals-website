// Setup Supabase Storage Buckets
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupStorage() {
  console.log('[Storage] Setting up Supabase storage buckets...')
  
  // Check if uploads bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  
  if (listError) {
    console.error('[Storage] Error listing buckets:', listError)
    return
  }
  
  const uploadsExists = buckets.some(b => b.name === 'uploads')
  
  if (!uploadsExists) {
    console.log('[Storage] Creating "uploads" bucket...')
    const { data, error } = await supabase.storage.createBucket('uploads', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']
    })
    
    if (error) {
      console.error('[Storage] Error creating bucket:', error)
      return
    }
    
    console.log('✅ Created "uploads" bucket')
  } else {
    console.log('✅ "uploads" bucket already exists')
  }
  
  console.log('\n[Storage] Setup complete!')
  console.log('Buckets:', buckets.map(b => b.name).join(', '))
}

setupStorage()
