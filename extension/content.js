// Content script - runs on all web pages to analyze tech stack and signals

// Register message listener IMMEDIATELY before any other code
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Uptrade Content] Received message:', request.action);
  
  if (request.action === 'getPageData') {
    try {
      // Delay slightly to ensure DOM is ready
      setTimeout(() => {
        const data = window.__uptradeGetPageData ? window.__uptradeGetPageData() : {
          url: location.href,
          domain: location.hostname,
          title: document.title,
          techStack: [],
          signals: {},
          contacts: [],
          performanceHints: []
        };
        
        console.log('[Uptrade Content] Sending response with', data.techStack?.length || 0, 'tech items');
        sendResponse(data);
      }, 50);
      return true; // Keep channel open for async
    } catch (error) {
      console.error('[Uptrade Content] Error:', error);
      sendResponse({ error: error.message });
    }
  }
  
  if (request.action === 'getTechStack') {
    const techStack = window.__uptradeDetectTechStack ? window.__uptradeDetectTechStack() : [];
    sendResponse({ techStack });
  }
  
  if (request.action === 'getSignals') {
    const signals = window.__uptradeCollectSignals ? window.__uptradeCollectSignals() : {};
    sendResponse({ signals });
  }
  
  if (request.action === 'getContacts') {
    const contacts = window.__uptradeFindContacts ? window.__uptradeFindContacts() : [];
    sendResponse({ contacts });
  }
  
  return true;
});

console.log('[Uptrade Content] Message listener registered');

