/**
 * World-Class Email Templates
 * Professional, responsive email templates for all use cases
 * 
 * Design Principles:
 * - Mobile-first responsive design
 * - Email client compatible (Outlook, Gmail, Apple Mail)
 * - Accessible with proper contrast and alt text
 * - Variable substitution support ({{first_name}}, etc.)
 */

// Brand colors - easily customizable
const BRAND = {
  primary: '#4bbf39',
  primaryDark: '#3a9c2d',
  secondary: '#007AFF',
  dark: '#1a1a1a',
  gray: '#666666',
  lightGray: '#f5f5f7',
  white: '#ffffff',
  border: '#e5e5e5'
}

// ============================================
// WELCOME & ONBOARDING TEMPLATES
// ============================================

export const welcomeTemplates = [
  {
    id: 'welcome-minimal',
    name: 'Welcome - Minimal',
    category: 'welcome',
    description: 'Clean, minimal welcome email with clear CTA',
    thumbnail: '/templates/welcome-minimal.png',
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 60px 40px; text-align: center;">
            <img src="https://via.placeholder.com/120x40?text=LOGO" alt="Logo" style="max-width: 120px; height: auto; margin-bottom: 40px;" />
            
            <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 32px; font-weight: 700; color: ${BRAND.dark}; letter-spacing: -0.5px;">
              Welcome aboard, {{first_name}}! 👋
            </h1>
            
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; line-height: 1.6; color: ${BRAND.gray}; max-width: 480px; margin-left: auto; margin-right: auto;">
              We're thrilled to have you join us. Your account is all set up and ready to go.
            </p>
            
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.white}; text-decoration: none;">
                    Get Started →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${BRAND.gray};">
            <p style="margin: 0 0 8px 0;">Questions? Just reply to this email.</p>
            <p style="margin: 0;">
              <a href="{{unsubscribe_url}}" style="color: ${BRAND.gray}; text-decoration: underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    `
  },
  {
    id: 'welcome-feature-tour',
    name: 'Welcome - Feature Tour',
    category: 'welcome',
    description: 'Welcome email with key feature highlights',
    thumbnail: '/templates/welcome-features.png',
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.primary};">
        <tr>
          <td style="padding: 50px 40px; text-align: center;">
            <img src="https://via.placeholder.com/140x45?text=LOGO" alt="Logo" style="max-width: 140px; height: auto; margin-bottom: 30px;" />
            <h1 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${BRAND.white};">
              Welcome to the family! 🎉
            </h1>
            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: rgba(255,255,255,0.9);">
              Here's everything you need to get started
            </p>
          </td>
        </tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 50px 40px;">
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.7; color: ${BRAND.dark};">
              Hi {{first_name}},<br/><br/>
              Thanks for signing up! We've put together a quick guide to help you make the most of your new account.
            </p>
            
            <!-- Feature 1 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
              <tr>
                <td width="60" valign="top">
                  <div style="width: 50px; height: 50px; background-color: rgba(75, 191, 57, 0.1); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px;">
                    📊
                  </div>
                </td>
                <td valign="top" style="padding-left: 16px;">
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.dark};">
                    Your Dashboard
                  </h3>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.5; color: ${BRAND.gray};">
                    Get a bird's eye view of your projects, invoices, and messages all in one place.
                  </p>
                </td>
              </tr>
            </table>
            
            <!-- Feature 2 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
              <tr>
                <td width="60" valign="top">
                  <div style="width: 50px; height: 50px; background-color: rgba(0, 122, 255, 0.1); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px;">
                    📁
                  </div>
                </td>
                <td valign="top" style="padding-left: 16px;">
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.dark};">
                    File Sharing
                  </h3>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.5; color: ${BRAND.gray};">
                    Securely upload and share files with your team. Everything organized by project.
                  </p>
                </td>
              </tr>
            </table>
            
            <!-- Feature 3 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 40px;">
              <tr>
                <td width="60" valign="top">
                  <div style="width: 50px; height: 50px; background-color: rgba(255, 149, 0, 0.1); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px;">
                    💬
                  </div>
                </td>
                <td valign="top" style="padding-left: 16px;">
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.dark};">
                    Direct Messaging
                  </h3>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.5; color: ${BRAND.gray};">
                    Chat directly with our team. No more searching through email threads.
                  </p>
                </td>
              </tr>
            </table>
            
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: ${BRAND.primary}; border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.white}; text-decoration: none;">
                    Explore Your Dashboard
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
            <p style="margin: 0 0 16px 0;">Need help getting started? <a href="#" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">Schedule a call</a></p>
            <p style="margin: 0;">
              <a href="{{unsubscribe_url}}" style="color: ${BRAND.gray};">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    `
  }
]

// ============================================
// NEWSLETTER TEMPLATES
// ============================================

export const newsletterTemplates = [
  {
    id: 'newsletter-modern',
    name: 'Newsletter - Modern',
    category: 'newsletter',
    description: 'Clean modern newsletter with featured article',
    thumbnail: '/templates/newsletter-modern.png',
    html: `
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white}; border-bottom: 1px solid ${BRAND.border};">
        <tr>
          <td style="padding: 24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <img src="https://via.placeholder.com/120x40?text=LOGO" alt="Logo" style="max-width: 120px; height: auto;" />
                </td>
                <td style="text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
                  December 2025 Edition
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Hero Article -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 40px;">
            <img src="https://via.placeholder.com/520x280?text=Featured+Image" alt="Featured" style="width: 100%; height: auto; border-radius: 12px; margin-bottom: 24px;" />
            
            <span style="display: inline-block; padding: 6px 12px; background-color: rgba(75, 191, 57, 0.1); border-radius: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; color: ${BRAND.primary}; margin-bottom: 16px;">
              FEATURED
            </span>
            
            <h1 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${BRAND.dark}; line-height: 1.3;">
              The Future of Digital Marketing in 2025
            </h1>
            
            <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.7; color: ${BRAND.gray};">
              Discover the trends shaping how businesses connect with their audiences this year. From AI-powered personalization to immersive experiences...
            </p>
            
            <a href="#" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: ${BRAND.primary}; text-decoration: none;">
              Read More →
            </a>
          </td>
        </tr>
      </table>
      
      <!-- Divider -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 0 40px;">
            <hr style="border: 0; border-top: 1px solid ${BRAND.border}; margin: 0;" />
          </td>
        </tr>
      </table>
      
      <!-- Article Grid -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; color: ${BRAND.dark};">
              More Stories
            </h2>
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48%" valign="top" style="padding-right: 4%;">
                  <img src="https://via.placeholder.com/240x140?text=Article+1" alt="Article" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px;" />
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.dark};">
                    5 Tips for Better Email Open Rates
                  </h3>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: ${BRAND.gray};">
                    Simple strategies that actually work.
                  </p>
                </td>
                <td width="48%" valign="top">
                  <img src="https://via.placeholder.com/240x140?text=Article+2" alt="Article" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px;" />
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.dark};">
                    Design Trends to Watch
                  </h3>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: ${BRAND.gray};">
                    What's hot in web design right now.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.dark};">
        <tr>
          <td style="padding: 40px; text-align: center;">
            <img src="https://via.placeholder.com/100x35?text=LOGO" alt="Logo" style="max-width: 100px; height: auto; margin-bottom: 20px; opacity: 0.9;" />
            
            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: rgba(255,255,255,0.7);">
              123 Main Street, City, State 12345
            </p>
            
            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: rgba(255,255,255,0.5);">
              <a href="{{unsubscribe_url}}" style="color: rgba(255,255,255,0.5); text-decoration: underline;">Unsubscribe</a>
              &nbsp;&nbsp;•&nbsp;&nbsp;
              <a href="#" style="color: rgba(255,255,255,0.5); text-decoration: underline;">View Online</a>
            </p>
          </td>
        </tr>
      </table>
    `
  },
  {
    id: 'newsletter-digest',
    name: 'Newsletter - Weekly Digest',
    category: 'newsletter',
    description: 'Compact digest format for regular updates',
    thumbnail: '/templates/newsletter-digest.png',
    html: `
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, ${BRAND.dark} 0%, #2d2d2d 100%);">
        <tr>
          <td style="padding: 40px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 2px; color: ${BRAND.primary}; text-transform: uppercase;">
              Weekly Digest
            </p>
            <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${BRAND.white};">
              December 16, 2025
            </h1>
          </td>
        </tr>
      </table>
      
      <!-- Intro -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 40px 40px 20px;">
            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.7; color: ${BRAND.gray};">
              Hi {{first_name}}, here's what happened this week:
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Digest Item 1 -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 20px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray}; border-radius: 12px;">
              <tr>
                <td style="padding: 24px;">
                  <span style="display: inline-block; padding: 4px 10px; background-color: ${BRAND.primary}; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; color: ${BRAND.white}; margin-bottom: 12px;">
                    NEWS
                  </span>
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.dark};">
                    We Launched Our New Feature
                  </h3>
                  <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: ${BRAND.gray};">
                    The feature you've been waiting for is finally here. Check it out now.
                  </p>
                  <a href="#" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: ${BRAND.primary}; text-decoration: none;">
                    Learn More →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Digest Item 2 -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 0 40px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray}; border-radius: 12px;">
              <tr>
                <td style="padding: 24px;">
                  <span style="display: inline-block; padding: 4px 10px; background-color: ${BRAND.secondary}; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; color: ${BRAND.white}; margin-bottom: 12px;">
                    TIPS
                  </span>
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.dark};">
                    3 Ways to Boost Productivity
                  </h3>
                  <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: ${BRAND.gray};">
                    Quick tips from our team to help you work smarter, not harder.
                  </p>
                  <a href="#" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: ${BRAND.secondary}; text-decoration: none;">
                    Read Tips →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 20px 40px 40px; text-align: center;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: ${BRAND.dark}; border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: ${BRAND.white}; text-decoration: none;">
                    View All Updates
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
            <p style="margin: 0 0 8px 0;">You're receiving this because you subscribed to our weekly digest.</p>
            <p style="margin: 0;">
              <a href="{{unsubscribe_url}}" style="color: ${BRAND.gray}; text-decoration: underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    `
  }
]

