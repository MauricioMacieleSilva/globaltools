
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
  origemFilter?: string;
  onOrigemChange?: (value: string) => void;
  hideSearch?: boolean;
}

export function CRMFilters({ searchQuery, onSearchChange, vendorFilter, onVendorChange, origemFilter, onOrigemChange, hideSearch = false }: CRMFiltersProps) {
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);

  useEffect(() => {
    const loadVendors = async () => {
      const { data } = await supabase.from('user_profiles').select('id, full_name');
      if (data) setVendors(data.map(v => ({ id: v.id, name: v.full_name })));
    };
    const loadOrigens = async () => {
      const { data } = await (supabase as any).from('crm_lead_sources').select('name').eq('is_active', true).order('name');
      if (data) setOrigens(data.map((o: any) => o.name));
    };
    loadVendors();
    loadOrigens();
  }, []);

  return (
    <div className="flex gap-2 flex-wrap">
      {!hideSearch && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs w-[140px] sm:w-[180px]"
          />
        </div>
      )}
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
      {onOrigemChange && (
        <Select value={origemFilter || 'all'} onValueChange={onOrigemChange}>
          <SelectTrigger className="w-[130px] sm:w-[170px] h-8 text-xs">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Origens</SelectItem>
            {origens.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
