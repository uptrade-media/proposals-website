// Quick dev login - creates a valid session for ramsey@uptrademedia.com
const jwt = require('jsonwebtoken')

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET
const COOKIE_NAME = 'um_session'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days

// Your user data (from database)
const userData = {
  userId: '9e29d44b-1c3b-4618-bf0f-2a6d527b2662',
  email: 'ramsey@uptrademedia.com',
  name: 'Ramsey',
  role: 'admin',
  type: 'google'
}

const token = jwt.sign(userData, AUTH_JWT_SECRET, { expiresIn: '7d' })

console.log('\n✅ Dev login token created!')
console.log('\nCookie to set:')
console.log(`${COOKIE_NAME}=${token}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; SameSite=Lax`)
console.log('\n📋 To use this:')
console.log('1. Open http://localhost:8888')
console.log('2. Open DevTools (F12) → Console')
console.log('3. Paste this:')
console.log(`document.cookie = "${COOKIE_NAME}=${token}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax"`)
console.log('4. Refresh the page')
console.log('5. You should be logged in as admin\n')
