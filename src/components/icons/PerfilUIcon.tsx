
import React from 'react';

interface PerfilUIconProps {
  className?: string;
  size?: number;
}

export const PerfilUIcon: React.FC<PerfilUIconProps> = ({ 
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
      aria-label="Perfil U"
    >
      <defs>
        <linearGradient id="perfilFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="perfilAba" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="perfilTop" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      
      {/* Aba esquerda do perfil U */}
      <path
        d="M3 6 L6 6 L6 18 L3 18 Z"
        fill="url(#perfilFace)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Alma central do perfil U */}
      <path
        d="M6 6 L18 6 L18 9 L6 9 Z"
        fill="url(#perfilFace)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Aba direita do perfil U */}
      <path
        d="M18 6 L21 6 L21 18 L18 18 Z"
        fill="url(#perfilFace)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Face superior da aba esquerda - perspectiva */}
      <path
        d="M3 6 L5 4 L8 4 L6 6 Z"
        fill="url(#perfilTop)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Face superior da alma central - perspectiva */}
      <path
        d="M6 6 L8 4 L20 4 L18 6 Z"
        fill="url(#perfilTop)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Face superior da aba direita - perspectiva */}
      <path
        d="M18 6 L20 4 L23 4 L21 6 Z"
        fill="url(#perfilTop)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Face lateral da aba esquerda - espessura */}
      <path
        d="M6 6 L8 4 L8 16 L6 18 Z"
        fill="url(#perfilAba)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Face lateral da aba direita - espessura */}
      <path
        d="M21 6 L23 4 L23 16 L21 18 Z"
        fill="url(#perfilAba)"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Linhas de definição das dobras (características do perfil U) */}
      <line
        x1="6" y1="6"
        x2="6" y2="18"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.2"
      />
      <line
        x1="18" y1="6"
        x2="18" y2="18"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.2"
      />
    </svg>
  );
};
