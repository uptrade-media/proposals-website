import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Read .env.local
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
)

async function check() {
  const projectId = '5050fc30-24d7-4bb3-93c3-7020b71c2be4'
  
  // Get the latest session
  const { data: session } = await supabase
    .from('analytics_sessions')
    .select('session_id, started_at, browser, os')
    .eq('project_id', projectId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  console.log('Latest session:', session)

  if (session) {
    // Get page views for this session
    const { data: pvs } = await supabase
      .from('analytics_page_views')
      .select('created_at, browser, path')
      .eq('session_id', session.session_id)
      .order('created_at', { ascending: true })
    
    console.log('\nPage views in this session:')
    pvs?.forEach(p => console.log(' ', p.created_at?.slice(0,16), 'browser:', p.browser, 'path:', p.path))
  }
  
  // Check if heatmap clicks work - look in all projects
  console.log('\n=== ALL HEATMAP CLICKS (recent) ===')
  const { data: allClicks } = await supabase
    .from('analytics_heatmap_clicks')
    .select('page_path, element_tag, element_text, created_at, project_id')
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log('Found', allClicks?.length || 0, 'total heatmap clicks')
  allClicks?.forEach(c => console.log(' ', c.created_at?.slice(0,16), c.element_tag, c.page_path, 'proj:', c.project_id?.slice(0,8)))
}

check()
