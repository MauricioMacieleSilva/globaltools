import React from 'react';
import { Card } from '@/components/ui/card';
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
  // Separar campos normais de fullWidth
  const normalFields = fields.filter(f => !f.fullWidth);
  const fullWidthFields = fields.filter(f => f.fullWidth);

  return (
    <Card 
      className={cn(
        "p-3",
        onClick && "cursor-pointer hover:bg-accent/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {/* Header com título e badge */}
      {(title || badge) && (
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {title && (
              <p className="font-semibold text-sm leading-tight break-words">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {badge && (
            <div className="flex-shrink-0">
              {badge}
            </div>
          )}
        </div>
      )}

      {/* Campos em grid 2 colunas */}
      {normalFields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {normalFields.map((field, index) => (
            <div key={index} className={cn("flex flex-col", field.className)}>
              <span className="text-[11px] text-muted-foreground leading-tight">
                {field.label}
              </span>
              <span className="text-xs font-medium leading-tight">
                {field.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Campos fullWidth */}
      {fullWidthFields.length > 0 && (
        <div className={cn("space-y-2", normalFields.length > 0 && "mt-2")}>
          {fullWidthFields.map((field, index) => (
            <div key={index} className={cn("flex flex-col", field.className)}>
              <span className="text-[11px] text-muted-foreground leading-tight">
                {field.label}
              </span>
              <span className="text-xs font-medium leading-tight break-words">
                {field.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ações */}
      {actions && (
        <div className="flex gap-2 pt-3 mt-3 border-t">
          {actions}
        </div>
      )}
    </Card>
  );
}
