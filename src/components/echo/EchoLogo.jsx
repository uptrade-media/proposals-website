import React, { useState } from 'react';

const EchoLogo = ({ 
  size = 120, 
  className = '', 
  animated = true,
  isListening = false,
  isPulsing = true 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: size, height: size }}
    >
      <svg 
        viewBox="0 0 484.21 482.45" 
        width={size} 
        height={size}
        className="overflow-visible"
      >
        <defs>
          {/* Glow filter for listening state */}
          <filter id="echo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <g 
          fill="#ffffff"
          style={{
            filter: isListening ? 'url(#echo-glow)' : 'none',
            transition: 'filter 0.3s ease'
          }}
        >
          {/* Outer chat bubble shell */}
          <path 
            d="M484.21,242.1c0,116.93-82.77,215.11-193.12,237.15-8.5,1.7-18.93,2.74-29.05,3.2-.63.03-.91-.79-.39-1.15,4.47-3.13,11.01-8.54,15.99-16.11,4.08-6.21,6.24-12.12,7.42-16.45.06-.22.24-.39.46-.44,97.61-22.45,166.95-108.92,166.95-206.2,0-129.41-116.85-231.53-250.79-206.61C117.63,51.14,51.44,117.13,35.6,201.14c-18.34,97.26,30.34,185.56,107.86,226.8,6.63,3.62,14.61,7.41,23.88,10.76,9.6,3.46,18.34,6.39,26.05,7.12,2.11.2,13.32-.21,22.39-9.25,5.74-5.72,9.3-13.62,9.33-22.35h0v-45.17s0,0,0,0v-5.38s0-.02,0-.03V90.55c0-9.34,7.64-16.98,16.98-16.98s16.98,7.64,16.98,16.98v273.08s0,.02,0,.03v57.02c0,32.62-26.46,59.62-59.08,59.02-5.34-.1-10.5-.93-15.39-2.37,0,0,0,0,0,0C61.86,447.43-24.26,323.97,6.14,186.74,26.3,95.74,98.33,24.71,189.55,5.53c156.66-32.94,294.66,85.7,294.66,236.57Z"
            style={{
              transform: isPulsing && animated ? undefined : 'none',
              transformOrigin: 'center'
            }}
          >
            {isPulsing && animated && (
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1;1.02;1"
                dur="4s"
                repeatCount="indefinite"
                additive="sum"
              />
            )}
          </path>
          
          {/* Left sound bar - tallest center bar */}
          <path 
            d="M204.49,350.68v-212.7c0-9.34-7.64-16.98-16.98-16.98h0c-9.34,0-16.98,7.64-16.98,16.98v212.7c0,9.34,7.64,16.98,16.98,16.98h0c9.34,0,16.98-7.64,16.98-16.98Z"
            style={{ transformOrigin: '187.5px 244.33px' }}
          >
            {animated && (
              <animateTransform
                attributeName="transform"
                type="scale"
                values={isListening || isHovered ? "1 1;1 0.6;1 0.85;1 0.5;1 1" : "1 1;1 0.85;1 1"}
                dur={isListening || isHovered ? "1s" : "2s"}
                repeatCount="indefinite"
              />
            )}
          </path>
          
          {/* Right sound bar - tallest center bar */}
          <path 
            d="M313.68,350.68v-212.7c0-9.34-7.64-16.98-16.98-16.98h0c-9.34,0-16.98,7.64-16.98,16.98v212.7c0,9.34,7.64,16.98,16.98,16.98h0c9.34,0,16.98-7.64,16.98-16.98Z"
            style={{ transformOrigin: '296.7px 244.33px' }}
          >
            {animated && (
              <animateTransform
                attributeName="transform"
                type="scale"
                values={isListening || isHovered ? "1 1;1 0.5;1 0.9;1 0.4;1 1" : "1 1;1 0.9;1 1"}
                dur={isListening || isHovered ? "0.8s" : "2.5s"}
                repeatCount="indefinite"
              />
            )}
          </path>
          
          {/* Left echo wave indicator */}
          <path d="M149.35,297.17v-105.68c0-7.21-7.64-13.1-16.98-13.1h0c-9.34,0-16.98,5.9-16.98,13.1,0,52.76-54.06,49.84-54.06,52.84,0,3.49,54.06,0,54.06,52.84,0,7.21,7.64,13.1,16.98,13.1h0c9.34,0,16.98-5.9,16.98-13.1Z">
            {animated && (
              <>
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 0;-8 0;0 0"
                  dur={isListening || isHovered ? "0.5s" : "3s"}
                  repeatCount="indefinite"
                  additive="sum"
                />
                <animate
                  attributeName="opacity"
                  values={isListening || isHovered ? "1;0.6;1;0.4;1" : "1;0.8;1"}
                  dur={isListening || isHovered ? "0.5s" : "3s"}
                  repeatCount="indefinite"
                />
              </>
            )}
          </path>
          
          {/* Right echo wave indicator */}
          <path d="M351.84,310.27h0c9.34,0,16.98-5.9,16.98-13.1,0-52.84,54.06-49.3,54.06-52.84,0-3.1-54.06-.08-54.06-52.84,0-7.21-7.64-13.1-16.98-13.1h0c-9.34,0-16.98,5.9-16.98,13.1v105.68c0,7.21,7.64,13.1,16.98,13.1Z">
            {animated && (
              <>
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 0;8 0;0 0"
                  dur={isListening || isHovered ? "0.5s" : "3s"}
                  repeatCount="indefinite"
                  additive="sum"
                />
                <animate
                  attributeName="opacity"
                  values={isListening || isHovered ? "1;0.4;1;0.6;1" : "1;0.8;1"}
                  dur={isListening || isHovered ? "0.5s" : "3s"}
                  repeatCount="indefinite"
                />
              </>
            )}
          </path>
        </g>
      </svg>
    </div>
  );
};

export default EchoLogo;
