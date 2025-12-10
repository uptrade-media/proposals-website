import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

/**
 * Verify backup code during 2FA login
 * Marks used code as consumed
 * Backup codes are one-time use only
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

    // 2. Parse backup code from request
    const { backupCode } = JSON.parse(event.body || '{}')
    if (!backupCode || !backupCode.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing backup code' })
      }
    }

    // 3. Get user's backup codes from database
    const sql = neon(process.env.DATABASE_URL)
    
    const userRecord = await sql(
      'SELECT id, email, backup_codes, role FROM contacts WHERE id = $1',
      [user.userId]
    )

    if (!userRecord || !userRecord.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    const dbUser = userRecord[0]

    if (!dbUser.backup_codes) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No backup codes available' })
      }
    }

    // 4. Parse backup codes
    let codes
    try {
      codes = JSON.parse(dbUser.backup_codes)
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to parse backup codes' })
      }
    }

    // 5. Check if code exists and remove it (one-time use)
    const codeIndex = codes.indexOf(backupCode.toUpperCase())
    if (codeIndex === -1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid backup code' })
      }
    }

    // 6. Remove used code from backup codes list
    codes.splice(codeIndex, 1)

    // 7. Update database
    await sql(
      'UPDATE contacts SET backup_codes = $1, last_2fa_check = NOW() WHERE id = $2',
      [JSON.stringify(codes), dbUser.id]
    )

    // 8. Create full session token
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

    // 9. Clear temp session and set full session
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
        message: 'Backup code verified. Login successful.',
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role
        },
        codesRemaining: codes.length,
        warning: codes.length <= 3 ? 'Only ' + codes.length + ' backup codes remaining. Consider regenerating them.' : null
      })
    }
  } catch (error) {
    console.error('[auth-2fa-recovery] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to verify backup code' })
    }
  }
}
