import React from 'react';

export default function YashCreationLogo({ className = 'w-8 h-8', ...props }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="ycGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1DB954" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <filter id="ycGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Outer Stylized Circular Ring */}
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke="url(#ycGradient)"
        strokeWidth="2"
        strokeDasharray="6 4"
        className="animate-spin-slow"
        style={{ transformOrigin: 'center' }}
      />
      
      {/* Left Wave Bars */}
      <rect x="22" y="45" width="4" height="10" rx="2" fill="url(#ycGradient)" opacity="0.4" />
      <rect x="30" y="38" width="4" height="24" rx="2" fill="url(#ycGradient)" opacity="0.6" />
      <rect x="38" y="28" width="4" height="44" rx="2" fill="url(#ycGradient)" opacity="0.8" />
      
      {/* Centered stylized Y & C emblem with glow */}
      <g filter="url(#ycGlow)">
        {/* The 'Y' part */}
        <path
          d="M 44 36 L 50 48 L 50 64"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 56 36 L 50 48"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* The 'C' curve enclosing it */}
        <path
          d="M 68 40 C 64 34, 52 34, 48 40 C 42 47, 42 57, 48 64 C 52 70, 64 70, 68 64"
          stroke="url(#ycGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      
      {/* Right Wave Bars */}
      <rect x="58" y="28" width="4" height="44" rx="2" fill="url(#ycGradient)" opacity="0.8" />
      <rect x="66" y="38" width="4" height="24" rx="2" fill="url(#ycGradient)" opacity="0.6" />
      <rect x="74" y="45" width="4" height="10" rx="2" fill="url(#ycGradient)" opacity="0.4" />
    </svg>
  );
}
