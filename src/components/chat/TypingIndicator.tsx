
import React from 'react';
import { AssistantAvatar } from './AssistantAvatar';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex gap-3 max-w-[85%] mr-auto">
      <AssistantAvatar size="sm" />
      <div className="bg-card border shadow-sm rounded-lg px-4 py-2">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-muted-foreground ml-2">Zé está digitando...</span>
        </div>
      </div>
    </div>
  );
};