// ============================================
// PROMOTIONAL TEMPLATES
// ============================================

export const promotionalTemplates = [
  {
    id: 'promo-sale',
    name: 'Promotional - Big Sale',
    category: 'promotional',
    description: 'Eye-catching sale announcement',
    thumbnail: '/templates/promo-sale.png',
    html: `
      <!-- Hero -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <tr>
          <td style="padding: 60px 40px; text-align: center;">
            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; letter-spacing: 3px; color: rgba(255,255,255,0.9); text-transform: uppercase;">
              Limited Time Only
            </p>
            
            <h1 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 56px; font-weight: 800; color: ${BRAND.white}; letter-spacing: -2px;">
              50% OFF
            </h1>
            
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; color: rgba(255,255,255,0.9);">
              Everything. Yes, everything.
            </p>
            
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: ${BRAND.white}; border-radius: 50px;">
                  <a href="#" style="display: inline-block; padding: 18px 48px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 700; color: #667eea; text-decoration: none;">
                    SHOP NOW
                  </a>
                </td>
              </tr>
            </table>
            
            <p style="margin: 30px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: rgba(255,255,255,0.7);">
              Use code: <strong style="color: ${BRAND.white};">SAVE50</strong> at checkout
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Products -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 50px 40px;">
            <h2 style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700; color: ${BRAND.dark}; text-align: center;">
              Top Picks for You
            </h2>
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="31%" valign="top" style="padding: 0 1%;">
                  <div style="background-color: ${BRAND.lightGray}; border-radius: 12px; padding: 20px; text-align: center;">
                    <img src="https://via.placeholder.com/140x140?text=Product" alt="Product" style="width: 140px; height: 140px; border-radius: 8px; margin-bottom: 16px;" />
                    <h4 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: ${BRAND.dark};">
                      Product Name
                    </h4>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
                      <span style="text-decoration: line-through; color: ${BRAND.gray};">$99</span>
                      <span style="color: #667eea; font-weight: 700; margin-left: 8px;">$49</span>
                    </p>
                  </div>
                </td>
                <td width="31%" valign="top" style="padding: 0 1%;">
                  <div style="background-color: ${BRAND.lightGray}; border-radius: 12px; padding: 20px; text-align: center;">
                    <img src="https://via.placeholder.com/140x140?text=Product" alt="Product" style="width: 140px; height: 140px; border-radius: 8px; margin-bottom: 16px;" />
                    <h4 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: ${BRAND.dark};">
                      Product Name
                    </h4>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
                      <span style="text-decoration: line-through; color: ${BRAND.gray};">$149</span>
                      <span style="color: #667eea; font-weight: 700; margin-left: 8px;">$74</span>
                    </p>
                  </div>
                </td>
                <td width="31%" valign="top" style="padding: 0 1%;">
                  <div style="background-color: ${BRAND.lightGray}; border-radius: 12px; padding: 20px; text-align: center;">
                    <img src="https://via.placeholder.com/140x140?text=Product" alt="Product" style="width: 140px; height: 140px; border-radius: 8px; margin-bottom: 16px;" />
                    <h4 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: ${BRAND.dark};">
                      Product Name
                    </h4>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
                      <span style="text-decoration: line-through; color: ${BRAND.gray};">$79</span>
                      <span style="color: #667eea; font-weight: 700; margin-left: 8px;">$39</span>
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Urgency -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7;">
        <tr>
          <td style="padding: 20px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #92400e;">
            ⏰ <strong>Hurry!</strong> Sale ends in 48 hours
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.dark};">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: rgba(255,255,255,0.6);">
            <p style="margin: 0;">
              <a href="{{unsubscribe_url}}" style="color: rgba(255,255,255,0.6); text-decoration: underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    `
  }
]

