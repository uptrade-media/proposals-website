export default async (request, context) => {
  const url = new URL(request.url)

  // Allow the login page and assets
  if (url.pathname.startsWith('/mbfm/login')) {
    return context.next()
  }

  if (!url.pathname.startsWith('/mbfm')) {
    return context.next()
  }

  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\\s*)mbfmAuth=([^;]+)/)
  if (!match) {
    return Response.redirect(new URL('/mbfm/login', url), 302)
  }

  const [payload, sig] = match[1].split('.')
  try {
    const data = JSON.parse(atob(payload))
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      return Response.redirect(new URL('/mbfm/login', url), 302)
    }

    const SECRET = Deno.env.get('MBFM_SECRET') || 'change-me-long-random'
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigBytes = Uint8Array.from(
      atob(sig.replaceAll('-','+').replaceAll('_','/')),
      c => c.charCodeAt(0)
    )
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload))
    if (!ok) {
      return Response.redirect(new URL('/mbfm/login', url), 302)
    }

    return context.next()
  } catch {
    return Response.redirect(new URL('/mbfm/login', url), 302)
  }
}
