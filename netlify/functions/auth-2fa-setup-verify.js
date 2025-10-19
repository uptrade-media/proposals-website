import jwt from 'jsonwebtoken'
import speakeasy from 'speakeasy'
import crypto from 'crypto'
import { neon } from '@neondatabase/serverless'

/**
 * Verify TOTP token and enable 2FA
 * Generates backup codes and stores secret in database
 */
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

    // 2. Parse request
    const { totpSecret, totpToken } = JSON.parse(event.body || '{}')
    if (!totpSecret || !totpToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing totpSecret or totpToken' })
      }
    }

    // 3. Verify the TOTP token
    const verified = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: 'base32',
      token: totpToken,
      window: 2 // Allow ±2 time windows (±60 seconds)
    })

    if (!verified) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid TOTP token' })
      }
    }

    // 4. Generate backup codes (10 one-time codes)
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    )

    // 5. Store in database
    const sql = neon(process.env.DATABASE_URL)
    
    const userId = user.sub || user.userId
    
    const result = await sql(
      `UPDATE contacts 
       SET totp_secret = $1, 
           totp_enabled = true, 
           backup_codes = $2,
           two_fa_method = 'totp',
           last_2fa_check = NOW()
       WHERE id = $3
       RETURNING id, email, totp_enabled`,
      [totpSecret, JSON.stringify(backupCodes), userId]
    )

    if (!result || !result.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    // 6. Return backup codes to user (ONE TIME ONLY)
    // User must save these immediately
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '2FA enabled successfully',
        backupCodes: backupCodes,
        note: 'Save these backup codes in a secure location. You can use them if you lose access to your authenticator app.'
      })
    }
  } catch (error) {
    console.error('[auth-2fa-setup-verify] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to verify 2FA setup' })
    }
  }
}
