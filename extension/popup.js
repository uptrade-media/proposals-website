// Popup script for Uptrade Sales Extension

// Toggle for local development vs production
const IS_DEV = true;

const API_BASE = IS_DEV ? 'http://localhost:3002' : 'https://api.uptrademedia.com';
const PORTAL_URL = IS_DEV ? 'http://localhost:5173' : 'https://portal.uptrademedia.com';

// State
let currentTab = null;
let pageData = null;
let targetCompany = null;
let authToken = null;
let currentUser = null;
let settings = {};

// DOM Elements
const loginView = document.getElementById('loginView');
const mainView = document.getElementById('mainView');
const loginBtn = document.getElementById('loginBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Domain card
const domainName = document.getElementById('domainName');
const domainStatus = document.getElementById('domainStatus');

// Tech stack
const techStackList = document.getElementById('techStackList');

// Signals
const signalsList = document.getElementById('signalsList');

// Analyze
const analyzeSection = document.getElementById('analyzeSection');
const analyzeBtn = document.getElementById('analyzeBtn');

// Score
const scoreCard = document.getElementById('scoreCard');
const scoreCircle = document.getElementById('scoreCircle');
const scoreValue = document.getElementById('scoreValue');
const scoreLabel = document.getElementById('scoreLabel');
const scoreSummary = document.getElementById('scoreSummary');
const topFactors = document.getElementById('topFactors');
const factorsList = document.getElementById('factorsList');
const pitchAngles = document.getElementById('pitchAngles');
const anglesList = document.getElementById('anglesList');

// Audit
const auditSection = document.getElementById('auditSection');
const auditContent = document.getElementById('auditContent');
const auditLoading = document.getElementById('auditLoading');
const auditResults = document.getElementById('auditResults');
const runAuditBtn = document.getElementById('runAuditBtn');
const viewAuditBtn = document.getElementById('viewAuditBtn');
const sendAuditBtn = document.getElementById('sendAuditBtn');
const perfScore = document.getElementById('perfScore');
const seoScore = document.getElementById('seoScore');
const a11yScore = document.getElementById('a11yScore');
const bpScore = document.getElementById('bpScore');

// Actions
const actionsSection = document.getElementById('actionsSection');
const sendOutreachBtn = document.getElementById('sendOutreachBtn');
const saveProspectBtn = document.getElementById('saveProspectBtn');

// Contacts
const contactsCard = document.getElementById('contactsCard');
const contactsList = document.getElementById('contactsList');
const saveContactsBtn = document.getElementById('saveContactsBtn');

// Modals
const emailModal = document.getElementById('emailModal');
const closeEmailModal = document.getElementById('closeEmailModal');
const emailTo = document.getElementById('emailTo');
const emailSubject = document.getElementById('emailSubject');
const emailBody = document.getElementById('emailBody');
const copyEmailBtn = document.getElementById('copyEmailBtn');
const openGmailBtn = document.getElementById('openGmailBtn');

const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const userEmail = document.getElementById('userEmail');
const schedulingUrl = document.getElementById('schedulingUrl');
const emailTone = document.getElementById('emailTone');
const logoutBtn = document.getElementById('logoutBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('[Uptrade Popup] Initializing...');
  
  // Get auth state
  const authData = await getFromStorage(['authToken', 'user', 'settings']);
  authToken = authData.authToken;
  currentUser = authData.user;
  settings = authData.settings || {};
  
  console.log('[Uptrade Popup] Auth token:', authToken ? 'Found' : 'Not found');
  console.log('[Uptrade Popup] User:', currentUser?.email || 'None');
  
  // If no token, try to sync from open portal tab
  if (!authToken) {
    console.log('[Uptrade Popup] No token, trying to sync from portal...');
    const syncResult = await syncAuthFromPortal();
    if (syncResult) {
      authToken = syncResult.token;
      currentUser = syncResult.user;
    }
  }
  
  if (authToken) {
    showMainView();
    loadPageData();
  } else {
    showLoginView();
  }
  
  setupEventListeners();
  
  // Listen for tab changes to auto-update the sidebar
  chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('[Uptrade Popup] Tab activated:', activeInfo.tabId);
    if (authToken) {
      loadPageData();
    }
  });
  
  // Also listen for URL changes in the current tab
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      console.log('[Uptrade Popup] Tab updated:', tab.url);
      if (authToken) {
        loadPageData();
      }
    }
  });
  
  // Listen for auth changes (when user logs in on portal)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.authToken) {
      console.log('[Uptrade Popup] Auth token changed');
      if (changes.authToken.newValue) {
        authToken = changes.authToken.newValue;
        currentUser = changes.user?.newValue || null;
        showMainView();
        loadPageData();
        showToast('Signed in!');
      }
    }
  });
}

