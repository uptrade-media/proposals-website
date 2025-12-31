# Signal Wizard Step Audit - Issues Found (FIXED)

## Summary
Based on recent fixes, conducted comprehensive audit of all Signal.invoke() calls in SEO wizard steps.

## ✅ FIXES APPLIED

### 1. Backward Compatibility Added to Signal.invoke()

**Fixed in:** `netlify/functions/utils/signal.js`

The Signal.invoke() method now supports both calling conventions:
- **New format:** `invoke(skillKey, tool, params, options)`
- **Legacy format:** `invoke({ module, tool, systemPrompt, userPrompt, responseFormat, temperature })`

Legacy calls are automatically converted to the new format with:
- Prompts combined into `additionalContext.tool_prompt`
- "**Return valid JSON**" automatically appended for json_object response format
- Temperature preserved from legacy config
- Tool validation skipped for legacy calls (they often use unlisted tools)

### 2. Progress Calculation Fixed

**Fixed in:** `src/components/signal/SignalSetupWizard.jsx`

Added PROGRESS_RANGES constant for consistent progress:
- Discovery: 0-15% (4 steps)
- GSC: 15-20% (1 step)  
- Parallel: 20-60% (12 steps)
- Training: 60-70% (1 step)
- Signal: 70-85% (5 steps)
- Final: 85-100% (10 steps)

Added `calcPhaseProgress()` helper function for consistent calculation across all phases.

### 3. SQL Migration Created

**File:** `supabase/migrations/20250101_add_all_seo_tools.sql`

Adds all discovered tools to signal_skills.allowed_tools:
- Core analysis: analyze_page, analyze_title_meta, analyze_headings, etc.
- Content: generate_schema, content_brief, blog_ideas
- SERP/Ranking: analyze_serp_features, predict_rankings
- Backlinks: discover_backlinks, analyze_backlink_gap
- Local SEO: analyze_local_seo, local_seo_analysis
- And 30+ more tools

**Run in Supabase SQL Editor to apply.**

## Issues Found (Now Resolved)

### 1. Old Signal.invoke() Signature (16 instances in seo-skill.js)

**Pattern:** `signal.invoke({ module: 'seo', tool: 'x', systemPrompt: '', userPrompt: '' })`  
**Should be:** `signal.invoke('seo', 'tool_name', params, { additionalContext: { tool_prompt: '' } })`

#### Files with old signatures:

**seo-skill.js:**
- Line 348: `analyzeTitleMeta()` - analyze_title_meta
- Line 397: `analyzeHeadings()` - analyze_headings  
- Line 435: `analyzeImageSEO()` - analyze_images
- Line 473: `analyzeCannibalization()` - analyze_cannibalization
- Line 505: `analyzeStructuredData()` - analyze_schema
- Line 540: `analyzeLinkEquity()` - analyze_link_equity
- Line 576: `analyzeContentQuality()` - analyze_content_quality
- Line 620: `analyzeMobileSEO()` - analyze_mobile
- Line 661: `analyzePageSpeed()` - analyze_speed
- Line 698: `analyzeCoreWebVitals()` - analyze_web_vitals
- Line 776: `analyzeTopicClusters()` - analyze_topic_clusters
- Line 799: `analyzeCompetitors()` - analyze_competitors
- Line 823: `generateContentBrief()` - generate_content_brief
- Line 877: `predictRankings()` - predict_rankings
- Line 1268: `analyzeBacklinkGap()` - analyze_backlink_gap
- Line 1927: `detectContentDecay()` - detect_content_decay

**Background functions:**
- seo-local-analyze-background.mjs Line 295: local_seo_analysis
- seo-serp-analyze.js Line 229: serp_analysis
- seo-predictive-ranking-background.mjs Line 343: (check tool name)
- seo-content-decay-background.mjs Line 358: (check tool name)

### 2. Missing Tools in allowed_tools Array

These tools need to be added to signal_skills.allowed_tools for skill_key='seo':

**Already identified (needs SQL):**
- analyze_local_seo ✓ (in add-missing-seo-tools.sql)
- discover_backlinks ✓ (in add-missing-seo-tools.sql)
- analyze_serp_features ✓ (in add-missing-seo-tools.sql)
- content_gap_analysis ✓ (in add-missing-seo-tools.sql)

