# Analytics API Setup for Portal Integration

The Uptrade Portal expects these API endpoints on your main site (`uptrademedia.com`) to display site analytics.

## Required Endpoints

### 1. Overview Dashboard
```
GET https://uptrademedia.com/api/analytics/overview?days=30
```

**Response:**
```json
{
  "totalPageViews": 12500,
  "uniqueVisitors": 3200,
  "avgSessionDuration": 145,
  "bounceRate": 42.5,
  "topCountries": [
    { "country": "US", "count": 2500 },
    { "country": "UK", "count": 800 }
  ],
  "deviceBreakdown": {
    "mobile": 1800,
    "desktop": 1200,
    "tablet": 200
  }
}
```

### 2. Top Pages
```
GET https://uptrademedia.com/api/analytics/page-views?days=30&groupBy=path&limit=20
```

**Response:**
```json
{
  "data": [
    { "path": "/", "count": 5000, "uniqueVisitors": 2000 },
    { "path": "/services", "count": 1200, "uniqueVisitors": 800 },
    { "path": "/about", "count": 900, "uniqueVisitors": 600 }
  ]
}
```

### 3. Page Views by Day (for charts)
```
GET https://uptrademedia.com/api/analytics/page-views?days=30&groupBy=day
```

**Response:**
```json
{
  "data": [
    { "date": "2025-12-01", "count": 450 },
    { "date": "2025-12-02", "count": 520 },
    { "date": "2025-12-03", "count": 380 }
  ]
}
```

### 4. Page Views by Hour (for heatmap)
```
GET https://uptrademedia.com/api/analytics/page-views?days=30&groupBy=hour
```

**Response:**
```json
{
  "data": [
    { "hour": 0, "count": 120 },
    { "hour": 1, "count": 85 },
    { "hour": 9, "count": 450 },
    { "hour": 14, "count": 520 }
  ]
}
```

---

## CORS Configuration (Required)

The API must allow requests from the portal domain. Add these headers to all responses:

```javascript
// Next.js API route example
export async function GET(request) {
  const data = await getAnalyticsData()
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://portal.uptrademedia.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// Handle preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://portal.uptrademedia.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
```

---

## Implementation Examples

### If using Plausible Analytics

```javascript
// app/api/analytics/overview/route.js
const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY
const SITE_ID = 'uptrademedia.com'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const days = searchParams.get('days') || '30'
  
  const response = await fetch(
    `https://plausible.io/api/v1/stats/aggregate?site_id=${SITE_ID}&period=custom&date=${getDateRange(days)}&metrics=visitors,pageviews,bounce_rate,visit_duration`,
    {
      headers: {
        'Authorization': `Bearer ${PLAUSIBLE_API_KEY}`
      }
    }
  )
  
  const data = await response.json()
  
  return Response.json({
    totalPageViews: data.results.pageviews.value,
    uniqueVisitors: data.results.visitors.value,
    bounceRate: data.results.bounce_rate.value,
    avgSessionDuration: data.results.visit_duration.value
  }, {
    headers: {
      'Access-Control-Allow-Origin': 'https://portal.uptrademedia.com'
    }
  })
}
```

### If using Vercel Analytics

```javascript
// app/api/analytics/overview/route.js
import { analytics } from '@vercel/analytics'

export async function GET(request) {
  // Vercel Analytics data would come from your database
  // where you store analytics events
  const data = await db.analytics.aggregate({...})
  
  return Response.json(data, {
    headers: {
      'Access-Control-Allow-Origin': 'https://portal.uptrademedia.com'
    }
  })
}
```

### If using custom analytics (Supabase)

```javascript
// app/api/analytics/overview/route.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data, count } = await supabase
    .from('page_views')
    .select('*', { count: 'exact' })
    .gte('created_at', startDate.toISOString())
  
  const uniqueVisitors = new Set(data.map(v => v.visitor_id)).size
  
  return Response.json({
    totalPageViews: count,
    uniqueVisitors,
    avgSessionDuration: calculateAvgDuration(data),
    bounceRate: calculateBounceRate(data)
  }, {
    headers: {
      'Access-Control-Allow-Origin': 'https://portal.uptrademedia.com'
    }
  })
}
```

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 30 | Number of days to fetch data for |
| `groupBy` | string | - | Group results by: `path`, `day`, `hour` |
| `limit` | number | 20 | Max results to return (for `groupBy=path`) |

---

## Testing

Test the endpoints are working:

```bash
# Test overview
curl "https://uptrademedia.com/api/analytics/overview?days=7"

# Test page views
curl "https://uptrademedia.com/api/analytics/page-views?days=7&groupBy=path"

# Test CORS
curl -I -X OPTIONS "https://uptrademedia.com/api/analytics/overview" \
  -H "Origin: https://portal.uptrademedia.com"
```

The `Access-Control-Allow-Origin` header should be present in the response.
