# Uptrade Sales Chrome Extension

AI-powered sales prospecting tool for web development agencies.

## Features

- **Tech Stack Detection**: Automatically detects WordPress, Shopify, analytics tools, and 50+ technologies
- **Signal Collection**: Finds contact forms, phone numbers, emails, SSL, analytics, and more
- **AI Scoring**: Analyzes sites and scores them as Hot/Warm/Potential leads
- **One-Click Audits**: Trigger PageSpeed audits and view results
- **Personalized Outreach**: AI generates customized email drafts
- **Gmail Integration**: Open pre-filled emails in Gmail compose
- **Contact Finder**: Scrapes and saves email addresses from pages

## Installation (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `extension` folder

## Before Publishing

Convert SVG icons to PNG:

```bash
# Using ImageMagick
convert icons/icon16.svg icons/icon16.png
convert icons/icon48.svg icons/icon48.png
convert icons/icon128.svg icons/icon128.png

# Or use any SVG to PNG converter
```

## Usage

1. Click the extension icon on any website
2. Sign in with your Uptrade Portal account
3. Click "Analyze Site" to score the prospect
4. Run an audit to get performance scores
5. Generate a personalized outreach email
6. Click "Open in Gmail" to send

## API Endpoints Used

- `POST /crm/target-companies/analyze` - Analyze and score a website
- `POST /crm/target-companies/:id/trigger-audit` - Start PageSpeed audit
- `GET /crm/target-companies/:id/audit-status` - Poll for audit results
- `POST /crm/target-companies/:id/generate-outreach` - Generate email
- `POST /crm/target-companies/:id/save-contacts` - Save scraped contacts
- `POST /crm/target-companies/:id/claim` - Claim prospect for your pipeline

## Settings

Click the gear icon to configure:
- **Scheduling URL**: Your calendar link for meetings (e.g., cal.com/yourname)
- **Email Tone**: Professional, Friendly, or Direct

## Files

```
extension/
├── manifest.json      # Extension configuration
├── popup.html         # Main popup UI
├── popup.js           # Popup logic
├── styles.css         # Popup styles
├── content.js         # Page analysis (runs on all sites)
├── background.js      # Service worker
├── icons/             # Extension icons
└── README.md          # This file
```
