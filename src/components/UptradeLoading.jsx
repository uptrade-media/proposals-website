import React from 'react';

const UptradeLoading = () => {
  return (
    <>
      <style>{`
        .loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          width: 100%;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 50;
        }
        
        .loader-content {
          text-align: center;
          position: relative;
        }

        .svg-wrapper {
          width: 250px;
          height: 250px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        #logo-svg {
          width: 180px;
          height: 180px;
        }

        .logo-path {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: drawPath 1.8s ease-out forwards;
          fill: none;
          stroke: url(#linear-gradient);
          stroke-width: 3;
        }

        @keyframes drawPath {
          to {
            stroke-dashoffset: 0;
          }
        }

        .logo-fill {
          opacity: 0;
          animation: fillIn 0.6s ease-out forwards;
          animation-delay: 1.5s;
        }

        @keyframes fillIn {
          to {
            opacity: 1;
          }
        }
      `}</style>

      <div className="loader-container">
        <div className="loader-content">
          <div className="svg-wrapper">
          
          {/* Your SVG Logo */}
          <svg id="logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 498.88 498.88">
            <defs>
              <linearGradient id="linear-gradient" x1="0" y1="498.88" x2="498.88" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset=".15" stopColor="#54b948"/>
                <stop offset=".85" stopColor="#39bfb0"/>
              </linearGradient>
              <clipPath id="clippath">
                <path d="M250,0C112.55,0,1.12,111.43,1.12,248.88c0,116.99,80.71,215.12,189.49,241.75,5.18,1.13,10.55,1.73,16.07,1.73,41.34,0,75.22-33.51,75.22-74.85v-181.82l85.06,80.71v-72.61l-116.96-110.5-116.96,110.5v72.61l85.06-80.36v156.68c0,18.24-14.78,33.02-33.02,33.02-4.79,0-9.33-1.02-13.44-2.85h0c-66.3-29.89-112.44-96.56-112.44-174.01,0-105.38,85.43-190.81,190.81-190.81s190.81,85.43,190.81,190.81c0,91.33-64.17,167.68-149.89,186.41-5.97,28.42-25.95,51.68-52.39,62.21,3.8.17,7.63.26,11.47.26,137.45,0,248.88-111.43,248.88-248.88S387.45,0,250,0Z"/>
              </clipPath>
            </defs>
            
            {/* Draw the path outline first */}
            <path className="logo-path" d="M250,0C112.55,0,1.12,111.43,1.12,248.88c0,116.99,80.71,215.12,189.49,241.75,5.18,1.13,10.55,1.73,16.07,1.73,41.34,0,75.22-33.51,75.22-74.85v-181.82l85.06,80.71v-72.61l-116.96-110.5-116.96,110.5v72.61l85.06-80.36v156.68c0,18.24-14.78,33.02-33.02,33.02-4.79,0-9.33-1.02-13.44-2.85h0c-66.3-29.89-112.44-96.56-112.44-174.01,0-105.38,85.43-190.81,190.81-190.81s190.81,85.43,190.81,190.81c0,91.33-64.17,167.68-149.89,186.41-5.97,28.42-25.95,51.68-52.39,62.21,3.8.17,7.63.26,11.47.26,137.45,0,248.88-111.43,248.88-248.88S387.45,0,250,0Z"/>
            
            {/* Fill comes in after */}
            <g className="logo-fill">
              <g clipPath="url(#clippath)">
                <rect fill="url(#linear-gradient)" width="498.88" height="498.88"/>
              </g>
            </g>
          </svg>
          </div>
        </div>
      </div>
    </>
  );
};

export default UptradeLoading;