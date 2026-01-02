// Debug: Check Echo contact details
import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const supabase = createSupabaseAdmin()
  
  // Get Echo for Uptrade org
  const { data: echo, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('org_id', '434c6396-9f79-46f4-9889-59caeb231677')
    .eq('is_ai', true)
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ echo, error: error?.message }, null, 2)
  }
}
