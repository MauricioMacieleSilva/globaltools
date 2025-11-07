
import React from 'react';

interface ZeGlobalIconProps {
  className?: string;
}

export const ZeGlobalIcon: React.FC<ZeGlobalIconProps> = ({ className = "h-4 w-4" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
      <circle cx="12" cy="11.5" r="1.5" />
    </svg>
  );
};
