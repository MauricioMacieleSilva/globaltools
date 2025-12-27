import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { parseDate } from '@/lib/utils-comercial';

export function SessionFilters() {
  const { data, filters, setFilters, activeSession } = useComercial();

  // Clear filters function - limpar TODOS os filtros exceto ano/mês atual
  const clearFilters = () => {
    setFilters({
      ano: new Date().getFullYear().toString(),
      mes: (new Date().getMonth() + 1).toString().padStart(2, '0'),
      uf: undefined,
      classe: undefined,
      vendedor: undefined,
      situacao: undefined,
      cliente_novo: undefined
    });
  };

  // Check if there are active filters (beyond current month/year)
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const hasActiveFilters = 
    filters.ano !== currentYear || 
    filters.mes !== currentMonth ||
    filters.uf || 
    filters.classe || 
    filters.vendedor;

  // Get date field based on session
  const getDateField = (item: any) => {
    switch (activeSession) {
      case 'perdidos':
        return parseDate(item.data_perdido);
      default:
        return parseDate(item.data_inicio);
    }
  };

  // Generate filter options based on data and selected year/month
  const filteredDataForOptions = data.filter(item => {
    const date = getDateField(item);
    if (!date) return false;
    
    const yearMatch = !filters.ano || date.getFullYear().toString() === filters.ano;
    const monthMatch = !filters.mes || (date.getMonth() + 1).toString().padStart(2, '0') === filters.mes;
    
    return yearMatch && monthMatch;
  });

  const anos = [...new Set(data.map(item => {
    const date = getDateField(item);
    return date ? date.getFullYear().toString() : null;
  }).filter(year => year !== null && year !== ''))].sort();

  const meses = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
  };

  const ufs = [...new Set(filteredDataForOptions.map(item => item.uf))].filter(u => u && u.trim() !== '').sort();
  const classes = [...new Set(filteredDataForOptions.map(item => item.classe))].filter(c => c && c.trim() !== '').sort();
  const vendedores = [...new Set(filteredDataForOptions.map(item => item.vendedor))].filter(v => v && v.trim() !== '').sort();

  return (
    <div className="bg-card/50 p-2 sm:p-4 rounded-lg border space-y-2 sm:space-y-3 mt-2">
      {/* Header com botão limpar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-7 sm:h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      {/* Grid de filtros responsivo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <div>
          <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 block">Ano</label>
          <Select value={filters.ano || ''} onValueChange={(value) => setFilters({ ...filters, ano: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {anos.map(ano => (
                <SelectItem key={ano} value={ano}>{ano}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 block">Mês</label>
          <Select value={filters.mes || ''} onValueChange={(value) => setFilters({ ...filters, mes: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(meses).map(([num, nome]) => (
                <SelectItem key={num} value={num}>{nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 block">UF</label>
          <Select value={filters.uf || ''} onValueChange={(value) => setFilters({ ...filters, uf: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {ufs.map(uf => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 block">Classe</label>
          <Select value={filters.classe || ''} onValueChange={(value) => setFilters({ ...filters, classe: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
              <SelectValue placeholder="Classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {classes.map(classe => (
                <SelectItem key={classe} value={classe}>{classe}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1 block">Vendedor</label>
          <Select value={filters.vendedor || ''} onValueChange={(value) => setFilters({ ...filters, vendedor: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {vendedores.map(vendedor => (
                <SelectItem key={vendedor} value={vendedor}>{vendedor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}