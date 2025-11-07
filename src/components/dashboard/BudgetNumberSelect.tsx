import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, ShoppingCart } from 'lucide-react';
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

interface BudgetNumberSelectProps {
  value?: string;
  onChange: (value: string) => void;
}

export const BudgetNumberSelect: React.FC<BudgetNumberSelectProps> = ({
  value,
  onChange,
}) => {
  const { data, activeSession, setActiveSession, isLoading, refreshData } = useComercial();
  const [open, setOpen] = useState(false);

  // Load data when component mounts
  useEffect(() => {
    console.log('BudgetNumberSelect mounted, triggering data refresh');
    refreshData();
  }, [refreshData]);

  // Get budget options from commercial data - filter all budgets regardless of session
  const budgetOptions = React.useMemo(() => {
    // Garantir que sempre retornamos um array, mesmo se data for undefined
    if (!data || !Array.isArray(data) || data.length === 0 || isLoading) {
      return [];
    }

    try {
      const budgetMap = new Map();
      
      // Filter all budget items regardless of current session filters
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

      const result = Array.from(budgetMap.values())
        .sort((a, b) => {
          if (!a.number || !b.number) return 0;
          return b.number.localeCompare(a.number);
        });

      return result;
    } catch (error) {
      console.error('Error processing budget options:', error);
      return [];
    }
  }, [data, isLoading]);

  const selectedBudget = budgetOptions.find(budget => budget.number === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        Número do Orçamento
      </label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
                  {value}
                </Badge>
                {selectedBudget && (
                  <span className="text-muted-foreground text-sm truncate">
                    {selectedBudget.client}
                  </span>
                )}
              </div>
            ) : (
              "Selecione um orçamento..."
            )}
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
                  budgetOptions.map((budget) => (
                    <CommandItem
                      key={budget.number}
                      value={`${budget.number} ${budget.client || ''}`}
                      onSelect={() => {
                        onChange(budget.number);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === budget.number ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
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
                  ))
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
            ? `${budgetOptions.length} orçamentos disponíveis`
            : 'Nenhum orçamento encontrado'
        }
      </p>
    </div>
  );
};