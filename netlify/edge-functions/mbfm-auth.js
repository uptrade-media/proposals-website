// netlify/edge-functions/mbfm-auth.js
export default async (request, context) => {
  const url = new URL(request.url)

  // allow the home page (login), assets, and login/logout functions
  const allowList = ['/', '/favicon.ico']
  if (allowList.includes(url.pathname) || url.pathname.startsWith('/assets/')) {
    return context.next()
  }

  if (!url.pathname.startsWith('/mbfm')) {
    return context.next()
  }

  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)mbfmAuth=([^;]+)/)
  if (!match) {
    const next = encodeURIComponent(url.pathname + url.search)
    return Response.redirect(new URL(`/?next=${next}`, url), 302)
  }

  const [payload, sig] = match[1].split('.')
  try {
    const data = JSON.parse(atob(payload))
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      const next = encodeURIComponent(url.pathname + url.search)
      return Response.redirect(new URL(`/?next=${next}`, url), 302)
    }

    // verify signature
    const SECRET = Deno.env.get('MBFM_SECRET') || 'change-me'
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigBytes = Uint8Array.from(
      atob(sig.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0)
    )
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload))
    if (!ok) {
      const next = encodeURIComponent(url.pathname + url.search)
      return Response.redirect(new URL(`/?next=${next}`, url), 302)
    }

    return context.next()
  } catch {
    const next = encodeURIComponent(url.pathname + url.search)
    return Response.redirect(new URL(`/?next=${next}`, url), 302)
  }
}
