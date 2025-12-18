// netlify/functions/routes/auth.js
// ═══════════════════════════════════════════════════════════════════════════════
// Authentication Routes
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function handle(ctx) {
  const { method, subPath, segments, supabase, body, query } = ctx
  const action = segments[1]
  
  switch (action) {
    case 'me':
      if (method === 'GET') return await getCurrentUser(ctx)
      break
    case 'login':
      if (method === 'POST') return await login(ctx)
      break
    case 'logout':
      if (method === 'POST') return await logout(ctx)
      break
    case 'google':
      if (method === 'POST') return await googleAuth(ctx)
      break
    case 'verify':
      if (method === 'GET') return await verifySession(ctx)
      break
    case 'switch-org':
      if (method === 'POST') return await switchOrg(ctx)
      break
    case 'forgot':
      if (method === 'POST') return await forgotPassword(ctx)
      break
    case 'reset':
      if (method === 'POST') return await resetPassword(ctx)
      break
  }
  
  return response(404, { error: `Unknown auth action: ${action}` })
}

async function getCurrentUser(ctx) {
  const { contact, organization } = ctx
  
  if (!contact) {
    return response(401, { error: 'Not authenticated' })
  }
  
  return response(200, {
    user: {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      avatar: contact.avatar,
      role: contact.role
    },
    organization: organization ? {
      id: organization.id,
      name: organization.name,
      slug: organization.slug
    } : null
  })
}

async function login(ctx) {
  const { supabase, body } = ctx
  const { email, password } = body
  
  if (!email || !password) {
    return response(400, { error: 'Email and password are required' })
  }
  
  // Find contact
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('id, email, name, password, role, avatar, org_id')
    .eq('email', email.toLowerCase())
    .single()
  
  if (error || !contact) {
    return response(401, { error: 'Invalid credentials' })
  }
  
  // Verify password
  const validPassword = await bcrypt.compare(password, contact.password || '')
  if (!validPassword) {
    return response(401, { error: 'Invalid credentials' })
  }
  
  // Generate JWT
  const token = jwt.sign(
    { contactId: contact.id, email: contact.email, role: contact.role },
    process.env.AUTH_JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  return response(200, {
    user: {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      role: contact.role,
      avatar: contact.avatar
    },
    token
  }, {
    'Set-Cookie': `um_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
  })
}

async function logout(ctx) {
  return response(200, { success: true }, {
    'Set-Cookie': 'um_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  })
}

async function googleAuth(ctx) {
  // Implementation for Google OAuth
  const { body, supabase } = ctx
  const { credential } = body
  
  if (!credential) {
    return response(400, { error: 'Google credential required' })
  }
  
  try {
    // Verify Google token (would use google-auth-library)
    // For now, return placeholder
    return response(501, { error: 'Google auth not implemented in router yet' })
  } catch (error) {
    return response(500, { error: error.message })
  }
}

async function verifySession(ctx) {
  const { headers, supabase } = ctx
  
  const cookie = headers.cookie || ''
  const match = cookie.match(/um_session=([^;]+)/)
  
  if (!match) {
    return response(401, { error: 'No session' })
  }
  
  try {
    const payload = jwt.verify(match[1], process.env.AUTH_JWT_SECRET)
    
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, email, name, role, avatar, org_id')
      .eq('id', payload.contactId)
      .single()
    
    if (!contact) {
      return response(401, { error: 'Invalid session' })
    }
    
    return response(200, {
      valid: true,
      user: contact
    })
  } catch {
    return response(401, { error: 'Invalid session' })
  }
}

async function switchOrg(ctx) {
  const { body, contact, supabase } = ctx
  const { orgId } = body
  
  if (!orgId) {
    return response(400, { error: 'orgId required' })
  }
  
  // Check user has access to org
  const { data: membership } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('user_id', contact.id)
    .eq('org_id', orgId)
    .single()
  
  if (!membership) {
    return response(403, { error: 'No access to this organization' })
  }
  
  // Generate new token with org context
  const token = jwt.sign(
    { contactId: contact.id, email: contact.email, role: contact.role, orgId },
    process.env.AUTH_JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  return response(200, { success: true }, {
    'Set-Cookie': `um_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
  })
}

async function forgotPassword(ctx) {
  const { body, supabase } = ctx
  const { email } = body
  
  if (!email) {
    return response(400, { error: 'Email required' })
  }
  
  // Always return success to prevent email enumeration
  // In background, send reset email if user exists
  
  return response(200, { 
    success: true, 
    message: 'If an account exists, a reset email has been sent' 
  })
}

async function resetPassword(ctx) {
  const { body, supabase } = ctx
  const { token, password } = body
  
  if (!token || !password) {
    return response(400, { error: 'Token and password required' })
  }
  
  // Verify token and reset password
  // Implementation depends on how you handle reset tokens
  
  return response(501, { error: 'Password reset not implemented in router yet' })
}
