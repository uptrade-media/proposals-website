// Check if invoice has payment token
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkLatestInvoice() {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, total_amount, payment_token, payment_token_expires, sent_to_email, sent_at, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    console.error('Error fetching invoices:', error)
    return
  }

  console.log('\n=== Latest 3 Invoices ===\n')
  invoices.forEach(inv => {
    console.log(`Invoice: ${inv.invoice_number}`)
    console.log(`  ID: ${inv.id}`)
    console.log(`  Amount: $${inv.amount}`)
    console.log(`  Total: $${inv.total_amount}`)
    console.log(`  Status: ${inv.status}`)
    console.log(`  Sent To: ${inv.sent_to_email || 'N/A'}`)
    console.log(`  Sent At: ${inv.sent_at || 'N/A'}`)
    console.log(`  Payment Token: ${inv.payment_token ? inv.payment_token.substring(0, 20) + '...' : 'MISSING'}`)
    console.log(`  Token Expires: ${inv.payment_token_expires || 'N/A'}`)
    console.log(`  Created: ${inv.created_at}`)
    console.log()
  })
}

checkLatestInvoice()