(function() {
  'use strict';
  
  // Track if already initialized
  if (window.__uptradeAnalyzed) {
    console.log('[Uptrade Content] Already analyzed, skipping init');
    return;
  }
  window.__uptradeAnalyzed = true;
  
  console.log('[Uptrade Content] Initializing analysis functions...');

  /**
   * Detect tech stack from page source
   */
  function detectTechStack() {
    const tech = [];
    const html = document.documentElement.innerHTML;
    const head = document.head?.innerHTML || '';
    
    // Track detected platforms to filter out their internal frameworks
    // e.g., Wix uses React internally, but that's not useful for prospecting
    let detectedPlatform = null;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CMS / WEBSITE BUILDERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // WordPress - check multiple indicators
    const isWordPress = document.querySelector('meta[name="generator"][content*="WordPress"]') || 
        html.includes('/wp-content/') || 
        html.includes('/wp-includes/') ||
        html.includes('/wp-json/') ||
        document.body?.classList.contains('wp-');
    if (isWordPress) {
      tech.push({ name: 'WordPress', type: 'cms', icon: '📝' });
      
      // WordPress Theme
      const themeMatch = html.match(/wp-content\/themes\/([^\/'"]+)/);
      if (themeMatch && themeMatch[1] !== 'flavor') {
        tech.push({ name: themeMatch[1], type: 'theme', icon: '🎨' });
      }
      
      // Common WP Plugins
      const plugins = {
        'elementor': 'Elementor',
        'wpbakery': 'WPBakery',
        'divi': 'Divi',
        'beaver-builder': 'Beaver Builder',
        'oxygen': 'Oxygen Builder',
        'bricks': 'Bricks Builder',
        'yoast': 'Yoast SEO',
        'rank-math': 'Rank Math',
        'all-in-one-seo': 'All in One SEO',
        'seopress': 'SEOPress',
        'woocommerce': 'WooCommerce',
        'easy-digital-downloads': 'Easy Digital Downloads',
        'contact-form-7': 'Contact Form 7',
        'gravity-forms': 'Gravity Forms',
        'wpforms': 'WPForms',
        'formidable': 'Formidable Forms',
        'ninja-forms': 'Ninja Forms',
        'jetpack': 'Jetpack',
        'wordfence': 'Wordfence',
        'sucuri': 'Sucuri Security',
        'ithemes-security': 'iThemes Security',
        'w3-total-cache': 'W3 Total Cache',
        'wp-rocket': 'WP Rocket',
        'wp-super-cache': 'WP Super Cache',
        'autoptimize': 'Autoptimize',
        'litespeed': 'LiteSpeed Cache',
        'smush': 'Smush',
        'imagify': 'Imagify',
        'shortpixel': 'ShortPixel',
        'ewww': 'EWWW Image Optimizer',
        'acf': 'ACF',
        'advanced-custom-fields': 'ACF',
        'breeze': 'Breeze Cache',
        'updraftplus': 'UpdraftPlus',
        'all-in-one-wp-migration': 'All-in-One WP Migration',
        'mailchimp-for-wp': 'MC4WP',
        'popup-maker': 'Popup Maker',
        'optinmonster': 'OptinMonster',
        'revslider': 'Slider Revolution',
        'tablepress': 'TablePress',
        'monsterinsights': 'MonsterInsights',
        'google-site-kit': 'Site Kit'
      };
      
      for (const [slug, name] of Object.entries(plugins)) {
        if (html.includes(`wp-content/plugins/${slug}`)) {
          tech.push({ name, type: 'plugin', icon: '🔌' });
        }
      }
    }
    
    // Shopify - comprehensive detection
    const isShopify = window.Shopify || 
        html.includes('cdn.shopify.com') || 
        html.includes('shopify.com/s/') ||
        html.includes('myshopify.com') ||
        html.includes('Shopify.theme') ||
        document.querySelector('link[href*="shopify"]');
    if (isShopify) {
      tech.push({ name: 'Shopify', type: 'cms', icon: '🛒' });
      detectedPlatform = 'shopify';
      
      // Shopify Theme
      const themeId = window.Shopify?.theme?.name;
      if (themeId) {
        tech.push({ name: `Theme: ${themeId}`, type: 'theme', icon: '🎨' });
      }
      
      // Detect Shopify apps
      if (html.includes('recharge') || html.includes('rc-')) {
        tech.push({ name: 'Recharge (Subscriptions)', type: 'plugin', icon: '🔁' });
      }
      if (html.includes('klaviyo')) {
        tech.push({ name: 'Klaviyo', type: 'plugin', icon: '📧' });
      }
      if (html.includes('sms-bump') || html.includes('smsbump')) {
        tech.push({ name: 'SMSBump', type: 'plugin', icon: '📱' });
      }
    }
    
    // Squarespace - comprehensive detection
    const isSquarespace = html.includes('squarespace.com') || 
        html.includes('static1.squarespace.com') || 
        html.includes('sqsp.net') ||
        html.includes('squarespace-cdn.com') ||
        document.querySelector('meta[name="generator"][content*="Squarespace"]') ||
        document.body?.classList.contains('sqs-');
    if (isSquarespace) {
      tech.push({ name: 'Squarespace', type: 'cms', icon: '⬛' });
      detectedPlatform = 'squarespace';
      
      // Squarespace template detection
      const sqsTemplate = document.body?.dataset?.templateName;
      if (sqsTemplate) {
        tech.push({ name: `Template: ${sqsTemplate}`, type: 'theme', icon: '🎨' });
      }
    }
    
    // Wix - comprehensive detection
    const isWix = html.includes('wix.com') || 
        html.includes('static.wixstatic.com') || 
        html.includes('parastorage.com') ||
        html.includes('wixpress.com') ||
        window.wixBiSession ||
        document.querySelector('meta[name="generator"][content*="Wix"]');
    if (isWix) {
      tech.push({ name: 'Wix', type: 'cms', icon: '🟡' });
      detectedPlatform = 'wix';
      
      // Wix ecommerce
      if (html.includes('wixstores') || html.includes('wix-ecommerce')) {
        tech.push({ name: 'Wix Stores', type: 'plugin', icon: '🛒' });
      }
    }
    
    // Webflow - improved detection
    const isWebflow = html.includes('webflow.com') || 
        document.querySelector('[data-wf-site]') || 
        document.querySelector('[data-wf-page]') ||
        html.includes('assets.website-files.com') ||
        html.includes('uploads-ssl.webflow.com');
    if (isWebflow) {
      tech.push({ name: 'Webflow', type: 'cms', icon: '🔷' });
      detectedPlatform = 'webflow';
    }
    
    // Framer
    if (html.includes('framer.com') || html.includes('framerusercontent.com') || html.includes('framer-motion')) {
      tech.push({ name: 'Framer', type: 'cms', icon: '🖼️' });
      detectedPlatform = 'framer';
    }
    
    // Ghost
    if (html.includes('ghost.io') || 
        html.includes('ghost.org') ||
        document.querySelector('meta[name="generator"][content*="Ghost"]')) {
      tech.push({ name: 'Ghost', type: 'cms', icon: '👻' });
    }
    
    // HubSpot CMS (separate from marketing tools)
    if (html.includes('hubspot.net') && html.includes('hs-sites')) {
      tech.push({ name: 'HubSpot CMS', type: 'cms', icon: '🟠' });
    }
    
    // Contentful
    if (html.includes('contentful.com') || html.includes('ctfassets.net')) {
      tech.push({ name: 'Contentful', type: 'cms', icon: '📝' });
    }
    
    // Sanity
    if (html.includes('sanity.io') || html.includes('cdn.sanity.io')) {
      tech.push({ name: 'Sanity', type: 'cms', icon: '📝' });
    }
    
    // Strapi
    if (html.includes('strapi.io')) {
      tech.push({ name: 'Strapi', type: 'cms', icon: '📝' });
    }
    
    // Prismic
    if (html.includes('prismic.io') || html.includes('prismic-io')) {
      tech.push({ name: 'Prismic', type: 'cms', icon: '📝' });
    }
    
    // Storyblok
    if (html.includes('storyblok.com')) {
      tech.push({ name: 'Storyblok', type: 'cms', icon: '📝' });
    }
    
    // Drupal - improved
    if (html.includes('Drupal') || 
        html.includes('/sites/default/files') || 
        html.includes('drupal.js') ||
        document.querySelector('meta[name="generator"][content*="Drupal"]')) {
      tech.push({ name: 'Drupal', type: 'cms', icon: '💧' });
    }
    
    // Joomla
    if (html.includes('Joomla') || html.includes('/media/jui/') || html.includes('/media/system/js/')) {
      tech.push({ name: 'Joomla', type: 'cms', icon: '🟠' });
    }
    
    // Craft CMS
    if (html.includes('craftcms') || document.querySelector('meta[name="generator"][content*="Craft"]')) {
      tech.push({ name: 'Craft CMS', type: 'cms', icon: '🔴' });
    }
    
    // BigCommerce
    if (html.includes('bigcommerce.com') || html.includes('bigcommerce-stencil')) {
      tech.push({ name: 'BigCommerce', type: 'cms', icon: '🛍️' });
    }
    
    // Magento - more specific detection to avoid false positives
    if ((html.includes('mage/') && html.includes('Magento_')) || 
        html.includes('Mage.Cookies') || 
        html.includes('/skin/frontend/') ||
        document.querySelector('script[src*="mage/"]')) {
      tech.push({ name: 'Magento', type: 'cms', icon: '🧡' });
    }
    
    // PrestaShop
    if (html.includes('prestashop') || html.includes('/themes/classic/')) {
      tech.push({ name: 'PrestaShop', type: 'cms', icon: '🛒' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // JAVASCRIPT FRAMEWORKS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Vite
    if (html.includes('@vite') || 
        html.includes('vite/') ||
        document.querySelector('script[type="module"][src*="/@"]') ||
        document.querySelector('script[src*=".tsx"]') ||
        document.querySelector('script[src*=".jsx"]')) {
      tech.push({ name: 'Vite', type: 'build', icon: '⚡' });
    }
    
    // React - improved detection (avoid false positives)
    // Skip React detection for platforms that use React internally (Wix, Framer, Shopify, etc.)
    const platformsUsingReact = ['wix', 'framer', 'squarespace', 'shopify'];
    const isReact = window.React || 
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || 
        html.includes('react-dom') ||
        html.includes('react.production') ||
        html.includes('react.development') ||
        html.includes('_reactRoot') || 
        html.includes('__reactFiber') ||
        html.includes('data-reactroot') ||
        document.querySelector('[data-reactroot]') ||
        document.querySelector('[data-react-helmet]');
    if (isReact && !platformsUsingReact.includes(detectedPlatform)) {
      tech.push({ name: 'React', type: 'framework', icon: '⚛️' });
    }
    
    // Next.js - before React to properly categorize
    const isNextJS = window.__NEXT_DATA__ || html.includes('/_next/') || html.includes('__NEXT_DATA__');
    if (isNextJS) {
      tech.push({ name: 'Next.js', type: 'framework', icon: '▲' });
    }
    
    // Gatsby - improved (avoid matching 'gatsby' in random text)
    const isGatsby = document.querySelector('#___gatsby') || 
        html.includes('gatsby-') ||
        html.includes('/page-data/');
    if (isGatsby) {
      tech.push({ name: 'Gatsby', type: 'framework', icon: '🟣' });
    }
    
    // Vue.js - improved detection
    const isVue = window.Vue || 
        window.__VUE__ || 
        html.includes('vue.js') || 
        html.includes('vue.min.js') ||
        html.includes('vue@') ||
        html.includes('v-cloak') ||
        document.querySelector('[v-cloak]') ||
        document.querySelector('[data-v-]');
    if (isVue) {
      tech.push({ name: 'Vue.js', type: 'framework', icon: '💚' });
    }
    
    // Nuxt - more specific
    const isNuxt = window.__NUXT__ || html.includes('/_nuxt/');
    if (isNuxt) {
      tech.push({ name: 'Nuxt', type: 'framework', icon: '💚' });
    }
    
    // Angular
    if (window.angular || window.ng || html.includes('ng-version') || html.includes('ng-app')) {
      tech.push({ name: 'Angular', type: 'framework', icon: '🔺' });
    }
    
    // Svelte - more specific
    const isSvelte = html.includes('__svelte') || 
        html.includes('svelte-') ||
        document.querySelector('[class*="svelte-"]');
    if (isSvelte) {
      tech.push({ name: 'Svelte', type: 'framework', icon: '🧡' });
    }
    
    // SvelteKit
    if (html.includes('__sveltekit') || html.includes('_app/immutable/')) {
      tech.push({ name: 'SvelteKit', type: 'framework', icon: '🧡' });
    }
    
    // Astro - more specific
    const isAstro = document.querySelector('[data-astro-cid]') || 
        document.querySelector('[data-astro-source-file]') ||
        html.includes('astro:');
    if (isAstro) {
      tech.push({ name: 'Astro', type: 'framework', icon: '🚀' });
    }
    
    // Remix - more specific
    const isRemix = html.includes('__remixContext') || 
        html.includes('__remixManifest');
    if (isRemix) {
      tech.push({ name: 'Remix', type: 'framework', icon: '💿' });
    }
    
    // Solid.js
    if (html.includes('solid-js') || html.includes('_$')) {
      tech.push({ name: 'Solid.js', type: 'framework', icon: '💠' });
    }
    
    // Qwik
    if (html.includes('qwik') || html.includes('q:container')) {
      tech.push({ name: 'Qwik', type: 'framework', icon: '⚡' });
    }
    
    // Ember
    if (html.includes('ember') || window.Ember) {
      tech.push({ name: 'Ember.js', type: 'framework', icon: '🐹' });
    }
    
    // Alpine.js
    if (html.includes('x-data') || html.includes('alpine')) {
      tech.push({ name: 'Alpine.js', type: 'framework', icon: '🏔️' });
    }
    
    // HTMX
    if (html.includes('hx-') || html.includes('htmx')) {
      tech.push({ name: 'HTMX', type: 'framework', icon: '📦' });
    }
    
    // jQuery - improved
    const jQueryVersion = window.jQuery?.fn?.jquery;
    if (window.jQuery || html.includes('jquery.min.js') || html.includes('jquery-')) {
      tech.push({ name: `jQuery${jQueryVersion ? ' ' + jQueryVersion : ''}`, type: 'library', icon: '📘' });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BUILD TOOLS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Webpack
    if (html.includes('webpackJsonp') || html.includes('__webpack')) {
      tech.push({ name: 'Webpack', type: 'build', icon: '📦' });
    }
    
    // Parcel
    if (html.includes('parcelRequire')) {
      tech.push({ name: 'Parcel', type: 'build', icon: '📦' });
    }
    
    // Rollup (hard to detect, but sometimes visible)
    if (html.includes('rollup')) {
      tech.push({ name: 'Rollup', type: 'build', icon: '📦' });
    }
    
    // Turbopack
    if (html.includes('turbopack')) {
      tech.push({ name: 'Turbopack', type: 'build', icon: '⚡' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CSS FRAMEWORKS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Bootstrap - improved
    const isBootstrap = html.includes('bootstrap.min') || 
        html.includes('bootstrap.bundle') ||
        (html.includes('btn-primary') && html.includes('container'));
    if (isBootstrap) {
      tech.push({ name: 'Bootstrap', type: 'library', icon: '🅱️' });
    }
    
    // Tailwind CSS - look for multiple utility class patterns
    const tailwindPatterns = [
      html.includes('tailwindcss'),
      html.includes('tailwind.'),
      (html.includes('text-gray-') || html.includes('text-slate-') || html.includes('text-zinc-')),
      (html.includes('bg-gray-') || html.includes('bg-slate-') || html.includes('bg-zinc-')),
      (html.match(/class="[^"]*\s(sm:|md:|lg:|xl:)/)),
      (html.includes('hover:') && html.includes('focus:')),
      (html.includes('px-') && html.includes('py-') && html.includes('rounded-'))
    ];
    if (tailwindPatterns.filter(Boolean).length >= 2) {
      tech.push({ name: 'Tailwind CSS', type: 'library', icon: '🌊' });
    }
    
    // shadcn/ui detection (uses specific data attributes and class patterns)
    if (html.includes('data-radix') || html.includes('radix-')) {
      tech.push({ name: 'Radix UI', type: 'library', icon: '🎨' });
    }
    
    // Chakra UI
    if (html.includes('chakra-') || html.includes('chakra-ui')) {
      tech.push({ name: 'Chakra UI', type: 'library', icon: '⚡' });
    }
    
    // Material UI / MUI
    if (html.includes('MuiButton') || html.includes('css-') && html.includes('MuiBox')) {
      tech.push({ name: 'Material UI', type: 'library', icon: '📐' });
    }
    
    // Ant Design
    if (html.includes('ant-') || html.includes('antd')) {
      tech.push({ name: 'Ant Design', type: 'library', icon: '🐜' });
    }
    
    if (html.includes('bulma') || html.includes('is-primary')) {
      tech.push({ name: 'Bulma', type: 'library', icon: '🟢' });
    }
    
    if (html.includes('materialize') || html.includes('material-icons')) {
      tech.push({ name: 'Materialize', type: 'library', icon: '📐' });
    }
    
    if (html.includes('foundation') || html.includes('foundation.js')) {
      tech.push({ name: 'Foundation', type: 'library', icon: '🏗️' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ANALYTICS & MARKETING
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('google-analytics.com') || html.includes('gtag') || html.includes('googletagmanager')) {
      tech.push({ name: 'Google Analytics', type: 'analytics', icon: '📊' });
    }
    
    if (html.includes('googletagmanager.com/gtm')) {
      tech.push({ name: 'Google Tag Manager', type: 'analytics', icon: '🏷️' });
    }
    
    if (html.includes('facebook.com/tr') || html.includes('fbevents.js') || html.includes('connect.facebook.net')) {
      tech.push({ name: 'Meta Pixel', type: 'analytics', icon: '📘' });
    }
    
    if (html.includes('hotjar.com') || html.includes('hjid')) {
      tech.push({ name: 'Hotjar', type: 'analytics', icon: '🔥' });
    }
    
    if (html.includes('clarity.ms')) {
      tech.push({ name: 'Microsoft Clarity', type: 'analytics', icon: '🔍' });
    }
    
    if (html.includes('segment.com') || html.includes('cdn.segment.com')) {
      tech.push({ name: 'Segment', type: 'analytics', icon: '📈' });
    }
    
    if (html.includes('mixpanel.com')) {
      tech.push({ name: 'Mixpanel', type: 'analytics', icon: '📉' });
    }
    
    if (html.includes('amplitude.com')) {
      tech.push({ name: 'Amplitude', type: 'analytics', icon: '📊' });
    }
    
    if (html.includes('heap.io') || html.includes('heapanalytics')) {
      tech.push({ name: 'Heap', type: 'analytics', icon: '📊' });
    }
    
    if (html.includes('plausible.io')) {
      tech.push({ name: 'Plausible', type: 'analytics', icon: '📊' });
    }
    
    if (html.includes('fathom') || html.includes('usefathom.com')) {
      tech.push({ name: 'Fathom', type: 'analytics', icon: '📊' });
    }
    
    if (html.includes('posthog')) {
      tech.push({ name: 'PostHog', type: 'analytics', icon: '🦔' });
    }
    
    if (html.includes('snapchat.com/tr') || html.includes('sc-static.net')) {
      tech.push({ name: 'Snapchat Pixel', type: 'analytics', icon: '👻' });
    }
    
    if (html.includes('ads.linkedin.com') || html.includes('linkedin.com/px')) {
      tech.push({ name: 'LinkedIn Insight', type: 'analytics', icon: '💼' });
    }
    
    if (html.includes('tiktok.com/i18n') || html.includes('analytics.tiktok.com')) {
      tech.push({ name: 'TikTok Pixel', type: 'analytics', icon: '🎵' });
    }
    
    if (html.includes('pinterest.com/ct') || html.includes('pintrk')) {
      tech.push({ name: 'Pinterest Tag', type: 'analytics', icon: '📌' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MARKETING & CRM
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('hubspot') || html.includes('hs-scripts.com') || html.includes('hbspt')) {
      tech.push({ name: 'HubSpot', type: 'marketing', icon: '🟠' });
    }
    
    if (html.includes('marketo') || html.includes('munchkin')) {
      tech.push({ name: 'Marketo', type: 'marketing', icon: '🟣' });
    }
    
    if (html.includes('salesforce') || html.includes('pardot')) {
      tech.push({ name: 'Salesforce', type: 'marketing', icon: '☁️' });
    }
    
    if (html.includes('activecampaign')) {
      tech.push({ name: 'ActiveCampaign', type: 'marketing', icon: '📧' });
    }
    
    if (html.includes('mailchimp') || html.includes('list-manage.com')) {
      tech.push({ name: 'Mailchimp', type: 'email', icon: '🐵' });
    }
    
    if (html.includes('klaviyo') || html.includes('a.]klaviyo.com')) {
      tech.push({ name: 'Klaviyo', type: 'email', icon: '📧' });
    }
    
    if (html.includes('convertkit')) {
      tech.push({ name: 'ConvertKit', type: 'email', icon: '📧' });
    }
    
    if (html.includes('drip.com')) {
      tech.push({ name: 'Drip', type: 'email', icon: '💧' });
    }
    
    if (html.includes('sendgrid')) {
      tech.push({ name: 'SendGrid', type: 'email', icon: '📧' });
    }
    
    if (html.includes('constantcontact')) {
      tech.push({ name: 'Constant Contact', type: 'email', icon: '📧' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CHAT & SUPPORT
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('intercom.io') || html.includes('intercom-') || window.Intercom) {
      tech.push({ name: 'Intercom', type: 'chat', icon: '💬' });
    }
    
    if (html.includes('drift.com') || html.includes('driftt.com') || window.drift) {
      tech.push({ name: 'Drift', type: 'chat', icon: '💬' });
    }
    
    if (html.includes('zendesk') || html.includes('zdassets.com')) {
      tech.push({ name: 'Zendesk', type: 'chat', icon: '💬' });
    }
    
    if (html.includes('tawk.to')) {
      tech.push({ name: 'Tawk.to', type: 'chat', icon: '💬' });
    }
    
    if (html.includes('crisp.chat') || html.includes('crisp.im')) {
      tech.push({ name: 'Crisp', type: 'chat', icon: '💬' });
    }
    
    if (html.includes('livechat') || html.includes('livechatinc.com')) {
      tech.push({ name: 'LiveChat', type: 'chat', icon: '💬' });
    }
    
    if (html.includes('freshdesk') || html.includes('freshchat')) {
      tech.push({ name: 'Freshchat', type: 'chat', icon: '💬' });
    }
    
    if (html.includes('olark')) {
      tech.push({ name: 'Olark', type: 'chat', icon: '💬' });
    }
    
    if (html.includes('helpscout') || html.includes('beacon-v2')) {
      tech.push({ name: 'Help Scout', type: 'chat', icon: '💬' });
    }
    
    if (html.includes('gorgias')) {
      tech.push({ name: 'Gorgias', type: 'chat', icon: '💬' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOSTING / CDN / INFRASTRUCTURE
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('cloudflare') || html.includes('cf-ray')) {
      tech.push({ name: 'Cloudflare', type: 'cdn', icon: '🟠' });
    }
    
    if (html.includes('cloudfront.net')) {
      tech.push({ name: 'CloudFront', type: 'cdn', icon: '☁️' });
    }
    
    if (html.includes('akamai') || html.includes('akamaized.net')) {
      tech.push({ name: 'Akamai', type: 'cdn', icon: '🌐' });
    }
    
    if (html.includes('fastly') || html.includes('fastly.net')) {
      tech.push({ name: 'Fastly', type: 'cdn', icon: '⚡' });
    }
    
    if (html.includes('vercel') || html.includes('vercel-insights')) {
      tech.push({ name: 'Vercel', type: 'hosting', icon: '▲' });
    }
    
    if (html.includes('netlify') || html.includes('netlify.app')) {
      tech.push({ name: 'Netlify', type: 'hosting', icon: '🌐' });
    }
    
    if (html.includes('render.com')) {
      tech.push({ name: 'Render', type: 'hosting', icon: '🟢' });
    }
    
    if (html.includes('heroku')) {
      tech.push({ name: 'Heroku', type: 'hosting', icon: '🟣' });
    }
    
    if (html.includes('aws.amazon') || html.includes('.amazonaws.com')) {
      tech.push({ name: 'AWS', type: 'hosting', icon: '☁️' });
    }
    
    // Google Cloud - more specific detection (googleapis.com is used by fonts too)
    if (html.includes('storage.googleapis.com') || 
        html.includes('appspot.com') ||
        html.includes('run.app') ||
        html.includes('cloudfunctions.net')) {
      tech.push({ name: 'Google Cloud', type: 'hosting', icon: '☁️' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAYMENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('stripe.com') || html.includes('js.stripe.com')) {
      tech.push({ name: 'Stripe', type: 'payments', icon: '💳' });
    }
    
    if (html.includes('paypal.com') || html.includes('paypalobjects.com')) {
      tech.push({ name: 'PayPal', type: 'payments', icon: '💳' });
    }
    
    if (html.includes('square.com') || html.includes('squareup.com')) {
      tech.push({ name: 'Square', type: 'payments', icon: '💳' });
    }
    
    if (html.includes('braintree')) {
      tech.push({ name: 'Braintree', type: 'payments', icon: '💳' });
    }
    
    if (html.includes('afterpay') || html.includes('afterpay.js')) {
      tech.push({ name: 'Afterpay', type: 'payments', icon: '💳' });
    }
    
    if (html.includes('klarna')) {
      tech.push({ name: 'Klarna', type: 'payments', icon: '💳' });
    }
    
    if (html.includes('affirm.com')) {
      tech.push({ name: 'Affirm', type: 'payments', icon: '💳' });
    }
    
    if (html.includes('sezzle')) {
      tech.push({ name: 'Sezzle', type: 'payments', icon: '💳' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // A/B TESTING & PERSONALIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('optimizely') || html.includes('optimizelyjs')) {
      tech.push({ name: 'Optimizely', type: 'testing', icon: '🔬' });
    }
    
    if (html.includes('vwo.com') || html.includes('visualwebsiteoptimizer')) {
      tech.push({ name: 'VWO', type: 'testing', icon: '🔬' });
    }
    
    if (html.includes('google.com/optimize') || html.includes('googleoptimize')) {
      tech.push({ name: 'Google Optimize', type: 'testing', icon: '🔬' });
    }
    
    if (html.includes('abtasty')) {
      tech.push({ name: 'AB Tasty', type: 'testing', icon: '🔬' });
    }
    
    if (html.includes('launchdarkly')) {
      tech.push({ name: 'LaunchDarkly', type: 'testing', icon: '🚀' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POPUPS & CONVERSION
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('optinmonster')) {
      tech.push({ name: 'OptinMonster', type: 'conversion', icon: '👹' });
    }
    
    if (html.includes('sumo.com') || html.includes('sumojs')) {
      tech.push({ name: 'Sumo', type: 'conversion', icon: '🤼' });
    }
    
    if (html.includes('privy.com') || html.includes('privy-js')) {
      tech.push({ name: 'Privy', type: 'conversion', icon: '🎯' });
    }
    
    if (html.includes('justuno')) {
      tech.push({ name: 'Justuno', type: 'conversion', icon: '🎯' });
    }
    
    if (html.includes('wheelofpopups') || html.includes('wheelio')) {
      tech.push({ name: 'Wheelio', type: 'conversion', icon: '🎡' });
    }
    
    if (html.includes('unbounce')) {
      tech.push({ name: 'Unbounce', type: 'conversion', icon: '📄' });
    }
    
    if (html.includes('leadpages') || html.includes('lpages.co')) {
      tech.push({ name: 'Leadpages', type: 'conversion', icon: '📄' });
    }
    
    if (html.includes('instapage')) {
      tech.push({ name: 'Instapage', type: 'conversion', icon: '📄' });
    }
    
    if (html.includes('clickfunnels')) {
      tech.push({ name: 'ClickFunnels', type: 'conversion', icon: '🔻' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FORM TOOLS
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('typeform.com')) {
      tech.push({ name: 'Typeform', type: 'forms', icon: '📝' });
    }
    
    if (html.includes('jotform.com') || html.includes('jotform.us')) {
      tech.push({ name: 'JotForm', type: 'forms', icon: '📝' });
    }
    
    if (html.includes('cognito') && html.includes('forms')) {
      tech.push({ name: 'Cognito Forms', type: 'forms', icon: '📝' });
    }
    
    if (html.includes('formstack')) {
      tech.push({ name: 'Formstack', type: 'forms', icon: '📝' });
    }
    
    if (html.includes('paperform')) {
      tech.push({ name: 'Paperform', type: 'forms', icon: '📝' });
    }
    
    if (html.includes('tally.so')) {
      tech.push({ name: 'Tally', type: 'forms', icon: '📝' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REVIEWS & SOCIAL PROOF
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('trustpilot')) {
      tech.push({ name: 'Trustpilot', type: 'reviews', icon: '⭐' });
    }
    
    if (html.includes('yotpo')) {
      tech.push({ name: 'Yotpo', type: 'reviews', icon: '⭐' });
    }
    
    if (html.includes('judge.me')) {
      tech.push({ name: 'Judge.me', type: 'reviews', icon: '⭐' });
    }
    
    if (html.includes('stamped.io')) {
      tech.push({ name: 'Stamped.io', type: 'reviews', icon: '⭐' });
    }
    
    if (html.includes('loox.io')) {
      tech.push({ name: 'Loox', type: 'reviews', icon: '⭐' });
    }
    
    if (html.includes('okendo.io')) {
      tech.push({ name: 'Okendo', type: 'reviews', icon: '⭐' });
    }
    
    if (html.includes('fomo.com') || html.includes('fomo.js')) {
      tech.push({ name: 'Fomo', type: 'reviews', icon: '📢' });
    }
    
    if (html.includes('bazaarvoice')) {
      tech.push({ name: 'Bazaarvoice', type: 'reviews', icon: '⭐' });
    }
    
    if (html.includes('powerreviews')) {
      tech.push({ name: 'PowerReviews', type: 'reviews', icon: '⭐' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCHEDULING & BOOKING
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('calendly.com')) {
      tech.push({ name: 'Calendly', type: 'scheduling', icon: '📅' });
    }
    
    if (html.includes('acuityscheduling.com')) {
      tech.push({ name: 'Acuity Scheduling', type: 'scheduling', icon: '📅' });
    }
    
    if (html.includes('cal.com')) {
      tech.push({ name: 'Cal.com', type: 'scheduling', icon: '📅' });
    }
    
    if (html.includes('chili') || html.includes('chilipiper')) {
      tech.push({ name: 'Chili Piper', type: 'scheduling', icon: '🌶️' });
    }
    
    if (html.includes('hubspot') && html.includes('meetings')) {
      tech.push({ name: 'HubSpot Meetings', type: 'scheduling', icon: '📅' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESSIBILITY
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('accessibe') || html.includes('accessibilitywidget')) {
      tech.push({ name: 'accessiBe', type: 'accessibility', icon: '♿' });
    }
    
    if (html.includes('userway')) {
      tech.push({ name: 'UserWay', type: 'accessibility', icon: '♿' });
    }
    
    if (html.includes('audioeye')) {
      tech.push({ name: 'AudioEye', type: 'accessibility', icon: '♿' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COOKIE CONSENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('cookiebot') || html.includes('Cookiebot')) {
      tech.push({ name: 'Cookiebot', type: 'privacy', icon: '🍪' });
    }
    
    if (html.includes('onetrust') || html.includes('OneTrust')) {
      tech.push({ name: 'OneTrust', type: 'privacy', icon: '🍪' });
    }
    
    if (html.includes('cookieconsent')) {
      tech.push({ name: 'Cookie Consent', type: 'privacy', icon: '🍪' });
    }
    
    if (html.includes('trustarc') || html.includes('truste')) {
      tech.push({ name: 'TrustArc', type: 'privacy', icon: '🍪' });
    }
    
    if (html.includes('iubenda')) {
      tech.push({ name: 'Iubenda', type: 'privacy', icon: '🍪' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIDEO
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('youtube.com/embed') || html.includes('youtube-nocookie.com')) {
      tech.push({ name: 'YouTube Embeds', type: 'video', icon: '▶️' });
    }
    
    if (html.includes('vimeo.com') || html.includes('player.vimeo.com')) {
      tech.push({ name: 'Vimeo', type: 'video', icon: '▶️' });
    }
    
    if (html.includes('wistia.com') || html.includes('wistia.net')) {
      tech.push({ name: 'Wistia', type: 'video', icon: '▶️' });
    }
    
    if (html.includes('vidyard')) {
      tech.push({ name: 'Vidyard', type: 'video', icon: '▶️' });
    }
    
    if (html.includes('loom.com/embed')) {
      tech.push({ name: 'Loom', type: 'video', icon: '▶️' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAPS
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('maps.google.com') || html.includes('maps.googleapis.com')) {
      tech.push({ name: 'Google Maps', type: 'maps', icon: '🗺️' });
    }
    
    if (html.includes('mapbox')) {
      tech.push({ name: 'Mapbox', type: 'maps', icon: '🗺️' });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FONTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (html.includes('fonts.googleapis.com') || html.includes('fonts.gstatic.com')) {
      tech.push({ name: 'Google Fonts', type: 'fonts', icon: '🔤' });
    }
    
    if (html.includes('typekit') || html.includes('use.typekit.net')) {
      tech.push({ name: 'Adobe Fonts', type: 'fonts', icon: '🔤' });
    }
    
    if (html.includes('fontawesome')) {
      tech.push({ name: 'Font Awesome', type: 'fonts', icon: '🎨' });
    }

    // Dedupe by name
    const seen = new Set();
    return tech.filter(t => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    });
  }

  /**
   * Collect signals from the page
   */
  function collectSignals() {
    const signals = {
      hasForms: false,
      hasContactForm: false,
      hasPhoneNumber: false,
      hasEmail: false,
      hasSocialLinks: false,
      hasLivechat: false,
      hasSchema: false,
      hasSSL: location.protocol === 'https:',
      hasMobileViewport: false,
      hasAnalytics: false,
      phoneNumbers: [],
      emails: [],
      socialLinks: [],
      companyName: null,
      pageTitle: document.title,
      metaDescription: null
    };
    
    const html = document.documentElement.innerHTML;
    const text = document.body?.innerText || '';
    
    // Forms
    const forms = document.querySelectorAll('form');
    signals.hasForms = forms.length > 0;
    
    // Contact form detection
    const contactFormKeywords = ['contact', 'inquiry', 'enquiry', 'get in touch', 'message'];
    signals.hasContactForm = Array.from(forms).some(form => {
      const formHtml = form.innerHTML.toLowerCase();
      return contactFormKeywords.some(k => formHtml.includes(k));
    });
    
    // Phone numbers
    const phoneRegex = /(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex) || [];
    signals.phoneNumbers = [...new Set(phones)].slice(0, 5);
    signals.hasPhoneNumber = signals.phoneNumbers.length > 0;
    
    // Emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex) || [];
    // Filter out common false positives
    const filteredEmails = emails.filter(e => 
      !e.includes('example.com') && 
      !e.includes('wixpress') &&
      !e.includes('sentry.io') &&
      !e.includes('@2x') &&
      !e.startsWith('2')
    );
    signals.emails = [...new Set(filteredEmails)].slice(0, 10);
    signals.hasEmail = signals.emails.length > 0;
    
    // Social links
    const socialDomains = ['facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com', 'youtube.com'];
    const links = document.querySelectorAll('a[href]');
    signals.socialLinks = Array.from(links)
      .map(a => a.href)
      .filter(href => socialDomains.some(d => href.includes(d)))
      .slice(0, 6);
    signals.hasSocialLinks = signals.socialLinks.length > 0;
    
    // Live chat
    const chatIndicators = ['intercom', 'drift', 'zendesk', 'tawk', 'crisp', 'livechat', 'freshchat', 'hubspot'];
    signals.hasLivechat = chatIndicators.some(c => html.toLowerCase().includes(c));
    
    // Schema/Structured Data
    const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
    signals.hasSchema = schemaScripts.length > 0;
    
    // Mobile viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    signals.hasMobileViewport = viewport?.content?.includes('width=device-width') || false;
    
    // Analytics
    signals.hasAnalytics = html.includes('google-analytics') || 
      html.includes('gtag') || 
      html.includes('googletagmanager') ||
      html.includes('facebook.com/tr');
    
    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    signals.metaDescription = metaDesc?.content || null;
    
    // Try to extract company name
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName) {
      signals.companyName = ogSiteName.content;
    } else {
      // Try from title
      const title = document.title;
      const parts = title.split(/[|\-–—]/);
      if (parts.length > 1) {
        signals.companyName = parts[parts.length - 1].trim();
      }
    }
    
    return signals;
  }

  /**
   * Find potential contacts on the page
   */
  function findContacts() {
    const contacts = [];
    const signals = collectSignals();
    
    // Add found emails as potential contacts
    for (const email of signals.emails) {
      const domain = email.split('@')[1];
      const localPart = email.split('@')[0];
      
      // Skip generic emails like info@, sales@, support@
      const isGeneric = ['info', 'sales', 'support', 'contact', 'hello', 'admin', 'help'].includes(localPart.toLowerCase());
      
      contacts.push({
        email,
        name: isGeneric ? null : localPart.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: isGeneric ? 'generic' : 'personal',
        source: 'page'
      });
    }
    
    // Look for structured contact info in schema
    const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of schemaScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.email) {
          contacts.push({
            email: data.email.replace('mailto:', ''),
            name: data.name || null,
            type: 'schema',
            source: 'structured_data'
          });
        }
        if (data.contactPoint?.email) {
          contacts.push({
            email: data.contactPoint.email.replace('mailto:', ''),
            name: null,
            type: 'contact_point',
            source: 'structured_data'
          });
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    // Add phone numbers
    for (const phone of signals.phoneNumbers) {
      contacts.push({
        phone,
        type: 'phone',
        source: 'page'
      });
    }
    
    // Dedupe by email
    const seen = new Set();
    return contacts.filter(c => {
      const key = c.email || c.phone;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Get page performance hints
   */
  function getPerformanceHints() {
    const hints = [];
    
    // Image optimization
    const images = document.querySelectorAll('img');
    let unoptimized = 0;
    let missingSrcset = 0;
    let missingAlt = 0;
    
    images.forEach(img => {
      if (!img.srcset) missingSrcset++;
      if (!img.alt) missingAlt++;
      if (img.src && !img.src.includes('webp') && !img.src.includes('avif')) {
        unoptimized++;
      }
    });
    
    if (unoptimized > 3) {
      hints.push({ type: 'images', message: `${unoptimized} images may not be optimized (no WebP/AVIF)` });
    }
    
    if (missingSrcset > 3) {
      hints.push({ type: 'responsive', message: `${missingSrcset} images missing srcset for responsive loading` });
    }
    
    if (missingAlt > 2) {
      hints.push({ type: 'a11y', message: `${missingAlt} images missing alt text` });
    }
    
    // Script loading
    const scripts = document.querySelectorAll('script[src]:not([async]):not([defer])');
    if (scripts.length > 3) {
      hints.push({ type: 'scripts', message: `${scripts.length} render-blocking scripts detected` });
    }
    
    // Third-party scripts
    const thirdParty = Array.from(document.querySelectorAll('script[src]'))
      .filter(s => !s.src.includes(location.hostname));
    if (thirdParty.length > 10) {
      hints.push({ type: 'third_party', message: `${thirdParty.length} third-party scripts may slow page` });
    }
    
    // Lazy loading
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    if (images.length > 5 && lazyImages.length === 0) {
      hints.push({ type: 'lazy', message: 'No lazy loading detected for images' });
    }
    
    return hints;
  }

  // Expose functions globally for the message listener
  window.__uptradeDetectTechStack = detectTechStack;
  window.__uptradeCollectSignals = collectSignals;
  window.__uptradeFindContacts = findContacts;
  window.__uptradeGetPerformanceHints = getPerformanceHints;
  
  // Combined function for getPageData
  window.__uptradeGetPageData = function() {
    return {
      url: location.href,
      domain: location.hostname,
      title: document.title,
      techStack: detectTechStack(),
      signals: collectSignals(),
      contacts: findContacts(),
      performanceHints: getPerformanceHints()
    };
  };
  
  console.log('[Uptrade Content] Analysis functions ready');

})();
