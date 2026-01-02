# Signal API Migration Guide

This guide covers migrating Portal from internal Signal implementation to the external Signal API (NestJS).

## Architecture Change

### Before (Current)
```
Portal (Netlify Functions)
├── utils/signal.js (internal Signal class)
├── skills/ (7 skill implementations)
└── 17 signal-*.js functions
```

### After (Target)
```
Portal (Netlify Functions)          Signal API (NestJS on Render)
├── utils/signal-api-client.js  →  ├── Skills Module (7 skills, 119 tools)
└── Functions call Signal API       ├── Echo Module (chat interface)
                                    ├── Context Module (RAG)
                                    ├── Agents Module (workflows)
                                    ├── Prompts Module (A/B testing)
                                    └── Learning Module (feedback)
```

## Environment Variables

### Portal (.env)
```bash
# Signal API configuration
SIGNAL_API_URL=http://localhost:3001  # Dev: localhost, Prod: Render URL
SIGNAL_API_KEY=development-key-change-in-production
```

### Signal API (.env)
```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Auth (Supabase JWT validation)
AUTH_JWT_SECRET=xxx  # Same as Portal's

# AI
OPENAI_API_KEY=xxx

# Cache/Queue
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

## Migration Steps

### 1. ✅ Create Signal API Client
Created `netlify/functions/utils/signal-api-client.js` - HTTP wrapper with same interface as internal Signal.

### 2. Update Echo Functions
Replace internal Signal with API client:

**echo-chat.js** (internal team chat):
```javascript
// Before
import { Signal } from './utils/signal.js'
const signal = new Signal(supabase, orgId, { userId })

// After
import { SignalAPIClient } from './utils/signal-api-client.js'
const signal = new SignalAPIClient(orgId, { userId })
```

**echo-chat-public.js** (website visitors):
```javascript
// Same change - replace Signal with SignalAPIClient
```

### 3. Update Skill-Using Functions
Any function that uses skills needs the same change:

**Files to update:**
- `seo-*.js` functions (if they use SEO skill directly)
- `crm-*.js` functions
- `proposals-*.js` functions
- `email-*.js` functions
- `engage-*.js` functions
- `content-*.js` functions

**Pattern:**
```javascript
// Before
import { Signal } from './utils/signal.js'
const signal = new Signal(supabase, orgId)
const result = await signal.invoke('seo', 'analyze_page', { url })

// After
import { SignalAPIClient } from './utils/signal-api-client.js'
const signal = new SignalAPIClient(orgId)
const result = await signal.invoke('seo', 'analyze_page', { url })
```

### 4. Deprecate Signal Functions
Add deprecation notices to 17 `signal-*.js` functions, but keep them as redirects:

```javascript
// netlify/functions/signal-knowledge.js
// DEPRECATED: This function now proxies to Signal API
// Direct API calls: POST /api/signal/knowledge

console.warn('[DEPRECATED] signal-knowledge.js - Use Signal API directly')

import { SignalAPIClient } from './utils/signal-api-client.js'

export async function handler(event) {
  // ... existing logic but using SignalAPIClient instead of Signal
}
```

### 5. Local Testing
```bash
# Terminal 1: Start Signal API
cd SignalAI
pnpm dev  # Runs on port 3001

# Terminal 2: Start Portal
cd uptrade-portal
netlify dev  # Runs on port 8888

