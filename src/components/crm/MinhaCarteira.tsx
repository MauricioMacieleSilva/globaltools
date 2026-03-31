import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { CRMLead } from '@/pages/CRM';

interface MinhaCarteiraProps {
  leads: CRMLead[];
  currentUserId: string;
  onLeadClick: (lead: CRMLead) => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-blue-100 text-blue-800' },
  contato_feito: { label: 'Contato', color: 'bg-amber-100 text-amber-800' },
  passagem_bastao: { label: 'Passagem', color: 'bg-pink-100 text-pink-800' },
  visita_reuniao: { label: 'Visita', color: 'bg-purple-100 text-purple-800' },
  analise_financeira: { label: 'Análise', color: 'bg-indigo-100 text-indigo-800' },
  proposta: { label: 'Proposta', color: 'bg-green-100 text-green-800' },
  pedido_fechado: { label: 'Fechado', color: 'bg-teal-100 text-teal-800' },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800' },
};

type StatusFilter = 'todos' | 'andamento' | 'fechados' | 'perdidos';

export function MinhaCarteira({ leads, currentUserId, onLeadClick }: MinhaCarteiraProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const myLeads = useMemo(() => {
    return leads.filter(l => l.vendedor_id === currentUserId);
  }, [leads, currentUserId]);

  const filtered = useMemo(() => {
    let result = myLeads;
    
    // Status filter
    if (statusFilter === 'andamento') {
      result = result.filter(l => l.status !== 'perdido' && l.status !== 'pedido_fechado');
    } else if (statusFilter === 'fechados') {
      result = result.filter(l => l.status === 'pedido_fechado');
    } else if (statusFilter === 'perdidos') {
      result = result.filter(l => l.status === 'perdido');
    }
    
    // Text search
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(l =>
        (l.empresa || l.cliente_nome || '').toLowerCase().includes(term) ||
        (l.cliente_cnpj || '').includes(term) ||
        (l.contact_name || '').toLowerCase().includes(term) ||
        (l.cliente_telefone || '').includes(term)
      );
    }
    
    return result;
  }, [myLeads, search, statusFilter]);

  const counts = useMemo(() => ({
    total: myLeads.length,
    andamento: myLeads.filter(l => l.status !== 'perdido' && l.status !== 'pedido_fechado').length,
    fechados: myLeads.filter(l => l.status === 'pedido_fechado').length,
    perdidos: myLeads.filter(l => l.status === 'perdido').length,
  }), [myLeads]);

  const renderLeadCard = (lead: CRMLead) => {
    const status = statusLabels[lead.status] || { label: lead.status, color: 'bg-muted text-muted-foreground' };
    return (
      <Card
        key={lead.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onLeadClick(lead)}
      >
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm truncate">{lead.empresa || lead.cliente_nome}</h4>
            <Badge className={`text-[10px] ${status.color}`}>{status.label}</Badge>
          </div>
          {lead.contact_name && (
            <p className="text-xs text-muted-foreground">{lead.contact_name}</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {lead.cidade && lead.estado && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> {lead.cidade}/{lead.estado}
              </span>
            )}
            {lead.cliente_telefone && (
              <span className="flex items-center gap-0.5">
                <Phone className="h-3 w-3" /> {lead.cliente_telefone}
              </span>
            )}
            {lead.cliente_email && (
              <span className="flex items-center gap-0.5">
                <Mail className="h-3 w-3" /> {lead.cliente_email}
              </span>
            )}
            {lead.ramo_atuacao && (
              <span className="flex items-center gap-0.5">
                <Building2 className="h-3 w-3" /> {lead.ramo_atuacao}
              </span>
            )}
          </div>
          {lead.valor_estimado && lead.valor_estimado > 0 && (
            <p className="text-xs font-medium text-primary">
              R$ {lead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const kpiCards: { key: StatusFilter; label: string; value: number; colorClass: string }[] = [
    { key: 'todos', label: 'Total na Carteira', value: counts.total, colorClass: '' },
    { key: 'andamento', label: 'Em Andamento', value: counts.andamento, colorClass: 'text-primary' },
    { key: 'fechados', label: 'Fechados', value: counts.fechados, colorClass: 'text-green-600' },
    { key: 'perdidos', label: 'Perdidos', value: counts.perdidos, colorClass: 'text-red-600' },
  ];

  return (
    <div className="space-y-3">
      {/* KPIs - clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpiCards.map(kpi => (
          <Card
            key={kpi.key}
            className={`cursor-pointer transition-all ${statusFilter === kpi.key ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
            onClick={() => setStatusFilter(statusFilter === kpi.key ? 'todos' : kpi.key)}
          >
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${kpi.colorClass}`}>{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar na minha carteira..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-4 pr-2">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map(renderLeadCard)}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              {search ? 'Nenhum lead encontrado na busca' : 'Nenhum lead nesta categoria'}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
