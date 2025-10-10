// src/services/docusignService.js
// Thin client that ONLY talks to your Netlify Function.
// No DocuSign secrets/tokens live in the browser.

export async function createEmbeddedSigning(recipient, slug) {
  const res = await fetch('/.netlify/functions/create-embedded-signing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...recipient, slug }),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    throw new Error(`Unexpected response (${res.status})`);
  }

  if (!res.ok || data.error) {
    console.error('create-embedded-signing error:', data);
    throw new Error(data.error || `Failed to start DocuSign (${res.status})`);
  }
  return data; // { signingUrl, envelopeId }
}
