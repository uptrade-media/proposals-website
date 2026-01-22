// src/pages/sync/SyncOAuthCallback.jsx
// OAuth popup callback handler for Sync calendar connections

import { useEffect } from 'react'

export default function SyncOAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payload = {
      type: 'sync-oauth-complete',
      connected: params.get('connected'),
      connectionId: params.get('connectionId'),
      modules: params.get('modules'),
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin)
    }

    // Close the popup after a short delay
    const timer = setTimeout(() => {
      window.close()
    }, 200)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] text-[var(--text)]">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Calendar connected</h1>
        <p className="text-muted-foreground">You can close this window.</p>
      </div>
    </div>
  )
}
