import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface ComercialVendorFilterProps {
  vendedores: string[];
  selectedVendedor?: string;
  onVendedorChange: (vendedor?: string) => void;
}

export function ComercialVendorFilter({ vendedores, selectedVendedor, onVendedorChange }: ComercialVendorFilterProps) {
  const [searchTerm, setSearchTerm] = useState(selectedVendedor || '');
  const [isOpen, setIsOpen] = useState(false);

  // Sync searchTerm with selectedVendedor when it changes externally
  useEffect(() => {
    setSearchTerm(selectedVendedor || '');
  }, [selectedVendedor]);

  const filteredVendedores = useMemo(() => {
    if (!searchTerm) return vendedores;
    return vendedores.filter(vendedor => 
      vendedor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendedores, searchTerm]);

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setIsOpen(value.length > 0);
    
    // Only clear filter if explicitly cleared
    if (value === '') {
      onVendedorChange(undefined);
    }
  };

  const handleSelectVendedor = (vendedor: string) => {
    setSearchTerm(vendedor);
    onVendedorChange(vendedor);
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    setSearchTerm('');
    onVendedorChange(undefined);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
        <Input
          placeholder="Todos"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className={`pl-7 h-8 w-32 text-xs ${selectedVendedor ? 'pr-7 bg-muted/30' : ''}`}
        />
        {selectedVendedor && (
          <X 
            className="absolute right-2 top-2 h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" 
            onClick={handleClearFilter}
          />
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
          <div
            className="px-2 py-1 text-xs cursor-pointer hover:bg-muted font-medium"
            onClick={() => {
              setSearchTerm('');
              onVendedorChange(undefined);
              setIsOpen(false);
            }}
          >
            Todos
          </div>
          {filteredVendedores.slice(0, 10).map((vendedor) => (
            <div
              key={vendedor}
              className="px-2 py-1 text-xs cursor-pointer hover:bg-muted"
              onClick={() => handleSelectVendedor(vendedor)}
            >
              {vendedor}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}