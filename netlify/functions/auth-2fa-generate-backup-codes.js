import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { neon } from '@neondatabase/serverless'

/**
 * Generate new backup codes
 * Replaces existing backup codes
 * Requires password verification for security
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

    // 6. Generate new backup codes (10 one-time codes)
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    )

    // 7. Update database
    await sql(
      'UPDATE contacts SET backup_codes = $1 WHERE id = $2',
      [JSON.stringify(backupCodes), dbUser.id]
    )

    // 8. Return new backup codes
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'New backup codes generated successfully',
        backupCodes: backupCodes,
        note: 'Save these new codes. Your previous codes are no longer valid.'
      })
    }
  } catch (error) {
    console.error('[auth-2fa-generate-backup-codes] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate backup codes' })
    }
  }
}
