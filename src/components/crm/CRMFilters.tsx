
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
    <div className="flex gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs w-[140px] sm:w-[180px]"
        />
      </div>
      <Select value={vendorFilter} onValueChange={onVendorChange}>
        <SelectTrigger className="w-[120px] sm:w-[160px] h-8 text-xs">
          <SelectValue placeholder="Todos" />
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
