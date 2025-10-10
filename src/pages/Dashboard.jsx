// src/pages/Dashboard.jsx
import { Link } from 'react-router-dom'
import React from 'react'

export default function Dashboard() {
  const [user, setUser] = React.useState(null)
  React.useEffect(() => {
    fetch('/.netlify/functions/auth-verify', { credentials: 'include' })
      .then(r => r.json()).then(d => setUser(d.user)).catch(() => setUser(null))
  }, [])

  const slugs = user?.slugs || []
  return (
    <section className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Your Proposals</h1>
      <ul className="grid sm:grid-cols-2 gap-6">
        {slugs.map(s => (
          <li key={s} className="border rounded-xl p-6">
            <div className="font-semibold mb-2">{s.toUpperCase()}</div>
            <Link className="text-amber-700 underline" to={`/p/${s}`}>Open</Link>
          </li>
        ))}
      </ul>
      {slugs.length === 0 && <p>No proposals assigned to your account.</p>}
    </section>
  )
}
