// netlify/functions/tracking-script.js
// Serves a universal analytics tracking script
// Embeds as: <script src="https://portal.uptrademedia.com/.netlify/functions/tracking-script"></script>

export async function handler(event) {
  // Return JavaScript tracking script (not JSON)
  const script = `
(function() {
  const PORTAL_API = 'https://portal.uptrademedia.com/.netlify/functions';
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  // Track page count and engagement metrics
  let pageCount = 1;
  let eventCount = 0;
  let sessionStartTime = Date.now();
  let lastActivityTime = Date.now();
  let maxScrollDepth = 0;
  let sessionScrollTimes = { 25: null, 50: null, 75: null, 100: null };
  
  // Get visitor and session IDs
  function getVisitorId() {
    let vid = localStorage.getItem('_vid');
    if (!vid) {
      vid = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('_vid', vid);
    }
    return vid;
  }
  
  function getSessionId() {
    const now = Date.now();
    let sid = sessionStorage.getItem('_sid');
    const lastActivity = parseInt(sessionStorage.getItem('_sla') || '0');
    
    if (!sid || (now - lastActivity) > SESSION_TIMEOUT) {
      sid = 's_' + now + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('_sid', sid);
      sessionStartTime = now;
    }
    sessionStorage.setItem('_sla', now.toString());
    lastActivityTime = now;
    
    return sid;
  }
  
  // Parse URL parameters for UTM tracking
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmTerm: params.get('utm_term'),
      utmContent: params.get('utm_content')
    };
  }
  
  // Resolve domain to tenant ID
  let resolvedTenantId = null;
  const domain = window.location.hostname;
  
  // Auto-detect tenant ID from domain
  if (domain.includes('uptrademedia.com')) {
    resolvedTenantId = 'UM-UPTRADE01';
  } else {
    // Try to resolve via API (for other tenant domains)
    fetch(PORTAL_API + '/domain-resolve?domain=' + domain)
      .then(r => r.json())
      .then(data => {
        resolvedTenantId = data.tenantId || domain;
      })
      .catch(() => {
        resolvedTenantId = domain; // Fallback to domain name
      });
  }
  
  // Send beacon to analytics ingest
  function sendAnalytics(type, data) {
    if (!resolvedTenantId) return; // Wait for tenant resolution
    
    const payload = {
      type: type,
      tenantId: resolvedTenantId,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...data
    };
    
    const body = JSON.stringify(payload);
    
    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(PORTAL_API + '/analytics-ingest', body);
    } else {
      // Fallback to fetch
      fetch(PORTAL_API + '/analytics-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).catch(() => {});
    }
  }
  
  // Track page view
  function trackPageView() {
    // Small delay to ensure tenant is resolved
    setTimeout(() => {
      const utmParams = getUTMParams();
      sendAnalytics('page_view', {
        path: window.location.pathname,
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
        properties: {
          ...utmParams
        }
      });
    }, 100);
  }
  
  // Track form submissions
  function setupFormTracking() {
    document.addEventListener('submit', function(e) {
      const form = e.target;
      const formName = form.getAttribute('data-track') || 
                      form.getAttribute('name') ||
                      form.id ||
                      'form_submit';
      
      eventCount++;
      sendAnalytics('event', {
        eventName: 'form_submit',
        eventCategory: 'conversion',
        eventAction: 'form',
        eventLabel: formName,
        path: window.location.pathname,
        properties: {
          formId: form.id,
          formName: form.name,
          fields: Array.from(form.elements).filter(el => el.name).length
        }
      });
    }, { passive: true });
  }
  
  // Track clicks on buttons and links with enhanced data
  function setupClickTracking() {
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a, button, [data-track]');
      if (!target) return;
      
      const trackName = target.getAttribute('data-track') || 
                       target.getAttribute('aria-label') ||
                       target.getAttribute('title') ||
                       target.textContent?.trim().substring(0, 50);
      
      if (trackName || target.hasAttribute('data-track')) {
        eventCount++;
        
        // Detect if it's a CTA button
        const isCTA = target.className?.includes('cta') || 
                      target.className?.includes('button') ||
                      target.tagName === 'BUTTON';
        
        // Detect if it's an external link
        const href = target.getAttribute('href');
        const isExternal = href && !href.startsWith('/') && !href.startsWith('#');
        
        sendAnalytics('event', {
          eventName: isCTA ? 'cta_click' : 'link_click',
          eventCategory: 'engagement',
          eventAction: 'click',
          eventLabel: trackName,
          path: window.location.pathname,
          properties: {
            elementTag: target.tagName,
            elementId: target.id || null,
            elementClass: target.className?.toString().substring(0, 100) || null,
            href: href || null,
            isExternal: isExternal,
            isCTA: isCTA
          }
        });
      }
    }, { passive: true, capture: true });
  }
  
  // Track scroll depth with timing
  function setupScrollTracking() {
    let reported = {};
    
    window.addEventListener('scroll', function() {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      
      const depth = Math.round((window.scrollY / scrollHeight) * 100);
      if (depth > maxScrollDepth) {
        maxScrollDepth = depth;
        
        // Report at 25%, 50%, 75%, 100% with timing
        [25, 50, 75, 100].forEach(milestone => {
          if (depth >= milestone && !reported[milestone]) {
            reported[milestone] = true;
            const timeSinceStart = Date.now() - sessionStartTime;
            sessionScrollTimes[milestone] = timeSinceStart / 1000; // Convert to seconds
            
            sendAnalytics('scroll_depth', {
              depth: maxScrollDepth,
              maxDepthPercent: Math.min(maxScrollDepth, 100),
              path: window.location.pathname,
              timeTo25: sessionScrollTimes[25],
              timeTo50: sessionScrollTimes[50],
              timeTo75: sessionScrollTimes[75],
              timeTo100: sessionScrollTimes[100],
              totalTimeSeconds: (Date.now() - sessionStartTime) / 1000
            });
          }
        });
      }
    }, { passive: true });
  }
  
  // Track video engagement (if site uses HTML5 video)
  function setupVideoTracking() {
    const videos = document.querySelectorAll('video');
    if (videos.length === 0) return;
    
    videos.forEach((video, idx) => {
      video.addEventListener('play', () => {
        eventCount++;
        sendAnalytics('event', {
          eventName: 'video_play',
          eventCategory: 'engagement',
          eventAction: 'video',
          eventLabel: video.getAttribute('title') || 'Video ' + (idx + 1),
          path: window.location.pathname,
          properties: {
            duration: video.duration,
            videoId: video.id
          }
        });
      });
      
      // Track 25%, 50%, 75%, 100% watched
      const milestones = [0.25, 0.50, 0.75, 1.0];
      const watchedMilestones = {};
      
      video.addEventListener('timeupdate', () => {
        const progress = video.currentTime / video.duration;
        milestones.forEach(milestone => {
          if (progress >= milestone && !watchedMilestones[milestone]) {
            watchedMilestones[milestone] = true;
            eventCount++;
            sendAnalytics('event', {
              eventName: 'video_milestone',
              eventCategory: 'engagement',
              eventAction: 'video',
              eventLabel: Math.round(milestone * 100) + '%',
              eventValue: Math.round(milestone * 100),
              path: window.location.pathname,
              properties: {
                videoId: video.id,
                milestone: Math.round(milestone * 100),
                duration: video.duration,
                watchedTime: video.currentTime
              }
            });
          }
        });
      });
    });
  }
  
  // Track user interactions (mouse/touch activity)
  function setupActivityTracking() {
    ['mousedown', 'touchstart', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        lastActivityTime = Date.now();
      }, { passive: true });
    });
  }
  
  // Send session end with full metrics
  function trackSessionEnd() {
    const duration = (Date.now() - sessionStartTime) / 1000; // Convert to seconds
    
    sendAnalytics('session', {
      action: 'end',
      firstPage: sessionStorage.getItem('_sfp') || window.location.pathname,
      lastPage: window.location.pathname,
      pageCount: pageCount,
      eventCount: eventCount,
      duration: Math.round(duration),
      maxScrollDepth: maxScrollDepth,
      ...getUTMParams(),
      properties: {
        maxScrollPercent: Math.min(maxScrollDepth, 100),
        totalEvents: eventCount,
        scrollTimes: sessionScrollTimes
      }
    });
  }
  
  // Initialize tracking
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      trackPageView();
      setupClickTracking();
      setupFormTracking();
      setupScrollTracking();
      setupVideoTracking();
      setupActivityTracking();
      
      // Store first page on session start
      if (!sessionStorage.getItem('_sfp')) {
        sessionStorage.setItem('_sfp', window.location.pathname);
      }
    });
  } else {
    trackPageView();
    setupClickTracking();
    setupFormTracking();
    setupScrollTracking();
    setupVideoTracking();
    setupActivityTracking();
    
    // Store first page on session start
    if (!sessionStorage.getItem('_sfp')) {
      sessionStorage.setItem('_sfp', window.location.pathname);
    }
  }
  
  // Track page visibility (tab switch)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      eventCount++;
      sendAnalytics('event', {
        eventName: 'page_blur',
        eventCategory: 'engagement',
        eventAction: 'visibility',
        path: window.location.pathname
      });
    } else {
      eventCount++;
      sendAnalytics('event', {
        eventName: 'page_focus',
        eventCategory: 'engagement',
        eventAction: 'visibility',
        path: window.location.pathname
      });
    }
  });
  
  // Track before unload (session end with full metrics)
  window.addEventListener('beforeunload', function() {
    if (resolvedTenantId) {
      trackSessionEnd();
    }
  });
  
  // Track page navigation (SPA support)
  const originalPushState = window.history.pushState;
  window.history.pushState = function(...args) {
    pageCount++;
    originalPushState.apply(window.history, args);
    
    // Track SPA navigation
    setTimeout(() => {
      trackPageView();
    }, 100);
  };
  
  // Expose global API for custom tracking if needed
  window.AnalyticsAPI = {
    trackEvent: (name, category, action, label, value, properties) => {
      eventCount++;
      sendAnalytics('event', {
        eventName: name,
        eventCategory: category,
        eventAction: action,
        eventLabel: label,
        eventValue: value,
        path: window.location.pathname,
        properties: properties || {}
      });
    },
    trackConversion: (label, value, conversionType) => {
      eventCount++;
      sendAnalytics('session', {
        action: 'update',
        converted: true,
        conversionType: conversionType || 'custom',
        conversionValue: value,
        pageCount: pageCount,
        eventCount: eventCount,
        duration: Math.round((Date.now() - sessionStartTime) / 1000),
        properties: { conversionLabel: label }
      });
    }
  };
})();
`

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600', // Cache 1 hour
      'Access-Control-Allow-Origin': '*'
    },
    body: script
  }
}