# Test in Portal - Echo should route requests to Signal API
```

### 6. Deploy Signal API to Render

**Create New Web Service:**
- Name: `signal-api`
- Region: Oregon (closest to Supabase)
- Build Command: `pnpm install && pnpm build`
- Start Command: `pnpm start:prod`
- Environment Variables: (see above)

**Health Check:**
- Path: `/health/live`
- Expected Response: `{"status":"alive","uptime":123}`

**Custom Domain:**
- Add `signal-api.uptrademedia.com` in Render settings
- Update DNS: CNAME → Render URL

### 7. Update Portal Environment (Production)

In Netlify environment variables:
```bash
SIGNAL_API_URL=https://signal-api.uptrademedia.com
SIGNAL_API_KEY=<generate-strong-secret>
```

### 8. Verify Integration

**Test Checklist:**
- [ ] Echo chat in Messages works
- [ ] SEO analysis in SEO module works
- [ ] CRM lead scoring works
- [ ] Proposal generation works
- [ ] Email drafting works
- [ ] Engage element creation works
- [ ] Content writing works
- [ ] Support chat works
- [ ] Knowledge base search works
- [ ] Memory persists across conversations
- [ ] Patterns are learned from outcomes

## API Endpoints

### Signal API (NestJS)
```
POST /skills/:skill/:tool      - Execute skill tool
POST /echo/chat                - Echo conversational interface
GET  /echo/stream              - SSE streaming
GET  /skills                   - List all skills
GET  /skills/:key              - Get skill definition
GET  /memory/:skill            - Load skill memory
POST /memory/:skill            - Store memory
GET  /patterns/:skill          - Load patterns
POST /patterns/:skill          - Record pattern
POST /actions                  - Track action
PUT  /actions/:id/outcome      - Record outcome
GET  /health/live              - Liveness check
GET  /health/ready             - Readiness check
```

### Portal Netlify Functions (Deprecated)
```
signal-chat.js                 → Use POST /echo/chat
signal-chat-stream.js          → Use GET /echo/stream
signal-knowledge.js            → Use POST /skills/*/search_knowledge
signal-knowledge-sync.js       → Use POST /skills/*/sync_knowledge
signal-faqs.js                 → Use POST /skills/*/list_faqs
signal-faq-generate.js         → Use POST /skills/*/generate_faq
signal-profile-extract.js      → Use POST /skills/*/extract_profile
signal-profile-sync.js         → Use POST /skills/*/sync_profile
signal-config.js               → Use POST /skills/*/update_config
signal-analytics.js            → Use POST /skills/analytics/*
signal-learning.js             → Use POST /learning/feedback
signal-auto-setup.js           → Use POST /agents/research-prospect
signal-design-element.js       → Use POST /skills/engage/design_element
signal-analyze-tests.js        → Use POST /skills/engage/analyze_ab_test
signal-conversations.js        → Use GET /echo/conversations
```

## Rollback Plan

If issues arise after deployment:

1. **Immediate:** Revert `SIGNAL_API_URL` in Portal Netlify env to empty string
2. **Code:** API client checks `if (!SIGNAL_API_URL)` and falls back to internal Signal
3. **Add Fallback:**
```javascript
// In signal-api-client.js
const SIGNAL_API_URL = process.env.SIGNAL_API_URL

if (!SIGNAL_API_URL) {
  console.warn('[Signal] No API URL configured, using internal implementation')
  // Export internal Signal class as fallback
  export { Signal as SignalAPIClient } from './signal.js'
}
```

## Performance Expectations

**Before (Internal):**
- 0ms network overhead (same process)
- Direct database access
- ~500-2000ms total for AI responses

**After (API):**
- ~10-50ms network latency (Netlify → Render)
- Database connection pooling (more efficient)
- ~550-2100ms total for AI responses

**Trade-offs:**
- ➕ Better scalability (dedicated AI service)
- ➕ Proper separation of concerns
- ➕ 6 architectural enhancements (versioning, RAG, agents, etc.)
- ➖ Slight latency increase (~50ms)
- ➖ Additional deployment to manage

## Monitoring

**Signal API (Render):**
- Monitor logs for errors
- Check `/health/ready` endpoint
- Monitor memory usage (AI models are heavy)
- Track request duration metrics

**Portal (Netlify):**
- Monitor for timeout errors calling Signal API
- Check function execution times
- Alert on Signal API connection failures

## Cost Impact

**Additional Infrastructure:**
- Render: $25/month (Starter instance, 512MB RAM)
- Redis: $5/month (Upstash free tier sufficient for dev)
- Total: ~$30/month additional

**Benefits:**
- Shared AI service across multiple portals
- Dedicated resources for AI workloads
- Better resource utilization (no cold starts for AI)

## Next Steps

1. ✅ Create API client
2. ⏳ Update environment variables
3. ⏳ Migrate Echo functions
4. ⏳ Migrate skill functions
5. ⏳ Deprecate signal-*.js functions
6. ⏳ Test locally
7. ⏳ Deploy to Render
8. ⏳ Update production config
