// src/pages/DocuSignReturn.jsx
import { useEffect } from 'react'
export default function DocuSignReturn() {
  useEffect(() => {
    try { window.parent?.postMessage('docusign:completed', '*') } catch {}
  }, [])
  return (
    <div style={{ padding: 24 }}>
      <h1>Thanks!</h1>
      <p>You can close this window.</p>
    </div>
  )
}
