import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Package, PackageCheck, PackageX, PackageMinus, Loader2 } from 'lucide-react';
import { searchCompatibleMaterials, SearchResult, EstoqueItem } from '@/services/estoqueService';
import { cn } from '@/lib/utils';

interface IndicadorEstoqueDisponibilidadeProps {
  tipoPerfil: string;
  espessura: number;
  base?: number;
  aba1?: number;
  aba2?: number;
  className?: string;
}

type StatusDisponibilidade = 'disponivel' | 'alternativa' | 'material' | 'indisponivel' | 'loading' | 'idle';

export function IndicadorEstoqueDisponibilidade({
  tipoPerfil,
  espessura,
  base,
  aba1,
  aba2,
  className
}: IndicadorEstoqueDisponibilidadeProps) {
  const [status, setStatus] = useState<StatusDisponibilidade>('idle');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Don't search if no valid espessura
    if (!espessura || espessura <= 0) {
      setStatus('idle');
      setSearchResult(null);
      return;
    }

    const searchStock = async () => {
      setStatus('loading');
      try {
        const result = await searchCompatibleMaterials(tipoPerfil, espessura, base, aba1, aba2);
        setSearchResult(result);

        // Determine status based on results
        if (result.exactMatch.length > 0) {
          setStatus('disponivel');
        } else if (result.compatibleMaterials.length > 0) {
          setStatus('material');
        } else if (result.approximateMatches.length > 0) {
          setStatus('alternativa');
        } else {
          setStatus('indisponivel');
        }
      } catch (error) {
        console.error('Error searching stock:', error);
        setStatus('indisponivel');
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(searchStock, 500);
    return () => clearTimeout(timeoutId);
  }, [tipoPerfil, espessura, base, aba1, aba2]);

  if (status === 'idle') {
    return (
      <div className={cn("flex justify-center", className)}>
        <span className="text-muted-foreground text-[10px]">-</span>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className={cn("flex justify-center", className)}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'disponivel':
        return {
          icon: PackageCheck,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          label: '🟢',
          title: 'Perfil Disponível',
          description: 'Perfil idêntico encontrado no estoque'
        };
      case 'material':
        return {
          icon: Package,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          label: '🔵',
          title: 'Material Disponível',
          description: 'Matéria-prima compatível no estoque'
        };
      case 'alternativa':
        return {
          icon: PackageMinus,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          label: '🟡',
          title: 'Alternativa Disponível',
          description: 'Perfis similares encontrados no estoque'
        };
      case 'indisponivel':
      default:
        return {
          icon: PackageX,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          label: '🔴',
          title: 'Indisponível',
          description: 'Nenhum material compatível no estoque'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatItemDetails = (item: EstoqueItem) => {
    const parts: string[] = [];
    if (item.espessura) parts.push(`Esp: ${item.espessura}mm`);
    if (item.base) parts.push(`Base: ${item.base}mm`);
    if (item.aba1) parts.push(`Aba: ${item.aba1}mm`);
    if (item.largura) parts.push(`Larg: ${item.largura}mm`);
    return parts.join(' | ');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded hover:scale-110 transition-transform cursor-pointer",
            config.bgColor,
            className
          )}
          title={config.title}
        >
          <Icon className={cn("h-3.5 w-3.5", config.color)} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="center" side="left">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", config.color)} />
            <span className="font-medium text-sm">{config.title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{config.description}</p>

          {searchResult && (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {/* Exact Matches */}
              {searchResult.exactMatch.length > 0 && (
                <div className="space-y-1.5">
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200 text-[10px]">
                    Perfis Idênticos ({searchResult.exactMatch.length})
                  </Badge>
                  <div className="space-y-1">
                    {searchResult.exactMatch.slice(0, 3).map(item => (
                      <div key={item.id} className="text-[10px] p-1.5 bg-muted rounded">
                        <div className="font-medium">{item.descricao}</div>
                        <div className="text-muted-foreground">{formatItemDetails(item)}</div>
                        <div className="text-green-600 font-medium">Qtd: {item.quantidade} {item.unidade}</div>
                      </div>
                    ))}
                    {searchResult.exactMatch.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{searchResult.exactMatch.length - 3} mais...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Compatible Materials */}
              {searchResult.compatibleMaterials.length > 0 && (
                <div className="space-y-1.5">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200 text-[10px]">
                    Matéria-Prima ({searchResult.compatibleMaterials.length})
                  </Badge>
                  <div className="space-y-1">
                    {searchResult.compatibleMaterials.slice(0, 3).map(item => (
                      <div key={item.id} className="text-[10px] p-1.5 bg-muted rounded">
                        <div className="font-medium">{item.descricao}</div>
                        <div className="text-muted-foreground">
                          {item.categoria} | {formatItemDetails(item)}
                        </div>
                        <div className="text-blue-600 font-medium">Qtd: {item.quantidade} {item.unidade}</div>
                      </div>
                    ))}
                    {searchResult.compatibleMaterials.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{searchResult.compatibleMaterials.length - 3} mais...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Approximate Matches */}
              {searchResult.approximateMatches.length > 0 && (
                <div className="space-y-1.5">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-200 text-[10px]">
                    Perfis Similares ({searchResult.approximateMatches.length})
                  </Badge>
                  <div className="space-y-1">
                    {searchResult.approximateMatches.slice(0, 3).map(item => (
                      <div key={item.id} className="text-[10px] p-1.5 bg-muted rounded">
                        <div className="font-medium">{item.descricao}</div>
                        <div className="text-muted-foreground">{formatItemDetails(item)}</div>
                        <div className="text-yellow-600 font-medium">Qtd: {item.quantidade} {item.unidade}</div>
                      </div>
                    ))}
                    {searchResult.approximateMatches.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{searchResult.approximateMatches.length - 3} mais...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No results */}
              {status === 'indisponivel' && (
                <div className="text-[10px] text-muted-foreground text-center py-2">
                  Nenhum material compatível encontrado no estoque.
                  <br />
                  Será necessário adquirir matéria-prima.
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
