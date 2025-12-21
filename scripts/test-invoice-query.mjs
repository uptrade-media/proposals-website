import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const token = '3026b0ac5ec9da4fb2f8858437d5c567ed4b19d39aafe0da83f12eb172b74810'

// Test 1: Just get the invoice
const { data: inv1, error: e1 } = await supabase
  .from('invoices')
  .select('*')
  .eq('payment_token', token)
  .single()

console.log('Test 1 - Simple select:', inv1 ? 'FOUND' : 'NOT FOUND', e1?.message || '')

// Test 2: Try with explicit FK
const { data: inv2, error: e2 } = await supabase
  .from('invoices')
  .select('*, contact:contacts!invoices_contact_id_fkey(id, name, email)')
  .eq('payment_token', token)
  .single()

console.log('Test 2 - With FK name:', inv2 ? 'FOUND' : 'NOT FOUND', e2?.message || '')

// Test 3: Fetch contact separately
if (inv1) {
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, name, email')
    .eq('id', inv1.contact_id)
    .single()
  
  console.log('Test 3 - Contact:', contact ? contact.name : 'NOT FOUND')
}
