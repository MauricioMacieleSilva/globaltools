import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface IndicadorPerfilPadraoProps {
  isPadrao: boolean;
  temDados: boolean;
}

export function IndicadorPerfilPadrao({ isPadrao, temDados }: IndicadorPerfilPadraoProps) {
  if (!temDados) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="flex justify-center">
            {isPadrao ? (
              <Badge 
                variant="outline" 
                className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] px-1.5 py-0.5 gap-1 cursor-help"
              >
                <CheckCircle2 className="h-3 w-3" />
                Padrão
              </Badge>
            ) : (
              <Badge 
                variant="outline" 
                className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] px-1.5 py-0.5 gap-1 cursor-help"
              >
                <AlertCircle className="h-3 w-3" />
                Especial
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">
            {isPadrao 
              ? 'Este perfil corresponde às medidas padrão comerciais'
              : 'Este perfil tem medidas especiais (não comerciais)'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
