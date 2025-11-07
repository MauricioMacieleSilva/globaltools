
import React from 'react';

interface ChapaBlankIconProps {
  className?: string;
  size?: number;
}

export const ChapaBlankIcon: React.FC<ChapaBlankIconProps> = ({ 
  className = "", 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Chapa Metálica"
    >
      <defs>
        <linearGradient id="chapaFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="chapaTop" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="chapaRight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      
      {/* Face principal da chapa - retangular clara */}
      <path
        d="M2 8 L16 8 L16 18 L2 18 Z"
        fill="url(#chapaFace)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Face superior da chapa - perspectiva isométrica */}
      <path
        d="M2 8 L5 5 L19 5 L16 8 Z"
        fill="url(#chapaTop)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Face lateral direita da chapa - espessura */}
      <path
        d="M16 8 L19 5 L19 15 L16 18 Z"
        fill="url(#chapaRight)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Linhas de definição para clareza */}
      <line
        x1="2" y1="8"
        x2="5" y2="5"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
      />
      <line
        x1="16" y1="8"
        x2="19" y2="5"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
      />
      <line
        x1="16" y1="18"
        x2="19" y2="15"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
      />
    </svg>
  );
};
