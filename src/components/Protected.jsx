// src/components/Protected.jsx
import React from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

export default function Protected({ children }) {
  const { slug } = useParams() // works for /p/:slug or undefined for other routes
  const nav = useNavigate()
  const loc = useLocation()
  const [ok, setOk] = React.useState(null)

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/.netlify/functions/auth-verify', {
          method: 'GET',
          credentials: 'include', // IMPORTANT: send cookie
        })
        const data = await res.json().catch(() => ({}))

        if (!alive) return

        if (!res.ok || !data?.ok) {
          // Not logged in or token invalid
          const next = encodeURIComponent(loc.pathname + loc.search)
          const prefix = slug ? `/login?brand=${encodeURIComponent(slug)}&next=${next}` : `/login?next=${next}`
          nav(prefix, { replace: true })
          return
        }

        // If a slug is present in the path, make sure user has it
        if (slug) {
          const slugs = Array.isArray(data.user?.slugs) ? data.user.slugs.map(s => String(s).toLowerCase()) : []
          if (!slugs.includes(slug.toLowerCase())) {
            const next = encodeURIComponent(loc.pathname + loc.search)
            nav(`/login?brand=${encodeURIComponent(slug)}&next=${next}`, { replace: true })
            return
          }
        }

        setOk(true)
      } catch {
        const next = encodeURIComponent(loc.pathname + loc.search)
        const prefix = slug ? `/login?brand=${encodeURIComponent(slug)}&next=${next}` : `/login?next=${next}`
        nav(prefix, { replace: true })
      }
    })()
    return () => { alive = false }
  }, [nav, loc.pathname, loc.search, slug])

  if (ok === null) return null // show a spinner if you want
  return ok ? children : null
}