**Additional tools found:**
- analyze_title_meta
- analyze_headings
- analyze_images
- analyze_cannibalization
- analyze_schema
- analyze_link_equity
- analyze_content_quality
- analyze_mobile
- analyze_speed
- analyze_web_vitals
- analyze_topic_clusters
- analyze_competitors
- generate_content_brief
- predict_rankings
- analyze_backlink_gap
- detect_content_decay
- local_seo_analysis
- serp_analysis
- backlink_sources (already working in seo-backlink-gap-background.mjs)
- analyze_backlink (already working in seo-backlink-gap-background.mjs)

### 3. Missing "JSON" Keyword in Prompts

When using `response_format: { type: 'json_object' }`, prompts MUST contain the word "JSON" or "json".

**Files to check:**
- All the methods listed above need "Return valid JSON" added to prompts
- seo-local-analyze-background.mjs Line 295: Has responseFormat but prompt may need "JSON"

### 4. Database Column Issues

**Already fixed:**
- ✓ `type` → `job_type` in seo_background_jobs inserts

### 5. Null/Undefined Safety

**Already fixed:**
- ✓ position.toFixed() in cannibalization (now checks for null)

## Recommended Actions

### Immediate (Critical for wizard functionality):

1. **Update add-missing-seo-tools.sql** to include ALL tools:
   ```sql
   UPDATE signal_skills 
   SET allowed_tools = allowed_tools || jsonb_build_array(
     'analyze_local_seo', 'discover_backlinks', 'analyze_serp_features', 
     'content_gap_analysis', 'analyze_title_meta', 'analyze_headings',
     'analyze_images', 'analyze_cannibalization', 'analyze_schema',
     'analyze_link_equity', 'analyze_content_quality', 'analyze_mobile',
     'analyze_speed', 'analyze_web_vitals', 'analyze_topic_clusters',
     'analyze_competitors', 'generate_content_brief', 'predict_rankings',
     'analyze_backlink_gap', 'detect_content_decay', 'local_seo_analysis',
     'serp_analysis'
   )
   WHERE skill_key = 'seo';
   ```

2. **Fix all Signal.invoke() calls** - Convert to new signature pattern

3. **Add "JSON" to all prompts** using response_format

### Testing Priority:

After fixes, test these wizard steps in order:
1. ✓ Connect (working)
2. ✓ Crawl Sitemap (working)
3. ✓ Crawl Pages (working)  
4. ⚠️ Internal Links (needs invoke fix)
5. ✓ GSC Sync (working)
6. ⚠️ All parallel analysis steps (12 steps - all need fixes)
7. ⚠️ AI Training (stuck in 'in_progress', needs reset)

## Files Requiring Changes

### High Priority (wizard-blocking):
1. netlify/functions/skills/seo-skill.js (16 methods)
2. netlify/functions/seo-local-analyze-background.mjs
3. netlify/functions/seo-serp-analyze.js
4. netlify/functions/seo-predictive-ranking-background.mjs
5. netlify/functions/seo-content-decay-background.mjs

### Database:
6. add-missing-seo-tools.sql (expand to include all tools)

## Impact Assessment

**Currently Working:**
- Basic sitemap discovery
- GSC sync
- Background job tracking
- Some parallel analysis (backlink gap)

**Currently Broken:**
- AI training (stuck status)
- Internal links analysis
- Local SEO analysis
- Backlinks discovery
- SERP analysis
- Content gap analysis  
- Most other analysis steps (wrong invoke signature)

## Estimated Fix Effort

- Update invoke signatures: ~30 methods × 5 min = 2.5 hours
- Add JSON keywords to prompts: Included in above
- Update SQL with all tools: 5 minutes
- Test all wizard steps: 1 hour
- **Total: ~4 hours**

## Notes

All these issues stem from:
1. Signal API changing from object parameter to (skillKey, tool, params, options)
2. Incomplete tool registration in database
3. OpenAI requirement for "JSON" keyword when using json_object format

The fixes are mechanical but need to be applied consistently across all affected files.
