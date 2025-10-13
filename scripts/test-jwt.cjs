// Test JWT verification
const jwt = require('jsonwebtoken')

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET

console.log('AUTH_JWT_SECRET exists:', !!AUTH_JWT_SECRET)
console.log('JWT_SECRET exists:', !!JWT_SECRET)
console.log('AUTH_JWT_SECRET length:', AUTH_JWT_SECRET?.length)

// Get cookie from command line arg
const token = process.argv[2]

if (!token) {
  console.log('\nUsage: node test-jwt.cjs <token>')
  console.log('Get your token from browser cookies (um_session)')
  process.exit(1)
}

console.log('\n--- Testing with AUTH_JWT_SECRET ---')
try {
  const payload = jwt.verify(token, AUTH_JWT_SECRET)
  console.log('✅ Token valid with AUTH_JWT_SECRET')
  console.log('Payload:', JSON.stringify(payload, null, 2))
} catch (err) {
  console.log('❌ Token invalid with AUTH_JWT_SECRET:', err.message)
}

if (JWT_SECRET) {
  console.log('\n--- Testing with JWT_SECRET ---')
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    console.log('✅ Token valid with JWT_SECRET')
    console.log('Payload:', JSON.stringify(payload, null, 2))
  } catch (err) {
    console.log('❌ Token invalid with JWT_SECRET:', err.message)
  }
}