// ============================================
// TRANSACTIONAL TEMPLATES
// ============================================

export const transactionalTemplates = [
  {
    id: 'receipt',
    name: 'Receipt / Invoice',
    category: 'transactional',
    description: 'Clean payment receipt email',
    thumbnail: '/templates/receipt.png',
    html: `
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white}; border-bottom: 1px solid ${BRAND.border};">
        <tr>
          <td style="padding: 30px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <img src="https://via.placeholder.com/120x40?text=LOGO" alt="Logo" style="max-width: 120px; height: auto;" />
                </td>
                <td style="text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
                  Receipt #{{invoice_number}}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Success Message -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 50px 40px; text-align: center;">
            <div style="width: 70px; height: 70px; background-color: rgba(75, 191, 57, 0.1); border-radius: 50%; margin: 0 auto 24px; line-height: 70px; font-size: 32px;">
              ✓
            </div>
            
            <h1 style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${BRAND.dark};">
              Payment Successful
            </h1>
            
            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: ${BRAND.gray};">
              Thanks for your payment, {{first_name}}!
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Order Details -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 0 40px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray}; border-radius: 12px;">
              <tr>
                <td style="padding: 30px;">
                  <h3 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: ${BRAND.gray}; text-transform: uppercase; letter-spacing: 1px;">
                    Order Summary
                  </h3>
                  
                  <!-- Line Item -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                    <tr>
                      <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: ${BRAND.dark};">
                        Website Design Package
                      </td>
                      <td style="text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: ${BRAND.dark};">
                        $2,500.00
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Line Item -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: ${BRAND.dark};">
                        SEO Optimization
                      </td>
                      <td style="text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: ${BRAND.dark};">
                        $500.00
                      </td>
                    </tr>
                  </table>
                  
                  <hr style="border: 0; border-top: 1px solid ${BRAND.border}; margin: 0 0 20px 0;" />
                  
                  <!-- Total -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 700; color: ${BRAND.dark};">
                        Total Paid
                      </td>
                      <td style="text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 700; color: ${BRAND.primary};">
                        $3,000.00
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Payment Info -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 0 40px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48%" valign="top" style="padding-right: 4%;">
                  <h4 style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: ${BRAND.gray}; text-transform: uppercase;">
                    Payment Method
                  </h4>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: ${BRAND.dark};">
                    Visa ending in 4242
                  </p>
                </td>
                <td width="48%" valign="top">
                  <h4 style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: ${BRAND.gray}; text-transform: uppercase;">
                    Payment Date
                  </h4>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: ${BRAND.dark};">
                    December 16, 2025
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 0 40px 50px; text-align: center;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: ${BRAND.dark}; border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: ${BRAND.white}; text-decoration: none;">
                    View in Dashboard
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
            <p style="margin: 0 0 8px 0;">Questions about your payment? Just reply to this email.</p>
            <p style="margin: 0;">© 2025 Your Company. All rights reserved.</p>
          </td>
        </tr>
      </table>
    `
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    category: 'transactional',
    description: 'Secure password reset email',
    thumbnail: '/templates/password-reset.png',
    html: `
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 40px 40px 0; text-align: center;">
            <img src="https://via.placeholder.com/120x40?text=LOGO" alt="Logo" style="max-width: 120px; height: auto;" />
          </td>
        </tr>
      </table>
      
      <!-- Content -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 50px 40px; text-align: center;">
            <div style="width: 70px; height: 70px; background-color: rgba(0, 122, 255, 0.1); border-radius: 50%; margin: 0 auto 24px; line-height: 70px; font-size: 32px;">
              🔐
            </div>
            
            <h1 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${BRAND.dark};">
              Reset Your Password
            </h1>
            
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: ${BRAND.gray}; max-width: 400px; margin-left: auto; margin-right: auto;">
              We received a request to reset your password. Click the button below to create a new one.
            </p>
            
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 30px;">
              <tr>
                <td style="background-color: ${BRAND.secondary}; border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.white}; text-decoration: none;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            
            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${BRAND.gray};">
              This link expires in 24 hours.
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Security Notice -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 0 40px 50px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 8px;">
              <tr>
                <td style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #92400e;">
                  <strong>Didn't request this?</strong> You can safely ignore this email. Your password won't change unless you click the link above.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
            <p style="margin: 0;">© 2025 Your Company. All rights reserved.</p>
          </td>
        </tr>
      </table>
    `
  }
]

