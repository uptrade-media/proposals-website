import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

/**
 * Check 2FA status for the current user
 * Returns whether 2FA is enabled and backup code count
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

    // 2. Get user from database
    const sql = neon(process.env.DATABASE_URL)
    
    const userRecord = await sql(
      'SELECT id, email, totp_enabled, backup_codes, last_2fa_check FROM contacts WHERE id = $1',
      [user.sub || user.userId]
    )

    if (!userRecord || !userRecord.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    const dbUser = userRecord[0]

    // 3. Parse backup codes to get count
    let backupCodeCount = 0
    if (dbUser.backup_codes) {
      try {
        const codes = JSON.parse(dbUser.backup_codes)
        backupCodeCount = Array.isArray(codes) ? codes.length : 0
      } catch (err) {
        console.error('[auth-2fa-status] Failed to parse backup codes:', err)
      }
    }

    // 4. Return status
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        totpEnabled: dbUser.totp_enabled,
        backupCodesAvailable: backupCodeCount,
        last2FaCheck: dbUser.last_2fa_check,
        email: dbUser.email,
        warnings: {
          lowBackupCodes: backupCodeCount > 0 && backupCodeCount <= 3,
          noBackupCodes: backupCodeCount === 0 && dbUser.totp_enabled
        }
      })
    }
  } catch (error) {
    console.error('[auth-2fa-status] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check 2FA status' })
    }
  }
}
