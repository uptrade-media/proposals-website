/**
 * Signal SEO Animated Logo
 * 
 * Ported from the main website's SignalAILogo component
 * Features animated rotating rings with the Signal gradient and arrow design
 */

import React, { useId } from 'react'

export default function SignalSEOLogo({ size = 64, className = '', animate = true, white = false }) {
  const uniqueId = useId()
  const gradientId = `signal-gradient-${uniqueId}`
  const center = 242.1
  
  // Ring configuration
  const innerRadius = 110
  const innerStroke = 18
  const innerGap = 27
  
  const middleRadius = 168
  const middleStroke = 18
  const middleGap = 18
  
  // Helper to create arc path
  const createArc = (radius, startAngle, endAngle) => {
    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    
    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)
    
    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
  }
  
  // Inner ring: 2 equal halves with equal gaps
  const halfArc = (360 - 2 * innerGap) / 2
  const innerArcs = [
    createArc(innerRadius, innerGap / 2, innerGap / 2 + halfArc),
    createArc(innerRadius, 180 + innerGap / 2, 180 + innerGap / 2 + halfArc),
  ]
  
  // Middle ring: 3 equal thirds with equal gaps
  const thirdArc = (360 - 3 * middleGap) / 3
  const middleArcs = [
    createArc(middleRadius, middleGap / 2, middleGap / 2 + thirdArc),
    createArc(middleRadius, 120 + middleGap / 2, 120 + middleGap / 2 + thirdArc),
    createArc(middleRadius, 240 + middleGap / 2, 240 + middleGap / 2 + thirdArc),
  ]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * (482.45 / 484.21)}
      viewBox="0 0 484.21 482.45"
      className={className}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="70.2"
          y1="70.19"
          x2="413.46"
          y2="413.45"
          gradientUnits="userSpaceOnUse"
        >
          {white ? (
            <>
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#ffffff" />
            </>
          ) : (
            <>
              <stop offset=".2" stopColor="#95d47d" />
              <stop offset=".65" stopColor="#238b95" />
            </>
          )}
        </linearGradient>
        
        {animate && (
          <style>
            {`
              @keyframes signal-rotate-cw {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes signal-rotate-ccw {
                from { transform: rotate(0deg); }
                to { transform: rotate(-360deg); }
              }
              .signal-inner-ring-${uniqueId} {
                animation: signal-rotate-cw 8s linear infinite;
                transform-origin: ${center}px ${center}px;
              }
              .signal-middle-ring-${uniqueId} {
                animation: signal-rotate-ccw 12s linear infinite;
                transform-origin: ${center}px ${center}px;
              }
            `}
          </style>
        )}
      </defs>

      {/* Middle ring (thirds) - rotates counter-clockwise */}
      <g className={animate ? `signal-middle-ring-${uniqueId}` : ""}>
        {middleArcs.map((d, i) => (
          <path
            key={`middle-${i}`}
            d={d}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={middleStroke}
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* Inner ring (halves) - rotates clockwise */}
      <g className={animate ? `signal-inner-ring-${uniqueId}` : ""}>
        {innerArcs.map((d, i) => (
          <path
            key={`inner-${i}`}
            d={d}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={innerStroke}
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* Outer static ring with arrow - the signature Signal logo shape */}
      <path
        fill={`url(#${gradientId})`}
        d="M143.46,427.94c6.63,3.62,14.61,7.41,23.88,10.76,9.6,3.46,18.34,6.39,26.05,7.12,2.11.2,13.32-.21,22.39-9.25,5.74-5.72,9.3-13.62,9.33-22.35h0v-45.17s0,0,0,0v-122.73l-1.06-.47-35.66,32.79c-.41.37-1.06.09-1.06-.47v-32.23l.21-.47,54.56-50.18h0l54.77,50.37h0v33.79s0,0,0,0l-36.72-33.92-1.07.47v174.68c0,32.62-26.46,59.62-59.08,59.02-5.34-.1-10.5-.93-15.39-2.37,0,0,0,0,0,0C61.86,447.43-24.26,323.97,6.14,186.74,26.3,95.74,98.33,24.71,189.55,5.53c156.66-32.94,294.66,85.7,294.66,236.57,0,116.93-82.77,215.11-193.12,237.15-8.5,1.7-18.93,2.74-29.05,3.2-.63.03-.91-.79-.39-1.15,4.47-3.13,11.01-8.54,15.99-16.11,4.08-6.21,6.24-12.12,7.42-16.45.06-.22.24-.39.46-.44,97.61-22.45,166.95-108.92,166.95-206.2,0-129.41-116.85-231.53-250.79-206.61C117.63,51.14,51.44,117.13,35.6,201.14c-18.34,97.26,30.34,185.56,107.86,226.8,0,.04.01.08.02.12"
      />
    </svg>
  )
}
