import jwt from 'jsonwebtoken'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { neon } from '@neondatabase/serverless'

export async function handler(event) {
  try {
    // 1. Verify authentication
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    let user
    try {
      user = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    } catch (err) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid session' })
      }
    }

    // 2. Check if already has 2FA enabled
    const sql = neon(process.env.DATABASE_URL)
    
    const existingUser = await sql(
      'SELECT totpenabled, id FROM contacts WHERE id = $1',
      [user.sub || user.userId]
    )

    if (!existingUser || !existingUser.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    if (existingUser[0].totp_enabled) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '2FA is already enabled' })
      }
    }

    // 3. Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Uptrade Media Portal (${user.email})`,
      issuer: 'Uptrade Media',
      length: 32
    })

    // 4. Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    // 5. Return secret and QR code (user will verify on next step)
    // Secret is NOT stored yet - only after verification
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        message: 'Scan QR code with authenticator app or enter the code manually'
      })
    }
  } catch (error) {
    console.error('[auth-2fa-setup-initiate] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to initialize 2FA setup' })
    }
  }
}
