
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CRMFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  vendorFilter: string;
  onVendorChange: (value: string) => void;
}

export function CRMFilters({ searchQuery, onSearchChange, vendorFilter, onVendorChange }: CRMFiltersProps) {
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const loadVendors = async () => {
      const { data } = await supabase.from('user_profiles').select('id, full_name');
      if (data) setVendors(data.map(v => ({ id: v.id, name: v.full_name })));
    };
    loadVendors();
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={vendorFilter} onValueChange={onVendorChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Todos os vendedores" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {vendors.map(v => (
            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