// ============================================
// ANNOUNCEMENT TEMPLATES
// ============================================

export const announcementTemplates = [
  {
    id: 'announcement-product-launch',
    name: 'Product Launch',
    category: 'announcement',
    description: 'Exciting new product or feature announcement',
    thumbnail: '/templates/product-launch.png',
    html: `
      <!-- Hero -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%);">
        <tr>
          <td style="padding: 60px 40px; text-align: center;">
            <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 4px; color: ${BRAND.primary}; text-transform: uppercase;">
              Introducing
            </p>
            
            <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 48px; font-weight: 800; color: ${BRAND.white}; letter-spacing: -1px; line-height: 1.1;">
              The New<br/>Game Changer
            </h1>
            
            <p style="margin: 0 0 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: rgba(255,255,255,0.7); max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">
              After months of development, we're thrilled to unveil our most ambitious product yet.
            </p>
            
            <img src="https://via.placeholder.com/480x280?text=Product+Hero" alt="Product" style="max-width: 100%; height: auto; border-radius: 16px; margin-bottom: 40px; box-shadow: 0 30px 60px rgba(0,0,0,0.5);" />
            
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: ${BRAND.primary}; border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 18px 48px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 700; color: ${BRAND.white}; text-decoration: none;">
                    See It In Action →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Features Grid -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 60px 40px;">
            <h2 style="margin: 0 0 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${BRAND.dark}; text-align: center;">
              What's New
            </h2>
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48%" valign="top" style="padding-right: 4%; padding-bottom: 30px;">
                  <div style="width: 50px; height: 50px; background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px; margin-bottom: 16px;">
                    ⚡
                  </div>
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.dark};">
                    Lightning Fast
                  </h3>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: ${BRAND.gray};">
                    10x faster performance with our new optimized engine.
                  </p>
                </td>
                <td width="48%" valign="top" style="padding-bottom: 30px;">
                  <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #007AFF 0%, #0055cc 100%); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px; margin-bottom: 16px;">
                    🎨
                  </div>
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.dark};">
                    Beautiful UI
                  </h3>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: ${BRAND.gray};">
                    Completely redesigned with attention to every pixel.
                  </p>
                </td>
              </tr>
              <tr>
                <td width="48%" valign="top" style="padding-right: 4%;">
                  <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #FF9500 0%, #cc7700 100%); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px; margin-bottom: 16px;">
                    🔒
                  </div>
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.dark};">
                    Enterprise Security
                  </h3>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: ${BRAND.gray};">
                    Bank-level encryption and SOC 2 compliance.
                  </p>
                </td>
                <td width="48%" valign="top">
                  <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #AF52DE 0%, #8a3eb3 100%); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px; margin-bottom: 16px;">
                    🤖
                  </div>
                  <h3 style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.dark};">
                    AI Powered
                  </h3>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: ${BRAND.gray};">
                    Smart automation that learns from your workflow.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
            <p style="margin: 0 0 8px 0;">
              <a href="#" style="color: ${BRAND.gray}; margin: 0 10px;">Twitter</a>
              <a href="#" style="color: ${BRAND.gray}; margin: 0 10px;">LinkedIn</a>
              <a href="#" style="color: ${BRAND.gray}; margin: 0 10px;">Facebook</a>
            </p>
            <p style="margin: 0;"><a href="{{unsubscribe_url}}" style="color: ${BRAND.gray};">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    `
  },
  {
    id: 'announcement-event',
    name: 'Event Invitation',
    category: 'announcement',
    description: 'Webinar, conference, or event invitation',
    thumbnail: '/templates/event.png',
    html: `
      <!-- Hero -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #1e3a5f 0%, #0f1c2e 100%);">
        <tr>
          <td style="padding: 60px 40px; text-align: center;">
            <span style="display: inline-block; padding: 8px 16px; background-color: rgba(255,255,255,0.1); border-radius: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 20px;">
              🎟️ You're Invited
            </span>
            
            <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 40px; font-weight: 800; color: ${BRAND.white}; line-height: 1.2;">
              Marketing Summit 2025
            </h1>
            
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: rgba(255,255,255,0.8); max-width: 450px; margin-left: auto; margin-right: auto; line-height: 1.5;">
              Join 500+ industry leaders for our biggest event of the year.
            </p>
            
            <!-- Event Details -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 30px; background-color: rgba(255,255,255,0.1); border-radius: 12px;">
              <tr>
                <td style="padding: 20px 30px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 0 24px 0 0; border-right: 1px solid rgba(255,255,255,0.2);">
                        <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Date</p>
                        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.white};">March 15, 2025</p>
                      </td>
                      <td style="padding: 0 24px; border-right: 1px solid rgba(255,255,255,0.2);">
                        <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Time</p>
                        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.white};">9:00 AM EST</p>
                      </td>
                      <td style="padding: 0 0 0 24px;">
                        <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Location</p>
                        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.white};">Virtual</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: ${BRAND.primary}; border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 18px 48px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 700; color: ${BRAND.white}; text-decoration: none;">
                    Reserve Your Spot
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Speakers -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 60px 40px;">
            <h2 style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700; color: ${BRAND.dark}; text-align: center;">
              Featured Speakers
            </h2>
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="31%" valign="top" style="padding: 0 1%; text-align: center;">
                  <img src="https://via.placeholder.com/100x100?text=Speaker" alt="Speaker" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 16px;" />
                  <h4 style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.dark};">
                    Sarah Johnson
                  </h4>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
                    CEO, TechCorp
                  </p>
                </td>
                <td width="31%" valign="top" style="padding: 0 1%; text-align: center;">
                  <img src="https://via.placeholder.com/100x100?text=Speaker" alt="Speaker" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 16px;" />
                  <h4 style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.dark};">
                    Michael Chen
                  </h4>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
                    VP Marketing, StartupXYZ
                  </p>
                </td>
                <td width="31%" valign="top" style="padding: 0 1%; text-align: center;">
                  <img src="https://via.placeholder.com/100x100?text=Speaker" alt="Speaker" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 16px;" />
                  <h4 style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.dark};">
                    Emily Rodriguez
                  </h4>
                  <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
                    Author & Consultant
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
            <p style="margin: 0 0 8px 0;">Can't make it? <a href="#" style="color: ${BRAND.primary};">Watch the recording later</a></p>
            <p style="margin: 0;"><a href="{{unsubscribe_url}}" style="color: ${BRAND.gray};">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    `
  },
  {
    id: 'announcement-company-news',
    name: 'Company News',
    category: 'announcement',
    description: 'Company updates and milestone announcements',
    thumbnail: '/templates/company-news.png',
    html: `
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white}; border-bottom: 1px solid ${BRAND.border};">
        <tr>
          <td style="padding: 24px 40px; text-align: center;">
            <img src="https://via.placeholder.com/120x40?text=LOGO" alt="Logo" style="max-width: 120px; height: auto;" />
          </td>
        </tr>
      </table>
      
      <!-- Content -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 50px 40px;">
            <span style="display: inline-block; padding: 6px 14px; background-color: rgba(75, 191, 57, 0.1); border-radius: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; color: ${BRAND.primary}; margin-bottom: 20px;">
              📢 Company News
            </span>
            
            <h1 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 32px; font-weight: 700; color: ${BRAND.dark}; line-height: 1.3;">
              We Just Raised $10M to Accelerate Our Mission
            </h1>
            
            <img src="https://via.placeholder.com/520x260?text=Celebration+Photo" alt="News" style="width: 100%; height: auto; border-radius: 12px; margin-bottom: 24px;" />
            
            <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.7; color: ${BRAND.dark};">
              Hi {{first_name}},
            </p>
            
            <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.7; color: ${BRAND.gray};">
              We're thrilled to share some exciting news: we've just closed our Series A funding round of $10 million led by Acme Ventures. This is a huge milestone for our team, and we couldn't have done it without your support.
            </p>
            
            <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.7; color: ${BRAND.gray};">
              This investment will help us:
            </p>
            
            <ul style="margin: 0 0 20px 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.8; color: ${BRAND.gray};">
              <li style="margin-bottom: 8px;">Expand our team with top talent</li>
              <li style="margin-bottom: 8px;">Launch new features you've been asking for</li>
              <li style="margin-bottom: 8px;">Grow into new markets</li>
            </ul>
            
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.7; color: ${BRAND.gray};">
              Thank you for being part of our journey. The best is yet to come!
            </p>
            
            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: ${BRAND.dark};">
              — The Founding Team
            </p>
          </td>
        </tr>
      </table>
      
      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 40px; text-align: center;">
            <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: ${BRAND.dark};">
              Read the full announcement on our blog
            </p>
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: ${BRAND.dark}; border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: ${BRAND.white}; text-decoration: none;">
                    Read Blog Post
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
            <p style="margin: 0;"><a href="{{unsubscribe_url}}" style="color: ${BRAND.gray};">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    `
  }
]

