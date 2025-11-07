
import React from 'react';
import { ZeGlobalIcon } from '../icons/ZeGlobalIcon';
import { cn } from '@/lib/utils';

interface AssistantAvatarProps {
  size?: 'sm' | 'md' | 'lg';
}

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={cn(
      "bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center shadow-md",
      sizeClasses[size]
    )}>
      <ZeGlobalIcon className={cn("text-primary-foreground", iconSizes[size])} />
    </div>
  );
};
