import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { parseDate } from '@/lib/utils-comercial';

export function SessionFilters() {
  const { data, filters, setFilters, activeSession } = useComercial();

  // Clear filters function
  const clearFilters = () => {
    setFilters({
      ano: new Date().getFullYear().toString(),
      mes: (new Date().getMonth() + 1).toString().padStart(2, '0')
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
  const vendedores = [...new Set(data.map(item => item.vendedor))].filter(v => v && v.trim() !== '').sort();

  return (
    <div className="bg-card/50 p-4 rounded-lg border space-y-4">
      <div className="flex items-center justify-end">
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-8"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div>
          <label className="text-xs sm:text-xs font-medium text-muted-foreground mb-1 block">Ano</label>
          <Select value={filters.ano || ''} onValueChange={(value) => setFilters({ ...filters, ano: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-8">
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
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Mês</label>
          <Select value={filters.mes || ''} onValueChange={(value) => setFilters({ ...filters, mes: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-8">
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
          <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
          <Select value={filters.uf || ''} onValueChange={(value) => setFilters({ ...filters, uf: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-8">
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
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Classe</label>
          <Select value={filters.classe || ''} onValueChange={(value) => setFilters({ ...filters, classe: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-8">
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

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Vendedor</label>
          <Select value={filters.vendedor || ''} onValueChange={(value) => setFilters({ ...filters, vendedor: value === 'todos' ? undefined : value })}>
            <SelectTrigger className="h-8">
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