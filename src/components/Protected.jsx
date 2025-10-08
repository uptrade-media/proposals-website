// src/components/Protected.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Protected({ children, redirectTo = '/mbfm/login' }) {
  const nav = useNavigate()
  const [ok, setOk] = React.useState(null)

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/.netlify/functions/mbfm-verify', { credentials: 'same-origin' })
        setOk(res.ok)
        if (!res.ok) nav(redirectTo, { replace: true })
      } catch {
        setOk(false)
        nav(redirectTo, { replace: true })
      }
    })()
  }, [nav, redirectTo])

  if (ok === null) return null // or a spinner
  return ok ? children : null
}
