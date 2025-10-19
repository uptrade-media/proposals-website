import jwt from 'jsonwebtoken'
import speakeasy from 'speakeasy'
import { neon } from '@neondatabase/serverless'

/**
 * Verify TOTP token during login
 * Called from /auth/verify-2fa page
 * Creates full session token after verification
 */
export async function handler(event) {
  try {
    // 1. Check for temporary 2FA session token
    const tempToken = event.headers.cookie?.match(/um_session_temp=([^;]+)/)?.[1]
    if (!tempToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No 2FA session found. Please log in again.' })
      }
    }

    let user
    try {
      user = jwt.verify(tempToken, process.env.AUTH_JWT_SECRET)
    } catch (err) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Session expired. Please log in again.' })
      }
    }

    // 2. Parse TOTP token from request
    const { totpToken } = JSON.parse(event.body || '{}')
    if (!totpToken || !totpToken.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing TOTP token' })
      }
    }

    // 3. Get user's TOTP secret from database
    const sql = neon(process.env.DATABASE_URL)
    
    const userRecord = await sql(
      'SELECT id, email, totp_secret, totp_enabled, role FROM contacts WHERE id = $1',
      [user.userId]
    )

    if (!userRecord || !userRecord.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    const dbUser = userRecord[0]

    if (!dbUser.totp_enabled || !dbUser.totp_secret) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '2FA not enabled for this account' })
      }
    }

    // 4. Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: dbUser.totp_secret,
      encoding: 'base32',
      token: totpToken,
      window: 2
    })

    if (!verified) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid TOTP token' })
      }
    }

    // 5. Update last 2FA check timestamp
    await sql(
      'UPDATE contacts SET last_2fa_check = NOW() WHERE id = $1',
      [dbUser.id]
    )

    // 6. Create full session token
    const sessionToken = jwt.sign(
      {
        sub: dbUser.id,
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role
      },
      process.env.AUTH_JWT_SECRET,
      { expiresIn: '8h' }
    )

    // 7. Clear temp session and set full session
    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': [
          `um_session=${sessionToken}; HttpOnly; Path=/; Max-Age=28800; SameSite=Strict`,
          `um_session_temp=; HttpOnly; Path=/; Max-Age=0` // Clear temp token
        ]
      },
      body: JSON.stringify({
        success: true,
        message: '2FA verification successful',
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role
        }
      })
    }
  } catch (error) {
    console.error('[auth-2fa-verify] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to verify 2FA token' })
    }
  }
}
