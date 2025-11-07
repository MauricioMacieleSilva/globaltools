import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { parseDate } from '@/lib/utils-comercial';

export function ComercialFilters() {
  const { filters, setFilters, drillDown, setDrillDown, refreshData, clearCache, cacheStatus, isLoading, data } = useComercial();

  const anos = [...new Set(data.map(item => {
    const date = parseDate(item.data_emissao);
    return date ? date.getFullYear().toString() : null;
  }).filter(year => year !== null && year !== ''))].sort();
  const meses = {
    '01': 'Jan',
    '02': 'Fev',
    '03': 'Mar',
    '04': 'Abr',
    '05': 'Mai',
    '06': 'Jun',
    '07': 'Jul',
    '08': 'Ago',
    '09': 'Set',
    '10': 'Out',
    '11': 'Nov',
    '12': 'Dez'
  };
  
  // Filter data based on year and month first for most options, but not for vendedores
  const filteredDataForOptions = data.filter(item => {
    const itemDate = parseDate(item.data_emissao);
    if (!itemDate) return true; // Include items with unparseable dates
    
    const itemYear = itemDate.getFullYear().toString();
    const itemMonth = String(itemDate.getMonth() + 1).padStart(2, '0');
    
    const yearMatch = !filters.ano || itemYear === filters.ano;
    const monthMatch = !filters.mes || itemMonth === filters.mes;
    
    return yearMatch && monthMatch;
  });
  
  const situacoes = [...new Set(filteredDataForOptions.map(item => item.situacao))].filter(s => s && s.trim() !== '');
  const ufs = [...new Set(filteredDataForOptions.map(item => item.uf))].filter(u => u && u.trim() !== '').sort();
  const classes = [...new Set(filteredDataForOptions.map(item => item.classe))].filter(c => c && c.trim() !== '').sort();
  const clienteNovos = [...new Set(filteredDataForOptions.map(item => item.cliente_novo))].filter(cn => cn && cn.trim() !== '');
  
  // Para vendedores, usar todos os dados disponíveis (não filtrar por período)
  const vendedores = [...new Set(data.map(item => item.vendedor))].filter(v => v && v.trim() !== '').sort();
  
  // Debug dos vendedores encontrados
  console.log('Vendedores encontrados nos dados filtrados:', vendedores);
  console.log('Total de registros filtrados para opções:', filteredDataForOptions.length);

  const clearFilters = () => {
    // Obter ano e mês atual
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    setFilters({
      ano: currentYear,
      mes: currentMonth,
      situacao: undefined,
      uf: undefined,
      classe: undefined,
      cliente_novo: undefined,
      vendedor: undefined
    });
    
    // Reset drill-down to daily view of current month/year
    setDrillDown({
      isMonthView: false,
      selectedMonth: currentMonth,
      selectedYear: currentYear
    });
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof typeof filters]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
      {/* Ano */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Ano</label>
        <Select value={filters.ano || 'todos'} onValueChange={(value) => setFilters({ ano: value === 'todos' ? undefined : value })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="todos">Todos</SelectItem>
            {anos.map(ano => (
              <SelectItem key={ano} value={ano}>{ano}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mês */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Mês</label>
        <Select value={filters.mes || 'todos'} onValueChange={(value) => setFilters({ mes: value === 'todos' ? undefined : value })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="todos">Todos</SelectItem>
            {Object.entries(meses).map(([num, nome]) => (
              <SelectItem key={num} value={num}>{nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Situação */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Situação</label>
        <Select value={filters.situacao || 'todos'} onValueChange={(value) => setFilters({ situacao: value === 'todos' ? undefined : value })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="todos">Todos</SelectItem>
            {situacoes.map(situacao => (
              <SelectItem key={situacao} value={situacao}>{situacao}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* UF */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
        <Select value={filters.uf || 'todos'} onValueChange={(value) => setFilters({ uf: value === 'todos' ? undefined : value })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="todos">Todos</SelectItem>
            {ufs.map(uf => (
              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Classe */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Classe</label>
        <Select value={filters.classe || 'todos'} onValueChange={(value) => setFilters({ classe: value === 'todos' ? undefined : value })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="todos">Todos</SelectItem>
            {classes.map(classe => (
              <SelectItem key={classe} value={classe}>{classe}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cliente Novo */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Cliente Novo</label>
        <Select value={filters.cliente_novo || 'todos'} onValueChange={(value) => setFilters({ cliente_novo: value === 'todos' ? undefined : value })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="todos">Todos</SelectItem>
            {clienteNovos.map(tipo => (
              <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vendedor */}
      <div className="col-span-2 lg:col-span-1">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Vendedor</label>
        <Select value={filters.vendedor || 'todos'} onValueChange={(value) => setFilters({ vendedor: value === 'todos' ? undefined : value })}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-md z-50">
            <SelectItem value="todos">Todos</SelectItem>
            {vendedores.map(vendedor => (
              <SelectItem key={vendedor} value={vendedor}>{vendedor}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Botões */}
      <div className="flex gap-1 items-end">
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-xs"
          >
            Limpar
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          className="h-8 px-2 text-xs"
          disabled={isLoading}
        >
          {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}