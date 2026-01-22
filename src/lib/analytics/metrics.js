/**
 * Analytics Metrics Configuration
 * Builds the metrics array for the MetricsGrid component
 */

/**
 * Build metrics array from summary data
 * @param {Object} summary - Analytics summary from API
 * @param {Function} formatNumber - Number formatter function
 * @param {Function} formatDuration - Duration formatter function
 * @returns {Array} Metrics array for MetricsGrid
 */
export function buildMetrics(summary = {}, formatNumber, formatDuration) {
  return [
    {
      label: 'Page Views',
      value: formatNumber(summary.pageViews),
      change: summary.pageViewsChange || null,
      trend: summary.pageViewsTrend || 'neutral',
      icon: 'eye'
    },
    {
      label: 'Unique Sessions',
      value: formatNumber(summary.uniqueSessions || summary.totalSessions),
      change: summary.sessionsChange || null,
      trend: summary.sessionsTrend || 'neutral',
      icon: 'users'
    },
    {
      label: 'Avg. Duration',
      value: formatDuration(summary.avgSessionDuration),
      change: summary.durationChange || null,
      trend: summary.durationTrend || 'neutral',
      icon: 'clock'
    },
    {
      label: 'Bounce Rate',
      value: `${(summary.bounceRate || 0).toFixed(1)}%`,
      change: summary.bounceRateChange || null,
      trend: summary.bounceRateTrend === 'up' ? 'down' : 'up', // Inverse for bounce rate
      icon: 'target'
    },
    {
      label: 'Conversions',
      value: formatNumber(summary.conversions),
      change: summary.conversionsChange || null,
      trend: summary.conversionsTrend || 'neutral',
      icon: 'target'
    },
    {
      label: 'Engagement Rate',
      value: `${(summary.engagementRate || (100 - (summary.bounceRate || 0))).toFixed(1)}%`,
      change: null,
      trend: 'neutral',
      icon: 'activity'
    }
  ]
}

/**
 * Build page-specific metrics (fewer metrics, more relevant to single page)
 * @param {Object} summary - Analytics summary from API (filtered by path)
 * @param {Object} pageData - Specific page data if available
 * @param {Function} formatNumber - Number formatter function
 * @param {Function} formatDuration - Duration formatter function
 * @returns {Array} Metrics array for MetricsGrid
 */
export function buildPageMetrics(summary = {}, pageData = {}, formatNumber, formatDuration) {
  return [
    {
      label: 'Page Views',
      value: formatNumber(summary.pageViews || pageData.views || 0),
      change: summary.pageViewsChange || null,
      trend: summary.pageViewsTrend || 'neutral',
      icon: 'eye'
    },
    {
      label: 'Unique Visitors',
      value: formatNumber(summary.uniqueSessions || pageData.uniqueViews || 0),
      change: summary.sessionsChange || null,
      trend: summary.sessionsTrend || 'neutral',
      icon: 'users'
    },
    {
      label: 'Avg. Time on Page',
      value: formatDuration(summary.avgSessionDuration || pageData.avgDuration || 0),
      change: summary.durationChange || null,
      trend: summary.durationTrend || 'neutral',
      icon: 'clock'
    },
    {
      label: 'Bounce Rate',
      value: `${(summary.bounceRate || pageData.bounceRate || 0).toFixed(1)}%`,
      change: summary.bounceRateChange || null,
      trend: summary.bounceRateTrend === 'up' ? 'down' : 'up',
      icon: 'target'
    },
    {
      label: 'Scroll Depth',
      value: `${(summary.avgScrollDepth || 0).toFixed(0)}%`,
      change: null,
      trend: 'neutral',
      icon: 'activity'
    },
    {
      label: 'Conversions',
      value: formatNumber(summary.conversions || 0),
      change: summary.conversionsChange || null,
      trend: summary.conversionsTrend || 'neutral',
      icon: 'target'
    }
  ]
}