/**
 * Try to sync auth from an open portal tab
 */
async function syncAuthFromPortal() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: 'checkAuthFromPortal' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Uptrade Popup] sendMessage error:', chrome.runtime.lastError);
          resolve(null);
          return;
        }
        if (response?.success) {
          console.log('[Uptrade Popup] Synced auth from portal tab');
          resolve({ token: response.token, user: response.user });
        } else {
          console.log('[Uptrade Popup] Could not sync auth:', response?.error);
          resolve(null);
        }
      });
    } catch (e) {
      console.error('[Uptrade Popup] syncAuth error:', e);
      resolve(null);
    }
  });
}

function setupEventListeners() {
  // Login
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  
  // Settings
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
  if (closeSettingsModal) closeSettingsModal.addEventListener('click', () => settingsModal.classList.add('hidden'));
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', handleSaveSettings);
  
  // Analyze
  if (analyzeBtn) analyzeBtn.addEventListener('click', handleAnalyze);
  
  // Audit
  if (runAuditBtn) runAuditBtn.addEventListener('click', handleRunAudit);
  if (viewAuditBtn) viewAuditBtn.addEventListener('click', handleViewAudit);
  if (sendAuditBtn) sendAuditBtn.addEventListener('click', handleSendAudit);
  
  // Actions
  if (sendOutreachBtn) sendOutreachBtn.addEventListener('click', handleSendOutreach);
  if (saveProspectBtn) saveProspectBtn.addEventListener('click', handleSaveProspect);
  if (saveContactsBtn) saveContactsBtn.addEventListener('click', handleSaveContacts);
  
  // Email modal
  if (closeEmailModal) closeEmailModal.addEventListener('click', () => emailModal.classList.add('hidden'));
  if (copyEmailBtn) copyEmailBtn.addEventListener('click', handleCopyEmail);
  if (openGmailBtn) openGmailBtn.addEventListener('click', handleOpenGmail);
  
  // Close modals on background click
  if (emailModal) emailModal.addEventListener('click', (e) => {
    if (e.target === emailModal) emailModal.classList.add('hidden');
  });
  if (settingsModal) settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
  });
}

// Storage helpers
function getFromStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function setInStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

// API call helper
async function apiCall(method, endpoint, body) {
  console.log('[Uptrade Popup] API call:', method, endpoint, body);
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    // Check if token expired - try to refresh from portal
    if (response.status === 401) {
      console.log('[Uptrade Popup] Token expired, attempting to refresh from portal...');
      const syncResult = await syncAuthFromPortal();
      if (syncResult) {
        authToken = syncResult.token;
        currentUser = syncResult.user;
        // Retry the request with new token
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: body ? JSON.stringify(body) : undefined
        });
        if (retryResponse.ok) {
          return retryResponse.json();
        }
      }
      // If still failing, show login
      showLoginView();
      throw new Error('Session expired. Please sign in again.');
    }
    
    const errorBody = await response.text();
    console.error('[Uptrade Popup] API error response:', response.status, errorBody);
    
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorBody);
      errorMessage = errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorMessage = errorBody || `API error: ${response.status}`;
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// View management
function showLoginView() {
  loginView.classList.remove('hidden');
  mainView.classList.add('hidden');
}

function showMainView() {
  loginView.classList.add('hidden');
  mainView.classList.remove('hidden');
}

