// Background service worker for Uptrade Sales Extension

// Toggle for local development vs production
const IS_DEV = true;

const API_BASE = IS_DEV ? 'http://localhost:3002' : 'https://api.uptrademedia.com';
const PORTAL_URL = IS_DEV ? 'http://localhost:5173' : 'https://portal.uptrademedia.com';

// Handle installation - set up side panel
chrome.runtime.onInstalled.addListener(() => {
  console.log('Uptrade Sales Extension installed');
  
  // Enable side panel behavior
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch(err => console.error('Failed to set panel behavior:', err));
  }
});

// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel) {
    chrome.sidePanel.open({ tabId: tab.id })
      .catch(err => console.error('Failed to open side panel:', err));
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAuthToken') {
    chrome.storage.local.get(['authToken', 'user'], (result) => {
      sendResponse({ 
        token: result.authToken || null,
        user: result.user || null
      });
    });
    return true;
  }
  
  if (request.action === 'setAuthToken') {
    chrome.storage.local.set({ 
      authToken: request.token,
      user: request.user 
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'clearAuth') {
    chrome.storage.local.remove(['authToken', 'user'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse({ settings: result.settings || {} });
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.local.set({ settings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // API call proxy
  if (request.action === 'apiCall') {
    handleApiCall(request)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Proxy messages from sidebar to content script (sidebar can't directly sendMessage to tabs)
  if (request.action === 'sendToContentScript') {
    const { tabId, message } = request;
    console.log('[Background] Proxying message to tab', tabId, message);
    
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Error sending to content script:', chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        console.log('[Background] Got response from content script:', response ? 'yes' : 'no');
        sendResponse(response);
      }
    });
    return true;
  }
  
  // Check auth from open portal tab
  if (request.action === 'checkAuthFromPortal') {
    checkAuthFromPortalTab()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Handle API calls from popup
 */
async function handleApiCall(request) {
  const { method, endpoint, body } = request;
  
  const authData = await chrome.storage.local.get(['authToken']);
  const token = authData.authToken;
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Check for auth token from any open portal tab
 */
async function checkAuthFromPortalTab() {
  console.log('[Uptrade Extension] Checking for auth from portal tabs...');
  console.log('[Uptrade Extension] Looking for tabs matching:', PORTAL_URL);
  
  // Find any portal tab - try multiple patterns for localhost
  let tabs = [];
  
  if (IS_DEV) {
    // For localhost, try multiple patterns
    const patterns = [
      'http://localhost:5173/*',
      'http://127.0.0.1:5173/*',
      'http://localhost:8888/*', // Netlify dev
    ];
    
    for (const pattern of patterns) {
      try {
        const found = await chrome.tabs.query({ url: pattern });
        tabs = tabs.concat(found);
      } catch (e) {
        console.log('[Uptrade Extension] Pattern failed:', pattern, e.message);
      }
    }
  } else {
    tabs = await chrome.tabs.query({ url: `${PORTAL_URL}/*` });
  }
  
  console.log('[Uptrade Extension] Found', tabs.length, 'portal tabs');
  
  if (tabs.length === 0) {
    // Also list all tabs for debugging
    const allTabs = await chrome.tabs.query({});
    console.log('[Uptrade Extension] All tabs:', allTabs.map(t => t.url));
    return { success: false, error: 'No portal tab found. Please open the portal and log in.' };
  }
  
  const portalTab = tabs[0];
  console.log('[Uptrade Extension] Using portal tab:', portalTab.url);
  
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: portalTab.id },
      func: () => {
        // Debug: log all localStorage keys
        const allKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          allKeys.push(localStorage.key(i));
        }
        console.log('[Uptrade Extension] localStorage keys:', allKeys);
        
        // Supabase stores auth in localStorage with key pattern: sb-<project-ref>-auth-token
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            console.log('[Uptrade Extension] Found Supabase key:', key);
            try {
              const authData = JSON.parse(localStorage.getItem(key));
              console.log('[Uptrade Extension] Auth data keys:', Object.keys(authData || {}));
              if (authData?.access_token) {
                return {
                  token: authData.access_token,
                  user: authData.user || null,
                  key: key
                };
              }
            } catch (e) {
              console.error('[Uptrade Extension] Failed to parse Supabase auth:', e);
            }
          }
        }
        return { noToken: true, keys: allKeys };
      }
    });
    
    const authResult = results?.[0]?.result;
    console.log('[Uptrade Extension] Script result:', authResult);
    
    if (authResult?.token) {
      console.log('[Uptrade Extension] Found token from key:', authResult.key);
      await chrome.storage.local.set({
        authToken: authResult.token,
        user: authResult.user
      });
      return { success: true, token: authResult.token, user: authResult.user };
    } else {
      console.log('[Uptrade Extension] No token found. Keys:', authResult?.keys);
      return { success: false, error: 'Not logged in on portal. Please log in first.', keys: authResult?.keys };
    }
  } catch (err) {
    console.error('[Uptrade Extension] Failed to check portal auth:', err);
    return { success: false, error: err.message };
  }
}

// Listen for tab updates to check if we're on portal for auth
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith(PORTAL_URL)) {
    // Check for auth token in page
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Supabase stores auth in localStorage with key pattern: sb-<project-ref>-auth-token
        // Find the Supabase auth key dynamically
        let token = null;
        let user = null;
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            try {
              const authData = JSON.parse(localStorage.getItem(key));
              if (authData?.access_token) {
                token = authData.access_token;
                user = authData.user || null;
                break;
              }
            } catch (e) {
              console.error('Failed to parse Supabase auth:', e);
            }
          }
        }
        
        if (token) {
          console.log('[Uptrade Extension] Found auth token, saving...');
          chrome.runtime.sendMessage({
            action: 'setAuthToken',
            token,
            user
          });
        } else {
          console.log('[Uptrade Extension] No auth token found in localStorage');
        }
      }
    }).catch((err) => {
      console.error('[Uptrade Extension] Script injection failed:', err);
    });
  }
});
