'use client';

import SmartImage from '@/components/shared/smart-image';

import React from 'react';

interface WorexaLogoProps {
  className?: string;
  height?: number | string;
}

export default function WorexaLogo({ className = '', height = 32 }: WorexaLogoProps) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <SmartImage
        src="/images/worexa-logo.jpg"
        alt="Worexa Technologies"
        className="object-contain"
        style={{ 
          height, 
          mixBlendMode: 'screen', // Blends black background away completely
          filter: 'brightness(1.2)' // Makes the orange/white colors pop more on a dark footer
        }}
      />
    </div>
  );
}
