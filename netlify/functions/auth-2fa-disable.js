import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

/**
 * Disable two-factor authentication
 * Requires password verification for security
 * Clears TOTP secret and backup codes
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
    const { password } = JSON.parse(event.body || '{}')
    if (!password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Password is required' })
      }
    }

    // 3. Get user from database
    const sql = neon(process.env.DATABASE_URL)
    
    const userRecord = await sql(
      'SELECT id, password, totp_enabled FROM contacts WHERE id = $1',
      [user.sub || user.userId]
    )

    if (!userRecord || !userRecord.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    const dbUser = userRecord[0]

    // 4. Check if 2FA is enabled
    if (!dbUser.totp_enabled) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '2FA is not enabled' })
      }
    }

    // 5. Verify password (security check)
    const bcrypt = require('bcryptjs')
    const passwordValid = await bcrypt.compare(password, dbUser.password)

    if (!passwordValid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid password' })
      }
    }

    // 6. Disable 2FA in database
    await sql(
      `UPDATE contacts 
       SET totp_enabled = false,
           totp_secret = NULL,
           backup_codes = NULL,
           two_fa_method = 'totp'
       WHERE id = $1`,
      [dbUser.id]
    )

    // 7. Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '2FA has been disabled successfully',
        warning: 'Your account is now less secure. Consider enabling 2FA again.'
      })
    }
  } catch (error) {
    console.error('[auth-2fa-disable] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to disable 2FA' })
    }
  }
}
