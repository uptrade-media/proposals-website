// Debug function to check Echo setup
import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  try {
    const supabase = createSupabaseAdmin()
    
    // Get all contacts with is_ai flag
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, name, email, is_ai, contact_type, org_id, avatar_url, always_available')
      .eq('is_ai', true)
    
    if (contactsError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: contactsError.message })
      }
    }
    
    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
    
    // Get sample messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id, thread_type, is_echo_response')
      .limit(10)
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        echo_contacts: contacts,
        echo_count: contacts?.length || 0,
        organizations: orgs,
        org_count: orgs?.length || 0,
        sample_messages: messages,
        diagnosis: contacts && contacts.length > 0 
          ? `✅ Found ${contacts.length} Echo contact(s) for ${orgs?.length || 0} org(s)`
          : `❌ No Echo contacts found. Expected ${orgs?.length || 0} Echo contacts (one per org).`
      }, null, 2)
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    }
  }
}
