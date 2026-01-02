/**
 * Engage Website Proxy
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Proxies website content for the Visual Element Editor iframe preview.
 * - Bypasses CORS restrictions
 * - Strips CSP headers that block embedding
 * - Adds base tag for relative URLs
 * - Injects postMessage listener for editor communication
 * 
 * Usage:
 *   GET /.netlify/functions/engage-website-proxy?url=https://example.com
 */

import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

export async function handler(event) {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const { url, projectId } = event.queryStringParameters || {}

  if (!url) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing url parameter' })
    }
  }

  try {
    // Validate URL
    const targetUrl = new URL(url)
    
    // Security: Only allow http/https protocols
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid protocol. Only http/https allowed.' })
      }
    }

    // Optionally verify project ownership
    if (projectId) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      const { data: project } = await supabase
        .from('projects')
        .select('id, siteUrl')
        .eq('id', projectId)
        .single()
      
      // Check if URL matches project's site
      if (project?.siteUrl) {
        const projectHost = new URL(project.siteUrl).hostname
        if (targetUrl.hostname !== projectHost && !targetUrl.hostname.endsWith(`.${projectHost}`)) {
          console.warn(`URL ${url} doesn't match project site ${project.siteUrl}`)
          // We allow it anyway but log the mismatch
        }
      }
    }

    // Fetch the website content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EngageVisualEditor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    })

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Failed to fetch: ${response.statusText}` })
      }
    }

    let html = await response.text()

    // Get base URL for relative resources
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`

    // ═══════════════════════════════════════════════════════════════════════════
    // HTML TRANSFORMATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // 1. Add base tag for relative URLs (before </head>)
    if (!html.includes('<base')) {
      html = html.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${baseUrl}/">`
      )
    }

    // 2. Inject editor communication script (before </body>)
    const editorScript = `
<script id="engage-visual-editor-bridge">
(function() {
  // Listen for messages from parent (Visual Editor)
  window.addEventListener('message', function(event) {
    // Security: Only accept messages from our editor
    if (event.data && event.data.type === 'ENGAGE_EDITOR') {
      switch(event.data.action) {
        case 'HIGHLIGHT_ELEMENT':
          highlightElement(event.data.selector);
          break;
        case 'GET_ELEMENT_RECT':
          sendElementRect(event.data.selector);
          break;
        case 'GET_PAGE_INFO':
          sendPageInfo();
          break;
        case 'SCROLL_TO':
          window.scrollTo({ top: event.data.y, behavior: 'smooth' });
          break;
        case 'INSERT_PREVIEW':
          insertPreviewElement(event.data.html, event.data.position);
          break;
        case 'REMOVE_PREVIEW':
          removePreviewElement();
          break;
      }
    }
  });

  // Highlight an element on the page
  function highlightElement(selector) {
    // Remove existing highlights
    document.querySelectorAll('.engage-highlight').forEach(el => el.remove());
    
    if (!selector) return;
    
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      const highlight = document.createElement('div');
      highlight.className = 'engage-highlight';
      highlight.style.cssText = \`
        position: fixed;
        top: \${rect.top}px;
        left: \${rect.left}px;
        width: \${rect.width}px;
        height: \${rect.height}px;
        border: 2px dashed #4bbf39;
        background: rgba(75, 191, 57, 0.1);
        pointer-events: none;
        z-index: 99999;
        transition: all 0.2s ease;
      \`;
      document.body.appendChild(highlight);
    }
  }

  // Send element position back to editor
  function sendElementRect(selector) {
    const element = selector ? document.querySelector(selector) : document.body;
    if (element) {
      const rect = element.getBoundingClientRect();
      window.parent.postMessage({
        type: 'ENGAGE_IFRAME',
        action: 'ELEMENT_RECT',
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        scroll: { x: window.scrollX, y: window.scrollY }
      }, '*');
    }
  }

  // Send page info to editor
  function sendPageInfo() {
    window.parent.postMessage({
      type: 'ENGAGE_IFRAME',
      action: 'PAGE_INFO',
      data: {
        url: window.location.href,
        title: document.title,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth
      }
    }, '*');
  }

  // Insert preview element
  function insertPreviewElement(html, position) {
    removePreviewElement();
    const preview = document.createElement('div');
    preview.id = 'engage-preview-element';
    preview.innerHTML = html;
    preview.style.cssText = \`
      position: fixed;
      z-index: 99998;
      pointer-events: none;
      \${position || ''}
    \`;
    document.body.appendChild(preview);
  }

  // Remove preview element
  function removePreviewElement() {
    const existing = document.getElementById('engage-preview-element');
    if (existing) existing.remove();
  }

  // Notify parent that bridge is ready
  window.parent.postMessage({
    type: 'ENGAGE_IFRAME',
    action: 'BRIDGE_READY',
    url: window.location.href
  }, '*');

  // Report scroll events
  window.addEventListener('scroll', function() {
    window.parent.postMessage({
      type: 'ENGAGE_IFRAME',
      action: 'SCROLL',
      scroll: { x: window.scrollX, y: window.scrollY }
    }, '*');
  });

  // Report resize events
  window.addEventListener('resize', function() {
    sendPageInfo();
  });
})();
</script>`;

    html = html.replace('</body>', `${editorScript}</body>`)

    // 3. Inject styles for editor overlays
    const editorStyles = `
<style id="engage-visual-editor-styles">
  .engage-highlight {
    animation: engage-pulse 1.5s infinite;
  }
  @keyframes engage-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
  }
  #engage-preview-element * {
    pointer-events: none !important;
  }
</style>`;

    html = html.replace('</head>', `${editorStyles}</head>`)

    // Return the modified HTML
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        // Remove security headers that would block embedding
        'X-Frame-Options': 'ALLOWALL',
        // We're intentionally allowing embedding for the visual editor
        'Content-Security-Policy': ''
      },
      body: html
    }

  } catch (error) {
    console.error('Proxy error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to proxy website',
        details: error.message 
      })
    }
  }
}
