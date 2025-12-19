/**
 * SparklineChart - Minimalist trend visualization
 * 
 * Lightweight SVG-based sparkline for inline trend display.
 * Used in metric cards, keyword rankings, and compact dashboards.
 */

import { useMemo } from 'react'

/**
 * @param {Object} props
 * @param {number[]} props.data - Array of numeric values
 * @param {number} [props.width=100] - Chart width in pixels
 * @param {number} [props.height=32] - Chart height in pixels
 * @param {string} [props.color] - Line color (defaults to accent)
 * @param {boolean} [props.showArea=false] - Fill area under line
 * @param {boolean} [props.showDots=false] - Show data point dots
 * @param {boolean} [props.showEndDot=true] - Show dot at end point
 * @param {'positive'|'negative'|'neutral'|'auto'} [props.trend='auto'] - Trend direction for color
 * @param {string} [props.className] - Additional CSS classes
 */
export default function SparklineChart({
  data = [],
  width = 100,
  height = 32,
  color,
  showArea = false,
  showDots = false,
  showEndDot = true,
  trend = 'auto',
  className = ''
}) {
  // Calculate chart metrics and path
  const chartData = useMemo(() => {
    if (!data || data.length < 2) {
      return null
    }

    const values = data.filter(v => typeof v === 'number' && !isNaN(v))
    if (values.length < 2) return null

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    // Add padding to prevent clipping
    const padding = { x: 4, y: 4 }
    const chartWidth = width - (padding.x * 2)
    const chartHeight = height - (padding.y * 2)

    // Calculate points
    const points = values.map((value, index) => ({
      x: padding.x + (index / (values.length - 1)) * chartWidth,
      y: padding.y + chartHeight - ((value - min) / range) * chartHeight,
      value
    }))

    // Generate SVG path
    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ')

    // Generate area path (for filled version)
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${height - padding.y} L ${padding.x} ${height - padding.y} Z`

    // Determine trend direction
    let trendDirection = trend
    if (trend === 'auto') {
      const first = values[0]
      const last = values[values.length - 1]
      if (last > first) trendDirection = 'positive'
      else if (last < first) trendDirection = 'negative'
      else trendDirection = 'neutral'
    }

    return {
      points,
      linePath,
      areaPath,
      min,
      max,
      trendDirection,
      lastValue: values[values.length - 1],
      firstValue: values[0]
    }
  }, [data, width, height, trend])

  // Determine colors based on trend
  const colors = useMemo(() => {
    if (color) {
      return {
        line: color,
        area: `${color}20`,
        dot: color
      }
    }

    switch (chartData?.trendDirection) {
      case 'positive':
        return {
          line: 'var(--success)',
          area: 'rgba(34, 197, 94, 0.15)',
          dot: 'var(--success)'
        }
      case 'negative':
        return {
          line: 'var(--error)',
          area: 'rgba(239, 68, 68, 0.15)',
          dot: 'var(--error)'
        }
      default:
        return {
          line: 'var(--accent-primary)',
          area: 'rgba(99, 102, 241, 0.15)',
          dot: 'var(--accent-primary)'
        }
    }
  }, [color, chartData?.trendDirection])

  // Empty state
  if (!chartData) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span 
          className="text-[10px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          No data
        </span>
      </div>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Area fill */}
      {showArea && (
        <path
          d={chartData.areaPath}
          fill={colors.area}
          strokeWidth="0"
        />
      )}

      {/* Line */}
      <path
        d={chartData.linePath}
        fill="none"
        stroke={colors.line}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* All dots */}
      {showDots && chartData.points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="2"
          fill={colors.dot}
        />
      ))}

      {/* End dot only */}
      {showEndDot && !showDots && (
        <circle
          cx={chartData.points[chartData.points.length - 1].x}
          cy={chartData.points[chartData.points.length - 1].y}
          r="3"
          fill={colors.dot}
        />
      )}
    </svg>
  )
}

/**
 * SparklineWithLabel - Sparkline with value label
 */
export function SparklineWithLabel({
  data,
  label,
  value,
  suffix = '',
  trend,
  width = 80,
  height = 24,
  className = ''
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <SparklineChart
        data={data}
        width={width}
        height={height}
        trend={trend}
        showArea
        showEndDot={false}
      />
      <div className="flex flex-col">
        {label && (
          <span 
            className="text-[10px] uppercase tracking-wide"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {label}
          </span>
        )}
        <span 
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}{suffix}
        </span>
      </div>
    </div>
  )
}

/**
 * MiniTrendIndicator - Compact trend arrow with sparkline
 */
export function MiniTrendIndicator({
  data,
  changePercent,
  size = 'sm'
}) {
  const isPositive = changePercent > 0
  const isNegative = changePercent < 0

  const sizeClasses = {
    sm: { chart: { width: 48, height: 16 }, text: 'text-xs' },
    md: { chart: { width: 64, height: 20 }, text: 'text-sm' },
    lg: { chart: { width: 80, height: 24 }, text: 'text-base' }
  }

  const config = sizeClasses[size] || sizeClasses.sm

  return (
    <div className="flex items-center gap-1.5">
      <SparklineChart
        data={data}
        width={config.chart.width}
        height={config.chart.height}
        trend={isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}
        showEndDot={false}
      />
      <span 
        className={`${config.text} font-medium flex items-center gap-0.5`}
        style={{ 
          color: isPositive 
            ? 'var(--success)' 
            : isNegative 
              ? 'var(--error)' 
              : 'var(--text-tertiary)' 
        }}
      >
        {isPositive && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        )}
        {isNegative && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
        {Math.abs(changePercent).toFixed(1)}%
      </span>
    </div>
  )
}

/**
 * MetricSparkline - Complete metric card with sparkline
 */
export function MetricSparkline({
  label,
  value,
  previousValue,
  data,
  suffix = '',
  format = 'number',
  className = ''
}) {
  const change = previousValue !== undefined && previousValue !== 0
    ? ((value - previousValue) / previousValue) * 100
    : 0

  const formattedValue = useMemo(() => {
    if (format === 'number') {
      return value?.toLocaleString() ?? '-'
    }
    if (format === 'percent') {
      return `${value?.toFixed(1) ?? '-'}%`
    }
    if (format === 'duration') {
      // Assume seconds
      if (value < 60) return `${value?.toFixed(1) ?? '-'}s`
      return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`
    }
    return value
  }, [value, format])

  const trend = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'

  return (
    <div 
      className={`p-3 rounded-lg ${className}`}
      style={{ 
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)'
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p 
            className="text-xs uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {label}
          </p>
          <p 
            className="text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {formattedValue}{suffix}
          </p>
          {change !== 0 && (
            <p 
              className="text-xs flex items-center gap-0.5 mt-0.5"
              style={{ 
                color: trend === 'positive' 
                  ? 'var(--success)' 
                  : trend === 'negative' 
                    ? 'var(--error)' 
                    : 'var(--text-tertiary)' 
              }}
            >
              {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </p>
          )}
        </div>
        {data && data.length >= 2 && (
          <SparklineChart
            data={data}
            width={60}
            height={32}
            trend={trend}
            showArea
            showEndDot
          />
        )}
      </div>
    </div>
  )
}
