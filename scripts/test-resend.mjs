// Test Resend email sending
import { Resend } from 'resend'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const resend = new Resend(process.env.RESEND_API_KEY)

async function testEmail() {
  try {
    console.log('Testing Resend email...')
    console.log('API Key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...')
    console.log('From:', process.env.RESEND_FROM_EMAIL)
    console.log('To:', process.env.ADMIN_EMAIL)
    
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: 'Test Email from Quick Invoice',
      html: '<h1>Test Email</h1><p>If you receive this, Resend is working correctly.</p>'
    })
    
    console.log('\n✅ Email sent successfully!')
    console.log('Result:', result)
  } catch (error) {
    console.error('\n❌ Email failed:')
    console.error('Error:', error.message)
    console.error('Details:', error)
  }
}

testEmail()
