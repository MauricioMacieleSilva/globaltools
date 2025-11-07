import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, ShoppingCart, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useComercial } from '@/context/ComercialContext';
import { Badge } from '@/components/ui/badge';

interface MultipleBudgetNumberSelectProps {
  value?: string; // Formato: "123,456" ou JSON array
  onChange: (value: string) => void;
  maxSelections?: number;
}

export const MultipleBudgetNumberSelect: React.FC<MultipleBudgetNumberSelectProps> = ({
  value,
  onChange,
  maxSelections = 2,
}) => {
  const { data, isLoading, refreshData } = useComercial();
  const [open, setOpen] = useState(false);

  // Parse current values
  const selectedNumbers = React.useMemo(() => {
    if (!value) return [];
    try {
      // Try JSON first, then fall back to comma-separated
      if (value.startsWith('[')) {
        return JSON.parse(value);
      }
      return value.split(',').filter(Boolean);
    } catch {
      return value.split(',').filter(Boolean);
    }
  }, [value]);

  // Load data when component mounts
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Get budget options from commercial data
  const budgetOptions = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0 || isLoading) {
      return [];
    }

    try {
      const budgetMap = new Map();
      
      const orcamentoItems = data.filter(item => {
        if (!item || typeof item !== 'object') return false;
        
        const isOrcamento = item.situacao === "Orçamento";
        const hasNumber = !!item.numeropedido;
        
        return isOrcamento && hasNumber;
      });

      orcamentoItems.forEach(item => {
        const key = item.numeropedido;
        if (key && !budgetMap.has(key)) {
          budgetMap.set(key, {
            number: item.numeropedido,
            client: item.cli_nomefantasia || item.cliente || 'Cliente não informado',
            date: item.data_emissao,
            value: item.valor || 0
          });
        }
      });

      return Array.from(budgetMap.values())
        .sort((a, b) => {
          if (!a.number || !b.number) return 0;
          return b.number.localeCompare(a.number);
        });
    } catch (error) {
      console.error('Error processing budget options:', error);
      return [];
    }
  }, [data, isLoading]);

  const handleSelect = (budgetNumber: string) => {
    const currentSelected = [...selectedNumbers];
    const index = currentSelected.indexOf(budgetNumber);
    
    if (index > -1) {
      // Remove if already selected
      currentSelected.splice(index, 1);
    } else if (currentSelected.length < maxSelections) {
      // Add if not at max limit
      currentSelected.push(budgetNumber);
    }
    
    // Update with comma-separated format for database compatibility
    onChange(currentSelected.join(','));
  };

  const removeSelection = (budgetNumber: string) => {
    const currentSelected = selectedNumbers.filter(num => num !== budgetNumber);
    onChange(currentSelected.join(','));
  };

  const getSelectedBudgets = () => {
    return selectedNumbers.map(num => 
      budgetOptions.find(budget => budget.number === num)
    ).filter(Boolean);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        Números de Orçamento ({selectedNumbers.length}/{maxSelections})
      </label>
      
      {/* Selected budgets display */}
      {selectedNumbers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
          {getSelectedBudgets().map((budget, index) => (
            <div key={selectedNumbers[index]} className="flex items-center gap-1">
              <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
                {selectedNumbers[index]}
              </Badge>
              {budget && (
                <span className="text-xs text-muted-foreground truncate max-w-24">
                  {budget.client.split(' ')[0]}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeSelection(selectedNumbers[index])}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={selectedNumbers.length >= maxSelections}
          >
            {selectedNumbers.length > 0 
              ? `${selectedNumbers.length} orçamento${selectedNumbers.length > 1 ? 's' : ''} selecionado${selectedNumbers.length > 1 ? 's' : ''}`
              : "Selecione orçamentos..."
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 z-[70] bg-background border shadow-md">
          <Command>
            <CommandInput placeholder="Buscar orçamento..." />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Carregando orçamentos...' : 'Nenhum orçamento encontrado.'}
              </CommandEmpty>
              <CommandGroup className="max-h-64 overflow-y-auto">
                {budgetOptions && budgetOptions.length > 0 ? (
                  budgetOptions.map((budget) => {
                    const isSelected = selectedNumbers.includes(budget.number);
                    const canSelect = selectedNumbers.length < maxSelections || isSelected;
                    
                    return (
                      <CommandItem
                        key={budget.number}
                        value={`${budget.number} ${budget.client || ''}`}
                        onSelect={() => handleSelect(budget.number)}
                        disabled={!canSelect}
                        className={cn(
                          "flex items-center justify-between gap-2 py-2",
                          !canSelect && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "bg-cyan-50 text-cyan-700",
                                  isSelected && "bg-cyan-100 border-cyan-400"
                                )}
                              >
                                {budget.number}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {budget.client}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {budget.date && new Date(budget.date).toLocaleDateString('pt-BR')}
                        </div>
                      </CommandItem>
                    );
                  })
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <p className="text-xs text-muted-foreground">
        {isLoading 
          ? 'Carregando orçamentos...'
          : budgetOptions.length > 0 
            ? `${budgetOptions.length} orçamentos disponíveis. Máximo ${maxSelections} seleções.`
            : 'Nenhum orçamento encontrado'
        }
      </p>
    </div>
  );
};