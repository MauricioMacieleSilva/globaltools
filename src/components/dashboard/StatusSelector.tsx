import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusSelectorProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => Promise<void>;
  disabled?: boolean;
}

const statusOptions = [
  { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
  { value: 'contatado', label: 'Contatado', color: 'bg-yellow-500' },
  { value: 'contato_sem_sucesso', label: 'Contato sem sucesso', color: 'bg-orange-500' },
  { value: 'respondeu', label: 'Respondeu', color: 'bg-green-500' },
  { value: 'qualificado', label: 'Qualificado', color: 'bg-purple-500' },
  { value: 'encaminhado', label: 'Encaminhado', color: 'bg-emerald-500' },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-500' }
];

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatusOption = statusOptions.find(option => option.value === currentStatus);

  const handleStatusSelect = async (newStatus: string) => {
    if (newStatus === currentStatus || disabled || isUpdating) {
      setOpen(false);
      return;
    }

    try {
      setIsUpdating(true);
      await onStatusChange(newStatus);
      setOpen(false);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (disabled || !currentStatusOption) {
    return (
      <Badge variant="secondary" className={`text-white ${currentStatusOption?.color || 'bg-gray-500'}`}>
        {currentStatusOption?.label || currentStatus}
      </Badge>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="p-0 h-auto justify-start hover:bg-transparent"
          disabled={isUpdating}
        >
          <Badge 
            variant="secondary" 
            className={`text-white ${currentStatusOption.color} cursor-pointer hover:opacity-80 transition-opacity`}
          >
            {currentStatusOption.label}
            <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Buscar status..." />
          <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {statusOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleStatusSelect(option.value)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentStatus === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Badge 
                    variant="secondary" 
                    className={`text-white ${option.color}`}
                  >
                    {option.label}
                  </Badge>
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};