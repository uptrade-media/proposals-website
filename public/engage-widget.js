// public/engage-widget.js
// Embeddable chat widget for client websites
// Include via: <script src="https://portal.uptrademedia.com/engage-widget.js" data-project="PROJECT_ID" async></script>

(function() {
  'use strict';

  // Configuration
  const PORTAL_URL = 'https://portal.uptrademedia.com';
  const API_BASE = '/.netlify/functions';
  
  // State
  let config = null;
  let projectId = null;
  let sessionId = null;
  let visitorId = null;
  let isOpen = false;
  let messages = [];
  let pollingInterval = null;
  let lastMessageTime = null;

  // Get project ID from script tag
  const scriptTag = document.currentScript || document.querySelector('script[data-project]');
  if (!scriptTag) {
    console.error('[Engage] No script tag found with data-project attribute');
    return;
  }
  projectId = scriptTag.getAttribute('data-project');
  
  if (!projectId) {
    console.error('[Engage] Missing data-project attribute');
    return;
  }

  // Generate or retrieve visitor/session IDs
  function getVisitorId() {
    let id = localStorage.getItem('engage_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('engage_visitor_id', id);
    }
    return id;
  }

  function getSessionId() {
    let id = sessionStorage.getItem('engage_session_id');
    if (!id) {
      id = 's_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('engage_session_id', id);
    }
    return id;
  }

  visitorId = getVisitorId();
  sessionId = getSessionId();

  // Fetch widget configuration
  async function fetchConfig() {
    try {
      const baseUrl = scriptTag.src ? new URL(scriptTag.src).origin : PORTAL_URL;
      const response = await fetch(`${baseUrl}${API_BASE}/engage-chat-widget?projectId=${projectId}`);
      const data = await response.json();
      
      if (data.enabled) {
        config = data;
        initWidget();
      }
    } catch (error) {
      console.error('[Engage] Failed to fetch config:', error);
    }
  }

  // Initialize widget
  function initWidget() {
    if (!config) return;
    
    injectStyles();
    createWidget();
    
    // Auto-open after delay if configured
    if (config.autoOpenDelay && !sessionStorage.getItem('engage_opened')) {
      setTimeout(() => {
        openWidget();
        sessionStorage.setItem('engage_opened', 'true');
      }, config.autoOpenDelay * 1000);
    }
    
    trackEvent('widget_loaded');
  }

  // Inject CSS styles
  function injectStyles() {
    const accent = config.theme?.accent || '#4bbf39';
    const styles = `
      .engage-widget-fab {
        position: fixed;
        ${config.position === 'bottom-left' ? 'left' : 'right'}: 20px;
        bottom: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${accent};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .engage-widget-fab:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
      }
      .engage-widget-fab svg {
        width: 28px;
        height: 28px;
        fill: white;
      }
      .engage-widget-fab.open svg.chat-icon {
        display: none;
      }
      .engage-widget-fab:not(.open) svg.close-icon {
        display: none;
      }
      .engage-widget-container {
        position: fixed;
        ${config.position === 'bottom-left' ? 'left' : 'right'}: 20px;
        bottom: 90px;
        width: 380px;
        max-width: calc(100vw - 40px);
        height: 520px;
        max-height: calc(100vh - 120px);
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .engage-widget-container.open {
        display: flex;
        animation: engage-slide-up 0.3s ease-out;
      }
      @keyframes engage-slide-up {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .engage-widget-header {
        background: ${accent};
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .engage-widget-header-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .engage-widget-header-avatar svg {
        width: 24px;
        height: 24px;
        fill: white;
      }
      .engage-widget-header-text h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .engage-widget-header-text p {
        margin: 2px 0 0;
        font-size: 13px;
        opacity: 0.9;
      }
      .engage-widget-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f8f9fa;
      }
      .engage-widget-form {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .engage-widget-form h4 {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
      }
      .engage-widget-form p {
        margin: 0 0 16px;
        font-size: 14px;
        color: #666;
      }
      .engage-widget-field {
        margin-bottom: 12px;
      }
      .engage-widget-field label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #444;
        margin-bottom: 4px;
      }
      .engage-widget-field label span.required {
        color: #e74c3c;
      }
      .engage-widget-field input,
      .engage-widget-field textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .engage-widget-field input:focus,
      .engage-widget-field textarea:focus {
        outline: none;
        border-color: ${accent};
      }
      .engage-widget-field textarea {
        resize: vertical;
        min-height: 80px;
      }
      .engage-widget-submit {
        width: 100%;
        padding: 12px;
        background: ${accent};
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
        margin-top: 8px;
      }
      .engage-widget-submit:hover {
        opacity: 0.9;
      }
      .engage-widget-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .engage-widget-messages {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .engage-widget-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.4;
      }
      .engage-widget-message.visitor {
        align-self: flex-end;
        background: ${accent};
        color: white;
        border-bottom-right-radius: 4px;
      }
      .engage-widget-message.agent,
      .engage-widget-message.ai {
        align-self: flex-start;
        background: white;
        color: #1a1a1a;
        border-bottom-left-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .engage-widget-message.system {
        align-self: center;
        background: transparent;
        color: #888;
        font-size: 13px;
        text-align: center;
        padding: 8px;
      }
      .engage-widget-footer {
        padding: 12px;
        background: white;
        border-top: 1px solid #eee;
      }
      .engage-widget-input-container {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      .engage-widget-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #ddd;
        border-radius: 20px;
        font-size: 14px;
        resize: none;
        min-height: 40px;
        max-height: 120px;
        overflow-y: auto;
      }
      .engage-widget-input:focus {
        outline: none;
        border-color: ${accent};
      }
      .engage-widget-send {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${accent};
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .engage-widget-send svg {
        width: 18px;
        height: 18px;
        fill: white;
      }
      .engage-widget-powered {
        text-align: center;
        padding: 8px;
        font-size: 11px;
        color: #999;
        background: white;
        border-top: 1px solid #f0f0f0;
      }
      .engage-widget-powered a {
        color: #666;
        text-decoration: none;
      }
      .engage-widget-powered a:hover {
        text-decoration: underline;
      }
      @media (max-width: 480px) {
        .engage-widget-container {
          width: calc(100vw - 20px);
          ${config.position === 'bottom-left' ? 'left' : 'right'}: 10px;
          bottom: 80px;
          height: calc(100vh - 100px);
          max-height: 600px;
          border-radius: 12px;
        }
        .engage-widget-fab {
          ${config.position === 'bottom-left' ? 'left' : 'right'}: 10px;
          bottom: 10px;
          width: 56px;
          height: 56px;
        }
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // Create widget DOM
  function createWidget() {
    // FAB button
    const fab = document.createElement('button');
    fab.className = 'engage-widget-fab';
    fab.innerHTML = `
      <svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7z"/></svg>
      <svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    `;
    fab.onclick = toggleWidget;
    document.body.appendChild(fab);
    
    // Widget container
    const container = document.createElement('div');
    container.className = 'engage-widget-container';
    container.id = 'engage-widget';
    
    container.innerHTML = `
      <div class="engage-widget-header">
        <div class="engage-widget-header-avatar">
          <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </div>
        <div class="engage-widget-header-text">
          <h3>${config.projectName || 'Chat Support'}</h3>
          <p>We typically reply in a few minutes</p>
        </div>
      </div>
      <div class="engage-widget-body" id="engage-body">
        ${renderFormOrChat()}
      </div>
      ${config.showPoweredBy ? `
        <div class="engage-widget-powered">
          Powered by <a href="https://uptrademedia.com" target="_blank" rel="noopener">Uptrade Media</a>
        </div>
      ` : ''}
    `;
    
    document.body.appendChild(container);
  }

  // Render form or chat based on mode and session state
  function renderFormOrChat() {
    const existingSession = sessionStorage.getItem('engage_chat_session');
    
    if (existingSession) {
      return renderChatView();
    }
    
    // Check business hours - if outside hours, show appropriate offline behavior
    if (config.isWithinBusinessHours === false) {
      const offlineBehavior = config.offlineBehavior || 'show_form';
      
      if (offlineBehavior === 'hide_handoff') {
        // Only show AI, no handoff option will be available
        return renderAIWelcome();
      } else if (offlineBehavior === 'ai_only') {
        // AI with message that human support is unavailable
        return renderAIWelcomeOffline();
      } else {
        // 'show_form' - show contact form instead of live chat
        return renderOfflineForm();
      }
    }
    
    // Live chat only mode - show form immediately
    if (config.chatMode === 'live_only') {
      return renderForm();
    }
    
    // AI mode - show initial message + quick actions
    return renderAIWelcome();
  }

  // Render offline message view (outside business hours)
  function renderOfflineForm() {
    const requiredFields = config.formRequiredFields || ['name', 'email'];
    const optionalFields = config.formOptionalFields || [];
    const allFields = [...requiredFields, ...optionalFields];
    
    let fieldsHtml = '';
    
    if (allFields.includes('name')) {
      const isRequired = requiredFields.includes('name');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Name${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="text" name="name" ${isRequired ? 'required' : ''} placeholder="Your name">
        </div>
      `;
    }
    
    if (allFields.includes('email')) {
      const isRequired = requiredFields.includes('email');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Email${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="email" name="email" ${isRequired ? 'required' : ''} placeholder="your@email.com">
        </div>
      `;
    }
    
    if (allFields.includes('phone')) {
      const isRequired = requiredFields.includes('phone');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Phone${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="tel" name="phone" ${isRequired ? 'required' : ''} placeholder="(555) 123-4567">
        </div>
      `;
    }
    
    fieldsHtml += `
      <div class="engage-widget-field">
        <label>Message <span class="required">*</span></label>
        <textarea name="message" required placeholder="How can we help?"></textarea>
      </div>
    `;
    
    return `
      <div class="engage-widget-form">
        <div class="engage-widget-message system" style="margin-bottom: 16px; background: #fff3cd; color: #856404; border-radius: 8px; padding: 12px;">
          We're currently offline. Leave us a message and we'll get back to you soon!
        </div>
        <form id="engage-form">
          ${fieldsHtml}
          <button type="submit" class="engage-widget-submit">${config.formSubmitText || 'Send Message'}</button>
        </form>
      </div>
    `;
  }

  // Render AI welcome with offline notice
  function renderAIWelcomeOffline() {
    const quickActions = config.quickActions || [];
    let actionsHtml = '';
    
    if (quickActions.length > 0) {
      actionsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">';
      quickActions.forEach(action => {
        actionsHtml += `<button class="engage-quick-action" data-action="${action.action || action.label}">${action.label}</button>`;
      });
      actionsHtml += '</div>';
    }
    
    return `
      <div class="engage-widget-messages">
        <div class="engage-widget-message ai">
          ${config.initialMessage || "Hi! 👋 How can I help you today?"}
        </div>
        <div class="engage-widget-message system" style="background: #e8f4fd; color: #0d6efd; font-size: 12px;">
          Our team is currently offline. I'm an AI assistant and can help answer questions!
        </div>
      </div>
      ${actionsHtml}
      <div class="engage-widget-footer" style="margin-top: auto;">
        <div class="engage-widget-input-container">
          <textarea class="engage-widget-input" id="engage-input" placeholder="Type a message..." rows="1"></textarea>
          <button class="engage-widget-send" id="engage-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Render the contact form
  function renderForm() {
    const requiredFields = config.formRequiredFields || ['name', 'email'];
    const optionalFields = config.formOptionalFields || [];
    const allFields = [...requiredFields, ...optionalFields];
    
    let fieldsHtml = '';
    
    if (allFields.includes('name')) {
      const isRequired = requiredFields.includes('name');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Name${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="text" name="name" ${isRequired ? 'required' : ''} placeholder="Your name">
        </div>
      `;
    }
    
    if (allFields.includes('email')) {
      const isRequired = requiredFields.includes('email');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Email${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="email" name="email" ${isRequired ? 'required' : ''} placeholder="you@example.com">
        </div>
      `;
    }
    
    if (allFields.includes('phone')) {
      const isRequired = requiredFields.includes('phone');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Phone${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="tel" name="phone" ${isRequired ? 'required' : ''} placeholder="(555) 123-4567">
        </div>
      `;
    }
    
    if (allFields.includes('company')) {
      const isRequired = requiredFields.includes('company');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Company${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="text" name="company" ${isRequired ? 'required' : ''} placeholder="Company name">
        </div>
      `;
    }
    
    if (config.formShowMessage) {
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>How can we help?</label>
          <textarea name="message" placeholder="Tell us what you need..."></textarea>
        </div>
      `;
    }
    
    return `
      <form class="engage-widget-form" id="engage-form" onsubmit="return false;">
        <h4>${config.formHeading || 'Chat with our team'}</h4>
        <p>${config.formDescription || 'Leave your info and we\'ll respond shortly.'}</p>
        ${fieldsHtml}
        <button type="submit" class="engage-widget-submit">${config.formSubmitText || 'Start Chat'}</button>
      </form>
    `;
  }

  // Render AI welcome view
  function renderAIWelcome() {
    const quickActions = config.quickActions || [];
    let actionsHtml = '';
    
    if (quickActions.length > 0) {
      actionsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">';
      quickActions.forEach(action => {
        actionsHtml += `<button class="engage-quick-action" data-action="${action.action || action.label}">${action.label}</button>`;
      });
      actionsHtml += '</div>';
    }
    
    return `
      <div class="engage-widget-messages">
        <div class="engage-widget-message ai">
          ${config.initialMessage || "Hi! 👋 How can I help you today?"}
        </div>
      </div>
      ${actionsHtml}
      <div class="engage-widget-footer" style="margin-top: auto;">
        <div class="engage-widget-input-container">
          <textarea class="engage-widget-input" id="engage-input" placeholder="Type a message..." rows="1"></textarea>
          <button class="engage-widget-send" id="engage-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Render chat view
  function renderChatView() {
    let messagesHtml = '<div class="engage-widget-messages" id="engage-messages">';
    
    messages.forEach(msg => {
      messagesHtml += `<div class="engage-widget-message ${msg.role}">${escapeHtml(msg.content)}</div>`;
    });
    
    messagesHtml += '</div>';
    
    return `
      ${messagesHtml}
      <div class="engage-widget-footer" style="margin-top: auto;">
        <div class="engage-widget-input-container">
          <textarea class="engage-widget-input" id="engage-input" placeholder="Type a message..." rows="1"></textarea>
          <button class="engage-widget-send" id="engage-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Toggle widget open/closed
  function toggleWidget() {
    isOpen = !isOpen;
    const container = document.getElementById('engage-widget');
    const fab = document.querySelector('.engage-widget-fab');
    
    if (isOpen) {
      container.classList.add('open');
      fab.classList.add('open');
      trackEvent('widget_opened');
      attachFormHandler();
      attachChatHandlers();
      startPolling();
    } else {
      container.classList.remove('open');
      fab.classList.remove('open');
      trackEvent('widget_closed');
      stopPolling();
    }
  }

  function openWidget() {
    if (!isOpen) toggleWidget();
  }

  // Attach form submit handler
  function attachFormHandler() {
    const form = document.getElementById('engage-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
          visitorName: formData.get('name'),
          visitorEmail: formData.get('email'),
          visitorPhone: formData.get('phone'),
          initialMessage: formData.get('message')
        };
        
        const submitBtn = form.querySelector('.engage-widget-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Starting...';
        
        try {
          await createSession(data);
          trackEvent('form_submitted');
          showChatView();
        } catch (error) {
          console.error('[Engage] Form submit error:', error);
          submitBtn.disabled = false;
          submitBtn.textContent = config.formSubmitText || 'Start Chat';
        }
      };
    }
  }

  // Attach chat input handlers
  function attachChatHandlers() {
    const input = document.getElementById('engage-input');
    const sendBtn = document.getElementById('engage-send');
    
    if (input && sendBtn) {
      sendBtn.onclick = () => sendMessage();
      input.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      };
      
      // Auto-resize textarea
      input.oninput = () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      };
    }
  }

  // Create chat session
  async function createSession(visitorData) {
    const baseUrl = scriptTag.src ? new URL(scriptTag.src).origin : PORTAL_URL;
    
    const response = await fetch(`${baseUrl}${API_BASE}/engage-chat-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        visitorId,
        sessionId,
        sourceUrl: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
        ...visitorData
      })
    });
    
    const data = await response.json();
    sessionStorage.setItem('engage_chat_session', data.session.id);
    
    if (visitorData.initialMessage) {
      messages.push({
        role: 'visitor',
        content: visitorData.initialMessage
      });
    }
    
    // Add system message
    messages.push({
      role: 'system',
      content: 'You\'re connected! We\'ll respond shortly.'
    });
    
    return data;
  }

  // Send a message
  async function sendMessage() {
    const input = document.getElementById('engage-input');
    const content = input.value.trim();
    
    if (!content) return;
    
    const chatSessionId = sessionStorage.getItem('engage_chat_session');
    
    // If no session yet, create one first (for AI mode)
    if (!chatSessionId && config.chatMode === 'ai') {
      // TODO: Handle AI mode session creation
      return;
    }
    
    input.value = '';
    input.style.height = 'auto';
    
    // Optimistically add message to UI
    messages.push({ role: 'visitor', content });
    updateMessagesUI();
    
    try {
      const baseUrl = scriptTag.src ? new URL(scriptTag.src).origin : PORTAL_URL;
      await fetch(`${baseUrl}${API_BASE}/engage-chat-widget/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: chatSessionId,
          content
        })
      });
      
      trackEvent('message_sent');
    } catch (error) {
      console.error('[Engage] Send message error:', error);
    }
  }

  // Show chat view after form submission
  function showChatView() {
    const body = document.getElementById('engage-body');
    body.innerHTML = renderChatView();
    attachChatHandlers();
    startPolling();
  }

  // Update messages UI
  function updateMessagesUI() {
    const messagesContainer = document.getElementById('engage-messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = messages.map(msg => 
      `<div class="engage-widget-message ${msg.role}">${escapeHtml(msg.content)}</div>`
    ).join('');
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Poll for new messages
  function startPolling() {
    const chatSessionId = sessionStorage.getItem('engage_chat_session');
    if (!chatSessionId) return;
    
    pollingInterval = setInterval(async () => {
      try {
        const baseUrl = scriptTag.src ? new URL(scriptTag.src).origin : PORTAL_URL;
        const url = new URL(`${baseUrl}${API_BASE}/engage-chat-widget/messages`);
        url.searchParams.set('sessionId', chatSessionId);
        if (lastMessageTime) {
          url.searchParams.set('after', lastMessageTime);
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          // Add new messages (filter out ones we already have)
          data.messages.forEach(msg => {
            if (!messages.find(m => m.id === msg.id)) {
              messages.push({
                id: msg.id,
                role: msg.role,
                content: msg.content
              });
              lastMessageTime = msg.created_at;
              
              // Play sound for agent messages
              if (msg.role === 'agent' && config.playSoundOnMessage) {
                playNotificationSound();
              }
            }
          });
          
          updateMessagesUI();
        }
      } catch (error) {
        console.error('[Engage] Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  // Track analytics event
  async function trackEvent(eventType, metadata = {}) {
    try {
      const baseUrl = scriptTag.src ? new URL(scriptTag.src).origin : PORTAL_URL;
      const chatSessionId = sessionStorage.getItem('engage_chat_session');
      
      await fetch(`${baseUrl}${API_BASE}/engage-chat-widget/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sessionId: chatSessionId,
          eventType,
          pageUrl: window.location.href,
          visitorId,
          metadata
        })
      });
    } catch (error) {
      // Silently fail for analytics
    }
  }

  // Utility functions
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function playNotificationSound() {
    // Simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Silently fail if audio not supported
    }
  }

  // Initialize
  fetchConfig();
})();
