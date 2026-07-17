'use client';

import React from 'react';

interface HeartLogoProps {
  className?: string;
  size?: number | string;
}

export default function HeartLogo({ className = '', size = 24 }: HeartLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ width: size, height: size }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft 3D base gradient */}
        <linearGradient id="logoHeartGrad" x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#d9b36c" />
          <stop offset="42%" stopColor="#8e3d58" />
          <stop offset="100%" stopColor="#2b101d" />
        </linearGradient>
        
        {/* Shiny bezel highlights */}
        <linearGradient id="logoHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Drop shadow for the inner element */}
        <filter id="logoBevelShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Outer 3D ring/base */}
      <circle cx="50" cy="50" r="45" fill="url(#logoHeartGrad)" opacity="0.15" />
      
      {/* Real-looking 3D Heart Symbol */}
      <path
        d="M 50 78 
           C 44 72, 14 52, 14 34 
           C 14 20, 26 12, 38 18
           C 44 21, 47 27, 50 30
           C 53 27, 56 21, 62 18
           C 74 12, 86 20, 86 34
           C 86 52, 56 72, 50 78 Z"
        fill="url(#logoHeartGrad)"
        filter="url(#logoBevelShadow)"
      />

      {/* Glossy Overlay/Reflection */}
      <path
        d="M 38 19
           C 44 22, 47 28, 50 31
           C 53 28, 56 22, 62 19
           C 72 14, 82 21, 82 33
           C 82 37, 78 43, 70 49
           C 60 57, 52 61, 50 61
           C 48 61, 40 57, 30 49
           C 22 43, 18 37, 18 33
           C 18 21, 28 14, 38 19 Z"
        fill="url(#logoHighlight)"
        opacity="0.35"
      />

      {/* Extra bright highlight dot on top-left curve */}
      <ellipse cx="32" cy="28" rx="5" ry="3" transform="rotate(-30 32 28)" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}
