import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ArrowRightLeft, Users, Target, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface LeadRow {
  id: string;
  cliente_nome: string;
  empresa: string | null;
  status: string;
  vendedor_id: string | null;
  created_at: string;
  vendedor_name?: string;
}

interface ClienteRow {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  vendedor_id: string | null;
  vendedor_name?: string;
}

export function LeadClientAssignment() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());
  const [targetUser, setTargetUser] = useState<string>('');
  const [searchLead, setSearchLead] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [filterOwner, setFilterOwner] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all leads in batches to avoid 1000-row limit
      const fetchAllLeads = async () => {
        const PAGE_SIZE = 1000;
        let allLeads: any[] = [];
        let from = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await (supabase as any)
            .from('leads')
            .select('id, cliente_nome, empresa, status, vendedor_id, created_at')
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          allLeads = allLeads.concat(data || []);
          hasMore = (data?.length || 0) === PAGE_SIZE;
          from += PAGE_SIZE;
        }
        return allLeads;
      };

      const [usersRes, allLeads, clientesRes] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name, avatar_url'),
        fetchAllLeads(),
        supabase.from('clientes').select('id, nome, cidade, estado, vendedor_id').order('nome'),
      ]);

      const userMap = new Map<string, UserOption>();
      (usersRes.data || []).forEach((u: any) => userMap.set(u.id, u));
      setUsers(usersRes.data || []);

          // Deduplicate leads by empresa/cliente_nome - keep only the most recent
          const leadsRaw = (allLeads || []).map((l: any) => ({
            ...l,
            vendedor_name: l.vendedor_id ? userMap.get(l.vendedor_id)?.full_name || 'Desconhecido' : null,
          }));
          const deduped = new Map<string, any>();
          leadsRaw.forEach((l: any) => {
            const key = (l.empresa || l.cliente_nome || '').toLowerCase().trim();
            if (!key) return;
            const existing = deduped.get(key);
            if (!existing || new Date(l.created_at) > new Date(existing.created_at)) {
              deduped.set(key, l);
            }
          });
          setLeads(Array.from(deduped.values()));

      setClientes((clientesRes.data || []).map((c: any) => ({
        ...c,
        vendedor_name: c.vendedor_id ? userMap.get(c.vendedor_id)?.full_name || 'Desconhecido' : null,
      })));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = !searchLead || 
        l.cliente_nome?.toLowerCase().includes(searchLead.toLowerCase()) ||
        l.empresa?.toLowerCase().includes(searchLead.toLowerCase());
      const matchOwner = filterOwner === 'all' || 
        (filterOwner === 'unassigned' && !l.vendedor_id) ||
        l.vendedor_id === filterOwner;
      return matchSearch && matchOwner;
    });
  }, [leads, searchLead, filterOwner]);

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const matchSearch = !searchCliente || 
        c.nome?.toLowerCase().includes(searchCliente.toLowerCase());
      const matchOwner = filterOwner === 'all' || 
        (filterOwner === 'unassigned' && !c.vendedor_id) ||
        c.vendedor_id === filterOwner;
      return matchSearch && matchOwner;
    });
  }, [clientes, searchCliente, filterOwner]);

  const handleAssignLeads = async () => {
    if (!targetUser || selectedLeads.size === 0) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedLeads);
      const { error } = await (supabase as any)
        .from('leads')
        .update({ vendedor_id: targetUser, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} lead(s) atribuído(s) com sucesso`);
      setSelectedLeads(new Set());
      setTargetUser('');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao atribuir leads', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignClientes = async () => {
    if (!targetUser || selectedClientes.size === 0) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedClientes);
      const { error } = await supabase
        .from('clientes')
        .update({ vendedor_id: targetUser, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} cliente(s) atribuído(s) com sucesso`);
      setSelectedClientes(new Set());
      setTargetUser('');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao atribuir clientes', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleLead = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleCliente = (id: string) => {
    setSelectedClientes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllLeads = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const toggleAllClientes = () => {
    if (selectedClientes.size === filteredClientes.length) {
      setSelectedClientes(new Set());
    } else {
      setSelectedClientes(new Set(filteredClientes.map(c => c.id)));
    }
  };

  const UserBadge = ({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) => {
    if (!name) return <Badge variant="outline" className="text-xs">Sem responsável</Badge>;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
      <div className="flex items-center gap-1.5">
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground truncate max-w-[100px]">{name}</span>
      </div>
    );
  };


  if (loading) return (
    <Card>
      <CardContent className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Carregando dados...</p>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Atribuição de Leads e Clientes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecione registros e atribua a um vendedor responsável
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unassigned">Sem responsável</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={targetUser} onValueChange={setTargetUser}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Atribuir para..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="leads">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leads" className="gap-1">
              <Target className="h-4 w-4" />
              Leads ({leads.length})
            </TabsTrigger>
            <TabsTrigger value="clientes" className="gap-1">
              <Users className="h-4 w-4" />
              Clientes ({clientes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar leads..."
                  value={searchLead}
                  onChange={e => setSearchLead(e.target.value)}
                  className="pl-8"
                />
              </div>
              {selectedLeads.size > 0 && (
                <Button size="sm" onClick={handleAssignLeads} disabled={!targetUser || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRightLeft className="h-4 w-4 mr-1" />}
                  Atribuir {selectedLeads.size}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <div className="p-2">
                <div className="flex items-center gap-2 p-2 border-b mb-1 sticky top-0 bg-background z-10">
                  <Checkbox
                    checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length}
                    onCheckedChange={toggleAllLeads}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    Selecionar todos ({filteredLeads.length})
                  </span>
                </div>
                {filteredLeads.map(lead => (
                  <div key={lead.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                    onClick={() => toggleLead(lead.id)}>
                    <Checkbox checked={selectedLeads.has(lead.id)} onCheckedChange={() => toggleLead(lead.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.empresa || lead.cliente_nome}</p>
                      <div className="flex items-center gap-2">
                        <UserBadge name={lead.vendedor_name} />
                      </div>
                    </div>
                  </div>
                ))}
                {filteredLeads.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="clientes" className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchCliente}
                  onChange={e => setSearchCliente(e.target.value)}
                  className="pl-8"
                />
              </div>
              {selectedClientes.size > 0 && (
                <Button size="sm" onClick={handleAssignClientes} disabled={!targetUser || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRightLeft className="h-4 w-4 mr-1" />}
                  Atribuir {selectedClientes.size}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <div className="p-2">
                <div className="flex items-center gap-2 p-2 border-b mb-1 sticky top-0 bg-background z-10">
                  <Checkbox
                    checked={filteredClientes.length > 0 && selectedClientes.size === filteredClientes.length}
                    onCheckedChange={toggleAllClientes}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    Selecionar todos ({filteredClientes.length})
                  </span>
                </div>
                {filteredClientes.map(cliente => (
                  <div key={cliente.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                    onClick={() => toggleCliente(cliente.id)}>
                    <Checkbox checked={selectedClientes.has(cliente.id)} onCheckedChange={() => toggleCliente(cliente.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cliente.nome}</p>
                      <div className="flex items-center gap-2">
                        {cliente.cidade && <span className="text-xs text-muted-foreground">{cliente.cidade}/{cliente.estado}</span>}
                        <UserBadge name={cliente.vendedor_name} />
                      </div>
                    </div>
                  </div>
                ))}
                {filteredClientes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
