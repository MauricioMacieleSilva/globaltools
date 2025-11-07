import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileTableCardField {
  label: string;
  value: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

interface MobileTableCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  fields: MobileTableCardField[];
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileTableCard({
  title,
  subtitle,
  badge,
  fields,
  actions,
  onClick,
  className
}: MobileTableCardProps) {
  return (
    <Card 
      className={cn(
        "p-4 space-y-3",
        onClick && "cursor-pointer hover:bg-accent/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      {(title || badge) && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {title && (
              <div className="font-semibold text-base truncate">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-sm text-muted-foreground truncate">
                {subtitle}
              </div>
            )}
          </div>
          {badge && (
            <div className="flex-shrink-0">
              {badge}
            </div>
          )}
        </div>
      )}

      {/* Fields */}
      <CardContent className="p-0 space-y-2">
        {fields.map((field, index) => (
          <div 
            key={index}
            className={cn(
              "flex justify-between items-center gap-2",
              field.fullWidth && "flex-col items-start",
              field.className
            )}
          >
            <span className="text-sm text-muted-foreground flex-shrink-0">
              {field.label}
            </span>
            <span className={cn(
              "text-sm font-medium text-right",
              field.fullWidth && "w-full text-left"
            )}>
              {field.value}
            </span>
          </div>
        ))}
      </CardContent>

      {/* Actions */}
      {actions && (
        <div className="flex gap-2 pt-2 border-t flex-wrap">
          {actions}
        </div>
      )}
    </Card>
  );
}