// ============================================
// RE-ENGAGEMENT TEMPLATES
// ============================================

export const reEngagementTemplates = [
  {
    id: 'reengagement-winback',
    name: 'Win-Back Campaign',
    category: 'reengagement',
    description: 'Bring back inactive users with an incentive',
    thumbnail: '/templates/winback.png',
    html: `
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 40px 40px 0; text-align: center;">
            <img src="https://via.placeholder.com/120x40?text=LOGO" alt="Logo" style="max-width: 120px; height: auto;" />
          </td>
        </tr>
      </table>
      
      <!-- Content -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 50px 40px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 20px;">
              👋
            </div>
            
            <h1 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 32px; font-weight: 700; color: ${BRAND.dark};">
              We miss you, {{first_name}}!
            </h1>
            
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; line-height: 1.6; color: ${BRAND.gray}; max-width: 420px; margin-left: auto; margin-right: auto;">
              It's been a while since we've seen you. A lot has changed — come back and see what's new.
            </p>
            
            <!-- Offer Box -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); border-radius: 16px;">
                    <tr>
                      <td style="padding: 30px 40px; text-align: center;">
                        <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">
                          Special Offer Just For You
                        </p>
                        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 42px; font-weight: 800; color: ${BRAND.white};">
                          20% OFF
                        </p>
                        <p style="margin: 8px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: rgba(255,255,255,0.8);">
                          Use code: <strong>COMEBACK20</strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: ${BRAND.dark}; border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: ${BRAND.white}; text-decoration: none;">
                    Come Back & Save
                  </a>
                </td>
              </tr>
            </table>
            
            <p style="margin: 30px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
              Offer expires in 7 days
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
            <p style="margin: 0 0 8px 0;">Not interested anymore? <a href="{{unsubscribe_url}}" style="color: ${BRAND.gray};">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    `
  },
  {
    id: 'reengagement-feedback',
    name: 'Feedback Request',
    category: 'reengagement',
    description: 'Ask customers for feedback or reviews',
    thumbnail: '/templates/feedback.png',
    html: `
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 40px 40px 0; text-align: center;">
            <img src="https://via.placeholder.com/120x40?text=LOGO" alt="Logo" style="max-width: 120px; height: auto;" />
          </td>
        </tr>
      </table>
      
      <!-- Content -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.white};">
        <tr>
          <td style="padding: 50px 40px; text-align: center;">
            <h1 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${BRAND.dark};">
              How are we doing, {{first_name}}?
            </h1>
            
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: ${BRAND.gray}; max-width: 400px; margin-left: auto; margin-right: auto;">
              Your feedback helps us improve. Take 30 seconds to let us know how we're doing.
            </p>
            
            <!-- Rating -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 30px;">
              <tr>
                <td style="padding: 0 8px;">
                  <a href="#" style="display: inline-block; width: 50px; height: 50px; background-color: #fee2e2; border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px; text-decoration: none;">😞</a>
                </td>
                <td style="padding: 0 8px;">
                  <a href="#" style="display: inline-block; width: 50px; height: 50px; background-color: #fef3c7; border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px; text-decoration: none;">😐</a>
                </td>
                <td style="padding: 0 8px;">
                  <a href="#" style="display: inline-block; width: 50px; height: 50px; background-color: #dcfce7; border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px; text-decoration: none;">😊</a>
                </td>
                <td style="padding: 0 8px;">
                  <a href="#" style="display: inline-block; width: 50px; height: 50px; background-color: #d1fae5; border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px; text-decoration: none;">😃</a>
                </td>
                <td style="padding: 0 8px;">
                  <a href="#" style="display: inline-block; width: 50px; height: 50px; background-color: #bbf7d0; border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px; text-decoration: none;">🤩</a>
                </td>
              </tr>
            </table>
            
            <p style="margin: 0 0 30px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${BRAND.gray};">
              Click an emoji to rate your experience
            </p>
            
            <hr style="border: 0; border-top: 1px solid ${BRAND.border}; margin: 0 0 30px 0; max-width: 200px; margin-left: auto; margin-right: auto;" />
            
            <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: ${BRAND.gray};">
              Or leave a detailed review:
            </p>
            
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: ${BRAND.dark}; border-radius: 8px;">
                  <a href="#" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: ${BRAND.white}; text-decoration: none;">
                    Write a Review
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.lightGray};">
        <tr>
          <td style="padding: 30px 40px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${BRAND.gray};">
            <p style="margin: 0;"><a href="{{unsubscribe_url}}" style="color: ${BRAND.gray};">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    `
  }
]

// ============================================
// ALL TEMPLATES COMBINED
// ============================================

export const allTemplates = [
  ...welcomeTemplates,
  ...newsletterTemplates,
  ...promotionalTemplates,
  ...transactionalTemplates,
  ...announcementTemplates,
  ...reEngagementTemplates
]

export const templateCategories = [
  { id: 'all', name: 'All Templates', count: allTemplates.length },
  { id: 'welcome', name: 'Welcome & Onboarding', count: welcomeTemplates.length },
  { id: 'newsletter', name: 'Newsletters', count: newsletterTemplates.length },
  { id: 'promotional', name: 'Promotional', count: promotionalTemplates.length },
  { id: 'transactional', name: 'Transactional', count: transactionalTemplates.length },
  { id: 'announcement', name: 'Announcements', count: announcementTemplates.length },
  { id: 'reengagement', name: 'Re-Engagement', count: reEngagementTemplates.length }
]

export function getTemplateById(id) {
  return allTemplates.find(t => t.id === id)
}

export function getTemplatesByCategory(category) {
  if (category === 'all') return allTemplates
  return allTemplates.filter(t => t.category === category)
}