// Toast notifications
function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Reset UI to initial state (for when switching pages)
function resetAnalysisUI() {
  // Clear target company
  targetCompany = null;
  
  // Reset domain status
  domainStatus.textContent = 'New';
  domainStatus.className = 'status-badge new';
  
  // Hide score card and show analyze button
  scoreCard.classList.add('hidden');
  analyzeSection.classList.remove('hidden');
  
  // Show audit section (users can run audit standalone before analysis)
  auditSection.classList.remove('hidden');
  auditContent.classList.remove('hidden');
  auditLoading.classList.add('hidden');
  auditResults.classList.add('hidden');
  runAuditBtn.disabled = false;
  
  // Hide actions until analysis is done
  actionsSection.classList.add('hidden');
  
  // Reset analyze button
  analyzeBtn.disabled = false;
  analyzeBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
    Analyze Site
  `;
  
  // Clear pitch angles and factors
  if (factorsList) factorsList.innerHTML = '';
  if (anglesList) anglesList.innerHTML = '';
  topFactors.classList.add('hidden');
  pitchAngles.classList.add('hidden');
}

// Load page data from content script
async function loadPageData() {
  console.log('[Uptrade Popup] Loading page data...');
  
  // Reset UI first when switching pages
  resetAnalysisUI();
  
  try {
    // For sidepanel, we need to query differently - try lastFocusedWindow first
    let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    
    // Fallback to currentWindow if no results
    if (!tabs || tabs.length === 0) {
      console.log('[Uptrade Popup] Trying currentWindow query...');
      tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    }
    
    const tab = tabs[0];
    currentTab = tab;
    
    console.log('[Uptrade Popup] Current tab:', tab?.id, tab?.url);
    
    if (!tab || !tab.url) {
      console.log('[Uptrade Popup] No active tab found');
      techStackList.innerHTML = '<span class="placeholder">No active tab found. Navigate to a website.</span>';
      return;
    }
    
    // Check if we can inject on this page
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:') || tab.url.startsWith('edge://')) {
      console.log('[Uptrade Popup] Cannot analyze this page type');
      techStackList.innerHTML = '<span class="placeholder">Cannot analyze browser pages. Navigate to a website to use.</span>';
      return;
    }
    
    // Update domain display
    const url = new URL(tab.url);
    domainName.textContent = url.hostname;
    domainStatus.textContent = 'New';
    domainStatus.className = 'status-badge new';
    
    // Inject content script if needed
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      console.log('[Uptrade Popup] Content script injected');
    } catch (e) {
      console.log('[Uptrade Popup] Content script injection skipped:', e.message);
    }
    
    // Small delay to let content script initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get page data from content script via background script (sidebar can't directly message tabs)
    const getPageDataWithRetry = (retries = 3) => {
      console.log('[Uptrade Popup] Sending getPageData to tab', tab.id);
      
      // Route through background script
      chrome.runtime.sendMessage(
        { action: 'sendToContentScript', tabId: tab.id, message: { action: 'getPageData' } },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Uptrade Popup] Message error:', chrome.runtime.lastError.message);
            if (retries > 0) {
              console.log('[Uptrade Popup] Retrying...', retries);
              setTimeout(() => getPageDataWithRetry(retries - 1), 200);
              return;
            }
            techStackList.innerHTML = '<span class="placeholder">Unable to analyze this page. Try refreshing.</span>';
            return;
          }
          
          if (response?.error) {
            console.error('[Uptrade Popup] Content script error:', response.error);
            if (retries > 0) {
              console.log('[Uptrade Popup] Retrying...', retries);
              setTimeout(() => getPageDataWithRetry(retries - 1), 200);
              return;
            }
            techStackList.innerHTML = '<span class="placeholder">Unable to analyze this page. Try refreshing.</span>';
            return;
          }
        
        if (response) {
          pageData = response;
          console.log('[Uptrade Popup] Tech stack:', response.techStack?.length || 0, 'items');
          console.log('[Uptrade Popup] Signals keys:', Object.keys(response.signals || {}));
          console.log('[Uptrade Popup] Contacts:', response.contacts?.length || 0, 'items');
          
          renderTechStack(response.techStack);
          renderSignals(response.signals);
          renderContacts(response.contacts);
          
          // Check if already analyzed
          checkExistingAnalysis(url.hostname);
        } else {
          techStackList.innerHTML = '<span class="placeholder">Unable to analyze this page</span>';
        }
      });
    };
    
    // Start the retry process
    getPageDataWithRetry();
    
  } catch (error) {
    console.error('Error loading page data:', error);
    showToast('Error loading page data', 'error');
  }
}

// Check if we already have this company
async function checkExistingAnalysis(domain) {
  try {
    const companies = await apiCall('GET', `/crm/target-companies?domain=${encodeURIComponent(domain)}`);
    
    if (companies.data?.length > 0) {
      targetCompany = companies.data[0];
      domainStatus.textContent = 'Saved';
      domainStatus.className = 'status-badge saved';
      
      // Show score and results
      renderScore(targetCompany);
      analyzeSection.classList.add('hidden');
      scoreCard.classList.remove('hidden');
      auditSection.classList.remove('hidden');
      actionsSection.classList.remove('hidden');
      
      // Check for audit results
      if (targetCompany.audit_id) {
        checkAuditStatus(targetCompany.id);
      }
    }
  } catch (error) {
    // Not found, show analyze button
    console.log('Company not found, ready for analysis');
  }
}

// Render tech stack tags
function renderTechStack(techStack) {
  if (!techStack?.length) {
    techStackList.innerHTML = '<span class="placeholder">No tech detected</span>';
    return;
  }
  
  techStackList.innerHTML = techStack.map(tech => {
    const typeClass = tech.type === 'cms' ? 'cms' : 
                      tech.type === 'analytics' ? 'analytics' : 
                      tech.type === 'plugin' ? 'plugin' : '';
    return `<span class="tech-tag ${typeClass}">${tech.name}</span>`;
  }).join('');
}

// Render signals
function renderSignals(signals) {
  if (!signals) return;
  
  const items = [
    { 
      key: 'hasContactForm', 
      label: 'Contact Form',
      positive: signals.hasContactForm,
      icon: signals.hasContactForm ? '✓' : '✗'
    },
    { 
      key: 'hasPhoneNumber', 
      label: 'Phone',
      positive: signals.hasPhoneNumber,
      icon: signals.hasPhoneNumber ? '✓' : '✗'
    },
    { 
      key: 'hasAnalytics', 
      label: 'Analytics',
      positive: signals.hasAnalytics,
      icon: signals.hasAnalytics ? '✓' : '✗'
    },
    { 
      key: 'hasSSL', 
      label: 'SSL',
      positive: signals.hasSSL,
      icon: signals.hasSSL ? '✓' : '✗'
    },
    { 
      key: 'hasSchema', 
      label: 'Structured Data',
      positive: signals.hasSchema,
      icon: signals.hasSchema ? '✓' : '✗'
    },
    { 
      key: 'hasLivechat', 
      label: 'Live Chat',
      positive: signals.hasLivechat,
      icon: signals.hasLivechat ? '✓' : '✗'
    }
  ];
  
  signalsList.innerHTML = items.map(item => `
    <div class="signal-item">
      <div class="signal-icon ${item.positive ? 'positive' : 'negative'}">
        ${item.icon}
      </div>
      <span>${item.label}</span>
    </div>
  `).join('');
}

// Render contacts
function renderContacts(contacts) {
  if (!contacts?.length) {
    contactsCard.classList.add('hidden');
    return;
  }
  
  const emailContacts = contacts.filter(c => c.email);
  if (emailContacts.length === 0) {
    contactsCard.classList.add('hidden');
    return;
  }
  
  contactsCard.classList.remove('hidden');
  contactsList.innerHTML = emailContacts.map(contact => {
    const initials = contact.name 
      ? contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : contact.email[0].toUpperCase();
    
    return `
      <div class="contact-item" data-email="${contact.email}">
        <div class="contact-avatar">${initials}</div>
        <div class="contact-info">
          <div class="contact-name">${contact.name || 'Unknown'}</div>
          <div class="contact-email">${contact.email}</div>
        </div>
      </div>
    `;
  }).join('');
  
  // Click to set email recipient
  contactsList.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('click', () => {
      emailTo.value = item.dataset.email;
    });
  });
}

// Render score card
function renderScore(company) {
  const score = company.score || 0;
  const tier = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
  const tierLabel = tier === 'hot' ? 'Hot Lead' : tier === 'warm' ? 'Warm Lead' : 'Potential';
  
  // Update score circle
  const percentage = Math.min(score, 100);
  const color = tier === 'hot' ? '#22c55e' : tier === 'warm' ? '#f59e0b' : '#6b7280';
  scoreCircle.style.background = `conic-gradient(${color} ${percentage * 3.6}deg, #1a1a1f ${percentage * 3.6}deg)`;
  scoreValue.textContent = score;
  
  // Update label
  scoreLabel.textContent = tierLabel;
  scoreLabel.className = `score-label ${tier}`;
  
  // Summary
  scoreSummary.textContent = company.analysis?.summary || 'AI-scored based on site signals';
  
  // Factors
  if (company.analysis?.factors?.length) {
    topFactors.classList.remove('hidden');
    factorsList.innerHTML = company.analysis.factors
      .slice(0, 3)
      .map(f => `<li>${f}</li>`)
      .join('');
  }
  
  // Pitch angles
  if (company.pitch_angles?.length) {
    pitchAngles.classList.remove('hidden');
    anglesList.innerHTML = company.pitch_angles
      .slice(0, 3)
      .map(a => {
        // Handle both string and object formats
        if (typeof a === 'string') return `<div class="pitch-item">${a}</div>`;
        return `<div class="pitch-item">
          <strong>${a.title || ''}</strong>
          <p>${a.hook || ''}</p>
        </div>`;
      })
      .join('');
  }
}

// Handle analyze
async function handleAnalyze() {
  if (!pageData) {
    showToast('No page data available', 'error');
    return;
  }
  
  // Check if we already have audit results from a standalone audit run
  const existingAuditId = targetCompany?.last_audit_id || targetCompany?.audit_id;
  const existingAuditResults = auditResults && !auditResults.classList.contains('hidden');
  
  analyzeBtn.disabled = true;
  
  if (existingAuditId && existingAuditResults) {
    // Skip audit, go straight to analysis
    analyzeBtn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span> Analyzing...';
    domainStatus.textContent = 'Analyzing...';
  } else {
    analyzeBtn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span> Running Audit...';
    domainStatus.textContent = 'Running Audit...';
    // Show audit section and loading state
    auditSection.classList.remove('hidden');
    auditContent.classList.add('hidden');
    auditLoading.classList.remove('hidden');
  }
  domainStatus.className = 'status-badge analyzing';
  
  try {
    // Step 1: Run PageSpeed audit first (or reuse existing if already run)
    let auditScores = { mobile: null, desktop: null, seo: null, accessibility: null, bestPractices: null };
    let auditId = existingAuditId || null;
    
    try {
      if (auditId && existingAuditResults) {
        // Reuse existing audit - get scores from displayed results
        console.log('[Uptrade Popup] Reusing existing audit:', auditId);
        const perfScore = auditResults.querySelector('.audit-score-item:first-child .score');
        const seoScore = auditResults.querySelector('.audit-score-item:nth-child(2) .score');
        const accessScore = auditResults.querySelector('.audit-score-item:nth-child(3) .score');
        const bpScore = auditResults.querySelector('.audit-score-item:nth-child(4) .score');
        auditScores = {
          mobile: perfScore ? parseInt(perfScore.textContent) : null,
          desktop: null,
          seo: seoScore ? parseInt(seoScore.textContent) : null,
          accessibility: accessScore ? parseInt(accessScore.textContent) : null,
          bestPractices: bpScore ? parseInt(bpScore.textContent) : null
        };
      } else {
        // Run new audit
        analyzeBtn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span> Running Audit...';
        
        // Request audit via audits API
        const auditResponse = await apiCall('POST', '/audits', {
          url: pageData.url,
          deviceType: 'mobile',
          source: 'api'
        });
        
        auditId = auditResponse.auditId;
        
        // Poll for results (max 45 seconds)
        if (auditId) {
          auditScores = await pollForAuditResults(auditId, 22); // 22 attempts * 2 seconds = 44 seconds
        }
      }
    } catch (auditError) {
      console.log('[Uptrade Popup] Audit failed, continuing with analysis:', auditError.message);
      showToast('Audit unavailable, analyzing with available data...', 'info');
    }
    
    // Step 2: Now run Signal analysis WITH audit scores
    analyzeBtn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span> Analyzing...';
    domainStatus.textContent = 'Analyzing...';
    
    // Transform pageData to match API DTO format
    const techStack = pageData.techStack || [];
    const signals = pageData.signals || [];
    
    // Extract platform/CMS from tech stack
    const cms = techStack.find(t => t.type === 'cms');
    const theme = techStack.find(t => t.type === 'theme');
    const framework = techStack.find(t => t.type === 'framework');
    const analytics = techStack.filter(t => t.type === 'analytics').map(t => t.name);
    const plugins = techStack.filter(t => t.type === 'plugin').map(t => t.name);
    
    // Build request body matching AnalyzeSiteDto - include audit scores!
    const requestBody = {
      url: pageData.url,
      domain: pageData.domain,
      techStack: {
        platform: cms?.name || framework?.name || null,
        theme: theme?.name || null,
        framework: framework?.name || null,
        analytics: analytics,
        plugins: plugins,
        confidence: techStack.length > 0 ? 0.8 : 0.3
      },
      signals: {
        hasContactForm: signals?.hasContactForm || false,
        hasPhone: signals?.hasPhoneNumber || false,
        schemaPresent: signals?.hasSchema || false,
        isHttps: pageData.url?.startsWith('https'),
        hasViewportMeta: signals?.hasMobileViewport || false,
        mobilePageSpeed: auditScores.mobile,
        desktopPageSpeed: auditScores.desktop
      },
      businessInfo: {
        companyName: signals?.companyName || null,
        industry: null,
        location: null,
        hasEcommerce: techStack.some(t => 
          t.name?.toLowerCase().includes('shopify') || 
          t.name?.toLowerCase().includes('woocommerce') ||
          t.name?.toLowerCase().includes('bigcommerce')
        )
      },
      auditId: auditId  // Pass the audit ID so it gets linked
    };
    
    console.log('[Uptrade Popup] Sending analyze request with audit scores:', requestBody);
    
    const result = await apiCall('POST', '/crm/target-companies/analyze', requestBody);
    
    targetCompany = result;
    
    // Link audit to company if we have one
    if (auditId && targetCompany?.id) {
      targetCompany.last_audit_id = auditId;
      targetCompany.audit_id = auditId;
    }
    
    // Update UI
    domainStatus.textContent = 'Saved';
    domainStatus.className = 'status-badge saved';
    
    renderScore(targetCompany);
    analyzeSection.classList.add('hidden');
    scoreCard.classList.remove('hidden');
    actionsSection.classList.remove('hidden');
    
    // Show audit results if we have them
    auditLoading.classList.add('hidden');
    if (auditScores.mobile !== null) {
      showAuditResults({
        performance_score: auditScores.mobile,
        seo_score: auditScores.seo,
        accessibility_score: auditScores.accessibility,
        best_practices_score: auditScores.bestPractices
      });
    } else {
      auditContent.classList.remove('hidden');
    }
    
    showToast('Site analyzed successfully!');
  } catch (error) {
    console.error('Analyze error:', error);
    showToast(error.message, 'error');
    domainStatus.textContent = 'Error';
    domainStatus.className = 'status-badge error';
    auditLoading.classList.add('hidden');
    auditContent.classList.remove('hidden');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Analyze Site
    `;
  }
}

/**
 * Poll for audit results with a max attempt count
 */
async function pollForAuditResults(auditId, maxAttempts = 22) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await apiCall('GET', `/audits/${auditId}`);
      
      if (result.status === 'completed') {
        return {
          mobile: result.performanceScore,
          desktop: result.desktopPerformanceScore || result.performanceScore,
          seo: result.seoScore,
          accessibility: result.accessibilityScore,
          bestPractices: result.bestPracticesScore
        };
      } else if (result.status === 'failed') {
        console.log('[Uptrade Popup] Audit failed:', result.error);
        return { mobile: null, desktop: null, seo: null, accessibility: null, bestPractices: null };
      }
      
      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('[Uptrade Popup] Poll attempt failed:', error.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('[Uptrade Popup] Audit polling timed out');
  return { mobile: null, desktop: null, seo: null, accessibility: null, bestPractices: null };
}

// Handle run audit (standalone - doesn't require saved company)
async function handleRunAudit() {
  if (!pageData?.url) {
    showToast('No page URL available', 'error');
    return;
  }
  
  runAuditBtn.disabled = true;
  auditContent.classList.add('hidden');
  auditLoading.classList.remove('hidden');
  
  try {
    // Request audit directly via audits API
    const auditResponse = await apiCall('POST', '/audits', {
      url: pageData.url,
      deviceType: 'mobile',
      source: 'api'
    });
    
    const auditId = auditResponse.auditId;
    
    // Store audit ID for later use
    if (!targetCompany) {
      // Create a temporary object to hold audit data
      targetCompany = { last_audit_id: auditId };
    } else {
      targetCompany.last_audit_id = auditId;
    }
    
    // Poll for results
    pollAuditStatusById(auditId);
  } catch (error) {
    console.error('Audit error:', error);
    showToast(error.message, 'error');
    auditLoading.classList.add('hidden');
    auditContent.classList.remove('hidden');
    runAuditBtn.disabled = false;
  }
}

// Poll audit status by audit ID (for standalone audits)
async function pollAuditStatusById(auditId, attempt = 0) {
  if (attempt > 30) { // 60 seconds max
    auditLoading.classList.add('hidden');
    auditContent.classList.remove('hidden');
    runAuditBtn.disabled = false;
    showToast('Audit timed out', 'error');
    return;
  }
  
  try {
    const result = await apiCall('GET', `/audits/${auditId}`);
    
    if (result.status === 'completed' || result.status === 'complete') {
      runAuditBtn.disabled = false;
      showAuditResults({
        performance_score: result.performanceScore,
        seo_score: result.seoScore,
        accessibility_score: result.accessibilityScore,
        best_practices_score: result.bestPracticesScore
      });
      
      // Update targetCompany with audit scores
      if (targetCompany) {
        targetCompany.last_audit_id = auditId;
        targetCompany.audit_id = auditId;
      }
    } else if (result.status === 'failed' || result.status === 'error') {
      auditLoading.classList.add('hidden');
      auditContent.classList.remove('hidden');
      runAuditBtn.disabled = false;
      showToast('Audit failed', 'error');
    } else {
      // Still processing
      setTimeout(() => pollAuditStatusById(auditId, attempt + 1), 2000);
    }
  } catch (error) {
    console.error('Poll error:', error);
    setTimeout(() => pollAuditStatusById(auditId, attempt + 1), 2000);
  }
}

// Poll audit status
async function pollAuditStatus(companyId, attempt = 0) {
  if (attempt > 30) { // 60 seconds max
    auditLoading.classList.add('hidden');
    auditContent.classList.remove('hidden');
    runAuditBtn.disabled = false;
    showToast('Audit timed out', 'error');
    return;
  }
  
  try {
    const result = await apiCall('GET', `/crm/target-companies/${companyId}/audit-status`);
    
    if (result.status === 'completed') {
      targetCompany = { ...targetCompany, ...result };
      showAuditResults(result);
    } else if (result.status === 'failed') {
      auditLoading.classList.add('hidden');
      auditContent.classList.remove('hidden');
      runAuditBtn.disabled = false;
      showToast('Audit failed', 'error');
    } else {
      // Still processing
      setTimeout(() => pollAuditStatus(companyId, attempt + 1), 2000);
    }
  } catch (error) {
    console.error('Poll error:', error);
    setTimeout(() => pollAuditStatus(companyId, attempt + 1), 2000);
  }
}

// Check existing audit
async function checkAuditStatus(companyId) {
  try {
    const result = await apiCall('GET', `/crm/target-companies/${companyId}/audit-status`);
    
    if (result.status === 'completed') {
      showAuditResults(result);
    }
  } catch (error) {
    console.log('No audit results yet');
  }
}

// Show audit results
function showAuditResults(data) {
  auditLoading.classList.add('hidden');
  auditContent.classList.add('hidden');
  auditResults.classList.remove('hidden');
  
  const setScore = (el, value) => {
    el.textContent = value || '--';
    el.className = 'audit-score-value ' + 
      (value >= 90 ? 'good' : value >= 50 ? 'ok' : 'poor');
  };
  
  setScore(perfScore, data.performance_score);
  setScore(seoScore, data.seo_score);
  setScore(a11yScore, data.accessibility_score);
  setScore(bpScore, data.best_practices_score);
}

// View full audit
function handleViewAudit() {
  const auditId = targetCompany?.last_audit_id || targetCompany?.audit_id;
  if (targetCompany?.magic_link) {
    chrome.tabs.create({ url: targetCompany.magic_link });
  } else if (auditId) {
    chrome.tabs.create({ url: `${PORTAL_URL}/audits/${auditId}` });
  } else {
    showToast('No audit available', 'error');
  }
}

// Send audit via email
async function handleSendAudit() {
  const auditId = targetCompany?.last_audit_id || targetCompany?.audit_id;
  if (!auditId) {
    showToast('No audit available to send', 'error');
    return;
  }
  
  // Get the first contact email if available
  const recipientEmail = pageData?.contacts?.find(c => c.email)?.email || '';
  
  // Generate magic link for this audit
  sendAuditBtn.disabled = true;
  sendAuditBtn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;margin:0"></span>';
  
  try {
    const result = await apiCall('POST', `/audits/${auditId}/magic-link`, {
      recipientEmail: recipientEmail || undefined
    });
    
    // Show email modal with audit link
    emailSubject.value = `Website Audit for ${pageData?.domain || 'your site'}`;
    emailBody.value = `Hi${recipientEmail ? '' : ' there'},

I ran a quick performance audit on your website and found some interesting opportunities for improvement.

View your full audit report here:
${result.magicLink || result.url || `${PORTAL_URL}/audits/${auditId}`}

Would you have 15 minutes this week to discuss the findings?

Best,
${currentUser?.name || 'Uptrade Media'}`;
    emailTo.value = recipientEmail;
    emailModal.classList.remove('hidden');
  } catch (error) {
    console.error('Send audit error:', error);
    showToast(error.message, 'error');
  } finally {
    sendAuditBtn.disabled = false;
    sendAuditBtn.textContent = 'Send Audit';
  }
}

// Send outreach
async function handleSendOutreach() {
  if (!targetCompany) {
    showToast('Please analyze the site first', 'error');
    return;
  }
  
  sendOutreachBtn.disabled = true;
  sendOutreachBtn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span> Generating...';
  
  try {
    const result = await apiCall('POST', `/crm/target-companies/${targetCompany.id}/generate-outreach`, {
      tone: settings.emailTone || 'professional',
      scheduling_url: settings.schedulingUrl || null,
      include_audit: !!targetCompany.audit_id
    });
    
    // Show email modal
    emailSubject.value = result.subject;
    emailBody.value = result.body;
    emailTo.value = pageData?.contacts?.find(c => c.email)?.email || '';
    emailModal.classList.remove('hidden');
    
  } catch (error) {
    console.error('Outreach error:', error);
    showToast(error.message, 'error');
  } finally {
    sendOutreachBtn.disabled = false;
    sendOutreachBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
      Generate Outreach Email
    `;
  }
}

// Copy email
function handleCopyEmail() {
  const fullEmail = `Subject: ${emailSubject.value}\n\n${emailBody.value}`;
  navigator.clipboard.writeText(fullEmail);
  showToast('Email copied to clipboard!');
}

// Open in Gmail
function handleOpenGmail() {
  const to = encodeURIComponent(emailTo.value);
  const subject = encodeURIComponent(emailSubject.value);
  const body = encodeURIComponent(emailBody.value);
  
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
  chrome.tabs.create({ url: gmailUrl });
  
  emailModal.classList.add('hidden');
}

// Save prospect
async function handleSaveProspect() {
  if (!targetCompany) {
    showToast('Please analyze the site first', 'error');
    return;
  }
  
  saveProspectBtn.disabled = true;
  
  try {
    await apiCall('POST', `/crm/target-companies/${targetCompany.id}/claim`);
    showToast('Added to your prospects!');
  } catch (error) {
    console.error('Save error:', error);
    showToast(error.message, 'error');
  } finally {
    saveProspectBtn.disabled = false;
  }
}

// Save scraped contacts
async function handleSaveContacts() {
  if (!targetCompany || !pageData?.contacts?.length) {
    showToast('No contacts to save', 'error');
    return;
  }
  
  saveContactsBtn.disabled = true;
  
  try {
    const contacts = pageData.contacts
      .filter(c => c.email)
      .map(c => ({
        email: c.email,
        name: c.name || null,
        phone: pageData.contacts.find(p => p.phone)?.phone || null,
        source: 'extension'
      }));
    
    await apiCall('POST', `/crm/target-companies/${targetCompany.id}/save-contacts`, {
      contacts
    });
    
    showToast(`${contacts.length} contacts saved!`);
  } catch (error) {
    console.error('Save contacts error:', error);
    showToast(error.message, 'error');
  } finally {
    saveContactsBtn.disabled = false;
  }
}

// Login
async function handleLogin() {
  // First try to sync from an open portal tab
  loginBtn.textContent = 'Checking...';
  loginBtn.disabled = true;
  
  const syncResult = await syncAuthFromPortal();
  
  if (syncResult) {
    authToken = syncResult.token;
    currentUser = syncResult.user;
    showMainView();
    loadPageData();
    showToast('Signed in from portal!');
  } else {
    // No open portal tab with auth, open login page
    chrome.tabs.create({ url: `${PORTAL_URL}/login?extension=true` });
    showToast('Opening portal login...', 'info');
  }
  
  loginBtn.textContent = 'Sign in with Portal';
  loginBtn.disabled = false;
}

// Logout
async function handleLogout() {
  await chrome.storage.local.remove(['authToken', 'user']);
  authToken = null;
  currentUser = null;
  settingsModal.classList.add('hidden');
  showLoginView();
  showToast('Signed out');
}

// Settings
function openSettings() {
  userEmail.textContent = currentUser?.email || 'Unknown';
  schedulingUrl.value = settings.schedulingUrl || '';
  emailTone.value = settings.emailTone || 'professional';
  settingsModal.classList.remove('hidden');
}

async function handleSaveSettings() {
  settings = {
    schedulingUrl: schedulingUrl.value,
    emailTone: emailTone.value
  };
  
  await setInStorage({ settings });
  settingsModal.classList.add('hidden');
  showToast('Settings saved!');
}
