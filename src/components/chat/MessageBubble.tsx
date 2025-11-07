
import React from 'react';
import { Message } from './ChatInterface';
import { AssistantAvatar } from './AssistantAvatar';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  return (
    <div className={cn(
      "flex gap-3 max-w-[85%]",
      isUser ? "ml-auto flex-row-reverse" : "mr-auto"
    )}>
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        ) : (
          <AssistantAvatar size="sm" />
        )}
      </div>
      
      <div className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-2 max-w-full break-words",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-card border shadow-sm",
          isError && "bg-destructive text-destructive-foreground"
        )}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        
        <span className="text-xs text-muted-foreground">
          {message.timestamp.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
};
