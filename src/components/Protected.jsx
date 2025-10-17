// src/components/Protected.jsx
import React from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

export default function Protected({ children }) {
  const { slug } = useParams() // works for /p/:slug or undefined for other routes
  const nav = useNavigate()
  const loc = useLocation()
  const [ok, setOk] = React.useState(null)
  const isVerifyingRef = React.useRef(false)
  const lastPathRef = React.useRef(null)

  React.useEffect(() => {
    // Only verify if path actually changed or first mount
    const currentPath = loc.pathname + loc.search
    if (isVerifyingRef.current) {
      console.log('[Protected] Already verifying, skipping')
      return
    }
    
    if (lastPathRef.current === currentPath && ok !== null) {
      console.log('[Protected] Already verified for this path, skipping')
      return
    }
    
    lastPathRef.current = currentPath
    
    let verificationAttempts = 0;
    const maxAttempts = 3;
    
    const verifyAuth = async () => {
      if (verificationAttempts >= maxAttempts) {
        console.error('[Protected] Max verification attempts reached, redirecting to login');
        const next = encodeURIComponent(loc.pathname + loc.search)
        const prefix = slug ? `/login?brand=${encodeURIComponent(slug)}&next=${next}` : `/login?next=${next}`
        nav(prefix, { replace: true })
        isVerifyingRef.current = false
        return;
      }
      
      verificationAttempts++;
      console.log(`[Protected] Verifying auth (attempt ${verificationAttempts}/${maxAttempts})`);
      
      try {
        const res = await fetch('/.netlify/functions/auth-verify', {
          method: 'GET',
          credentials: 'include', // IMPORTANT: send cookie
        })
        
        console.log('[Protected] Auth verify response status:', res.status)
        
        const data = await res.json().catch(() => ({}))
        
        console.log('[Protected] Auth verify data:', data)

        console.log('[Protected] Checking res.ok and data.ok:', { resOk: res.ok, dataOk: data?.ok })

        if (!res.ok || !data?.ok) {
          // Not logged in or token invalid
          console.log('[Protected] Auth verification failed:', data?.error || 'Unknown error');
          const next = encodeURIComponent(loc.pathname + loc.search)
          const prefix = slug ? `/login?brand=${encodeURIComponent(slug)}&next=${next}` : `/login?next=${next}`
          nav(prefix, { replace: true })
          isVerifyingRef.current = false
          return
        }

        console.log('[Protected] Auth checks passed, checking slug:', slug)

        // If a slug is present in the path, make sure user has it
        if (slug) {
          const slugs = Array.isArray(data.user?.slugs) ? data.user.slugs.map(s => String(s).toLowerCase()) : []
          console.log('[Protected] User slugs:', slugs)
          if (!slugs.includes(slug.toLowerCase())) {
            console.log('[Protected] User does not have access to this slug');
            const next = encodeURIComponent(loc.pathname + loc.search)
            nav(`/login?brand=${encodeURIComponent(slug)}&next=${next}`, { replace: true })
            isVerifyingRef.current = false
            return
          }
        }

        console.log('[Protected] Auth verification successful, setting ok=true');
        setOk(true)
        isVerifyingRef.current = false
      } catch (error) {
        console.error('[Protected] Auth verification error:', error);
        const next = encodeURIComponent(loc.pathname + loc.search)
        const prefix = slug ? `/login?brand=${encodeURIComponent(slug)}&next=${next}` : `/login?next=${next}`
        nav(prefix, { replace: true })
        isVerifyingRef.current = false
      }
    };
    
    verifyAuth();
    
    // Cleanup: just reset the verifying flag
    return () => { 
      console.log('[Protected] Cleanup function called, resetting flag')
      isVerifyingRef.current = false
    }
  }, [loc.pathname, loc.search, slug]) // Removed 'nav' to reduce re-renders

  if (ok === null) return null // show a spinner if you want
  return ok ? children : null
}
