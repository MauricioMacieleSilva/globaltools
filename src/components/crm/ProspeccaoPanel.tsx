import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProspeccaoReviewPanel } from './ProspeccaoReviewPanel';
import { LeadExcelUpload } from './LeadExcelUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Loader2, Play, Sparkles, CheckCircle2, XCircle, Clock,
  Info, RefreshCw, ChevronsUpDown, X, History
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { locationsService } from '@/services/locationsService';

interface ProspectingConfig {
  id: string;
  is_active: boolean;
  ramos_atuacao: string[];
  estados: string[];
  cidades: string[];
  produtos_interesse: string[];
  max_leads_per_run: number;
  schedule_time: string;
}

interface ProspectingLog {
  id: string;
  status: string;
  leads_encontrados: number;
  leads_criados: number;
  leads_duplicados: number;
  started_at: string;
  finished_at: string | null;
  triggered_by: string;
  error_message: string | null;
}

interface BusinessSector {
  id: string;
  name: string;
}

interface ProspeccaoPanelProps {
  onLeadsApproved?: () => void;
}

export function ProspeccaoPanel({ onLeadsApproved }: ProspeccaoPanelProps) {
  const [config, setConfig] = useState<ProspectingConfig | null>(null);
  const [logs, setLogs] = useState<ProspectingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [isManagerOrAdmin, setIsManagerOrAdmin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [selectedRamos, setSelectedRamos] = useState<string[]>([]);
  const [selectedUF, setSelectedUF] = useState('RS');
  const [selectedCidades, setSelectedCidades] = useState<string[]>([]);
  const [maxLeads, setMaxLeads] = useState('10');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [isActive, setIsActive] = useState(false);

  const [businessSectors, setBusinessSectors] = useState<BusinessSector[]>([]);
  const [estados, setEstados] = useState<Array<{ uf: string; nome: string }>>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [cidadePopoverOpen, setCidadePopoverOpen] = useState(false);
  const [cidadeSearch, setCidadeSearch] = useState('');
  const [ramoPopoverOpen, setRamoPopoverOpen] = useState(false);
  const [ramoSearch, setRamoSearch] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['google', 'pncp', 'obrasgov']);

  // Detect role
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleData } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      const role = roleData?.role;
      setIsManagerOrAdmin(role === 'admin' || role === 'comercial');
    };
    checkRole();
  }, []);

  // Load estados and business sectors on mount
  useEffect(() => {
    locationsService.getEstados().then(data => setEstados(data));
    (supabase as any).from('crm_business_sectors').select('id, name').eq('is_active', true).order('name').then(({ data }: any) => {
      setBusinessSectors(data || []);
    });
  }, []);

  // Load cidades when UF changes
  useEffect(() => {
    if (!selectedUF) { setCidades([]); return; }
    setLoadingCidades(true);
    locationsService.getCidadesPorEstado(selectedUF).then(data => {
      setCidades(data);
      setLoadingCidades(false);
    });
  }, [selectedUF]);

  const filteredCidades = useMemo(() => {
    if (!cidadeSearch) return cidades.slice(0, 50);
    const q = cidadeSearch.toLowerCase();
    return cidades.filter(c => c.toLowerCase().includes(q)).slice(0, 50);
  }, [cidades, cidadeSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: configs }, { data: logsData }] = await Promise.all([
        (supabase as any).from('lead_prospecting_configs').select('*').order('created_at', { ascending: false }).limit(1),
        (supabase as any).from('lead_prospecting_logs').select('*').order('started_at', { ascending: false }).limit(25),
      ]);

      if (configs && configs.length > 0) {
        const cfg = configs[0] as ProspectingConfig;
        setConfig(cfg);
        setSelectedRamos(cfg.ramos_atuacao || []);
        setSelectedUF(cfg.estados?.[0] || 'RS');
        setSelectedCidades(cfg.cidades || []);
        setMaxLeads(String(cfg.max_leads_per_run || 10));
        setScheduleTime(cfg.schedule_time || '08:00');
        setIsActive(cfg.is_active || false);
      }

      const parsedLogs = (logsData as ProspectingLog[]) || [];
      
      // Auto-mark stuck "running" logs older than 5 minutes as failed
      const now = new Date();
      for (const log of parsedLogs) {
        if (log.status === 'running') {
          const startedAt = new Date(log.started_at);
          const diffMs = now.getTime() - startedAt.getTime();
          if (diffMs > 5 * 60 * 1000) {
            // Mark as error in the database
            await (supabase as any).from('lead_prospecting_logs').update({
              status: 'error',
              error_message: 'Timeout - execução excedeu o tempo limite',
              finished_at: new Date().toISOString(),
            }).eq('id', log.id);
            log.status = 'error';
            log.error_message = 'Timeout - execução excedeu o tempo limite';
          }
        }
      }
      
      setLogs(parsedLogs);
    } catch (error) {
      console.error('Error loading prospecting data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const buildPayload = () => ({
    is_active: isActive,
    ramos_atuacao: selectedRamos,
    estados: [selectedUF],
    cidades: selectedCidades,
    produtos_interesse: [] as string[],
    max_leads_per_run: parseInt(maxLeads) || 10,
    schedule_time: scheduleTime,
    updated_at: new Date().toISOString(),
  });

  const getSelectedSourcesForRun = () => selectedSources;

  const saveConfig = async () => {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const payload = buildPayload();

      if (config?.id) {
        const { error } = await (supabase as any)
          .from('lead_prospecting_configs')
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('lead_prospecting_configs')
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }

      toast.success('Configuração salva com sucesso');
      await loadData();
    } catch (error) {
      console.error('Save config error:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const persistConfig = async (): Promise<string | null> => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const payload = buildPayload();

      if (config?.id) {
        const { error } = await (supabase as any)
          .from('lead_prospecting_configs')
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
        return config.id;
      } else {
        const { data, error } = await (supabase as any)
          .from('lead_prospecting_configs')
          .insert({ ...payload, created_by: user?.id })
          .select('id')
          .single();
        if (error) throw error;
        return data?.id ?? null;
      }
    } catch (error) {
      console.error('Persist config error:', error);
      return null;
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      toast.info('Salvando configuração e iniciando prospecção...');
      const configId = await persistConfig();
      if (!configId) {
        toast.error('Erro ao salvar configuração');
        return;
      }

      const { data, error } = await supabase.functions.invoke('prospect-leads', {
        body: { config_id: configId, sources: getSelectedSourcesForRun() },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Prospecção concluída!', {
          description: `${data.leads_created} leads criados, ${data.leads_duplicated} duplicados descartados`,
        });
        await loadData();
      } else {
        toast.error('Erro na prospecção', { description: data?.message || data?.error });
      }
    } catch (error: any) {
      console.error('Run now error:', error);
      toast.error('Erro ao executar prospecção', { description: error.message });
    } finally {
      setRunning(false);
    }
  };

  const totalCreated = logs.filter(l => l.status === 'success').reduce((s, l) => s + l.leads_criados, 0);
  const totalDuplicates = logs.filter(l => l.status === 'success').reduce((s, l) => s + l.leads_duplicados, 0);
  const successRuns = logs.filter(l => l.status === 'success').length;

  const getStatusBadge = (status: string) => {
    if (status === 'success') return (
      <Badge variant="outline" className="gap-1 text-primary border-primary/20 bg-primary/5">
        <CheckCircle2 className="h-3 w-3" /> Sucesso
      </Badge>
    );
    if (status === 'running') return (
      <Badge variant="outline" className="gap-1 text-secondary-foreground border-secondary bg-secondary">
        <Clock className="h-3 w-3" /> Executando
      </Badge>
    );
    if (status === 'error') return (
      <Badge variant="outline" className="gap-1 text-destructive border-destructive/20 bg-destructive/10">
        <XCircle className="h-3 w-3" /> Erro
      </Badge>
    );
    return <Badge variant="outline">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // For non-managers, show only the review panel
  if (!isManagerOrAdmin) {
    return (
      <div className="space-y-4 pb-6">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Leads Disponíveis para Atendimento
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clique em "Atender" para adicionar o lead à sua lista
          </p>
        </div>
        <ProspeccaoReviewPanel isManagerOrAdmin={false} onLeadsApproved={() => { loadData(); onLeadsApproved?.(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Prospecção Automática de Leads via IA
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            A IA gera leads de empresas potenciais com base nos seus critérios de busca
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="auto-toggle" />
            <Label htmlFor="auto-toggle" className="text-xs cursor-pointer whitespace-nowrap">
              Auto diário
            </Label>
          </div>
          <Button
            onClick={runNow}
            disabled={running}
            size="sm"
            className="gap-1.5 h-8"
          >
            {running
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Play className="h-3.5 w-3.5" />
            }
            Buscar agora
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} className="h-8 px-2">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Config Card */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Critérios de Busca</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Ramos de Atuação */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Ramos de Atuação</Label>
              <Popover open={ramoPopoverOpen} onOpenChange={setRamoPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-8 text-xs font-normal"
                  >
                    <span className="truncate">
                      {selectedRamos.length > 0
                        ? `${selectedRamos.length} ramo${selectedRamos.length > 1 ? 's' : ''} selecionado${selectedRamos.length > 1 ? 's' : ''}`
                        : 'Selecionar ramos de atuação...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar ramo..."
                      value={ramoSearch}
                      onValueChange={setRamoSearch}
                      className="text-xs"
                    />
                    <CommandList>
                      <CommandEmpty className="text-xs py-3 text-center">Nenhum ramo encontrado</CommandEmpty>
                      <CommandGroup>
                        {businessSectors
                          .filter(s => !ramoSearch || s.name.toLowerCase().includes(ramoSearch.toLowerCase()))
                          .map(sector => (
                            <CommandItem
                              key={sector.id}
                              value={sector.name}
                              className="text-xs"
                              onSelect={() => {
                                setSelectedRamos(prev =>
                                  prev.includes(sector.name)
                                    ? prev.filter(r => r !== sector.name)
                                    : [...prev, sector.name]
                                );
                              }}
                            >
                              <div className={`mr-2 h-3 w-3 rounded-sm border flex items-center justify-center ${selectedRamos.includes(sector.name) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                                {selectedRamos.includes(sector.name) && <CheckCircle2 className="h-2.5 w-2.5" />}
                              </div>
                              {sector.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedRamos.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedRamos.map(ramo => (
                    <Badge key={ramo} variant="secondary" className="text-[10px] h-5 gap-0.5 px-1.5">
                      {ramo}
                      <button onClick={() => setSelectedRamos(prev => prev.filter(r => r !== ramo))}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Estado (UF) */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Estado (UF)</Label>
              <Select value={selectedUF} onValueChange={(v) => { setSelectedUF(v); setSelectedCidades([]); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {estados.map(e => (
                    <SelectItem key={e.uf} value={e.uf} className="text-xs">
                      {e.uf} - {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cidades */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Cidades (opcional)</Label>
              <Popover open={cidadePopoverOpen} onOpenChange={setCidadePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-8 text-xs font-normal"
                  >
                    <span className="truncate">
                      {selectedCidades.length > 0
                        ? `${selectedCidades.length} cidade${selectedCidades.length > 1 ? 's' : ''} selecionada${selectedCidades.length > 1 ? 's' : ''}`
                        : 'Buscar e selecionar cidades...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar cidade..."
                      value={cidadeSearch}
                      onValueChange={setCidadeSearch}
                      className="text-xs"
                    />
                    <CommandList>
                      {loadingCidades ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty className="text-xs py-3 text-center">Nenhuma cidade encontrada</CommandEmpty>
                          <CommandGroup>
                            {filteredCidades.map(cidade => (
                              <CommandItem
                                key={cidade}
                                value={cidade}
                                className="text-xs"
                                onSelect={() => {
                                  setSelectedCidades(prev =>
                                    prev.includes(cidade)
                                      ? prev.filter(c => c !== cidade)
                                      : [...prev, cidade]
                                  );
                                }}
                              >
                                <div className={`mr-2 h-3 w-3 rounded-sm border flex items-center justify-center ${selectedCidades.includes(cidade) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                                  {selectedCidades.includes(cidade) && <CheckCircle2 className="h-2.5 w-2.5" />}
                                </div>
                                {cidade}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedCidades.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCidades.map(cidade => (
                    <Badge key={cidade} variant="secondary" className="text-[10px] h-5 gap-0.5 px-1.5">
                      {cidade}
                      <button onClick={() => setSelectedCidades(prev => prev.filter(c => c !== cidade))}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Fontes de Dados */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Fontes de Dados</Label>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={selectedSources.includes('google')}
                    onCheckedChange={(checked) => {
                      setSelectedSources(prev => checked ? [...prev, 'google'] : prev.filter(s => s !== 'google'));
                    }}
                    className="h-3.5 w-3.5"
                  />
                  Google (Firecrawl)
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={selectedSources.includes('pncp')}
                    onCheckedChange={(checked) => {
                      setSelectedSources(prev => checked ? [...prev, 'pncp'] : prev.filter(s => s !== 'pncp'));
                    }}
                    className="h-3.5 w-3.5"
                  />
                  PNCP (Licitações)
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={selectedSources.includes('obrasgov')}
                    onCheckedChange={(checked) => {
                      setSelectedSources(prev => checked ? [...prev, 'obrasgov'] : prev.filter(s => s !== 'obrasgov'));
                    }}
                    className="h-3.5 w-3.5"
                  />
                  ObrasGov (Obras Federais)
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Máx. leads por execução</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={maxLeads}
                  onChange={e => setMaxLeads(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Horário diário</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <Button onClick={saveConfig} disabled={saving} size="sm" className="w-full gap-2 h-8 mt-1">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar Configuração
            </Button>
          </CardContent>
        </Card>

        {/* Info + Stats Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              Como funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-2.5 text-xs text-muted-foreground">
              {[
                'Configure critérios: ramos, regiões e produtos de interesse.',
                'A IA gera empresas potencialmente compradoras de aço no Brasil.',
                'Os leads aparecem no Kanban com a tag prospeccao_automatica.',
                'Duplicatas são descartadas automaticamente.',
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-base font-bold text-primary">{totalCreated}</div>
                <div className="text-[10px] text-muted-foreground">Criados</div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-base font-bold">{totalDuplicates}</div>
                <div className="text-[10px] text-muted-foreground">Duplicados</div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-base font-bold">{successRuns}</div>
                <div className="text-[10px] text-muted-foreground">Execuções</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Panel */}
      <ProspeccaoReviewPanel isManagerOrAdmin={true} onLeadsApproved={() => { loadData(); onLeadsApproved?.(); }} />

      {/* History - collapsible */}
      <div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setShowHistory(!showHistory)}
        >
          <History className="h-3.5 w-3.5" />
          {showHistory ? 'Ocultar Histórico' : 'Ver Histórico de Execuções'}
        </Button>

        {showHistory && (
          <Card className="mt-3">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Histórico de Execuções</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                  <Sparkles className="h-8 w-8 opacity-20" />
                  <p className="text-sm">Nenhuma execução ainda</p>
                  <p className="text-xs">Salve a configuração e clique em "Buscar agora"</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {getStatusBadge(log.status)}
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">
                            {format(new Date(log.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {log.triggered_by === 'manual' ? 'Manual' : 'Automático'}
                            {log.error_message && ` · ${log.error_message}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-xs">
                        <div className="text-center hidden sm:block">
                          <div className="font-semibold">{log.leads_encontrados}</div>
                          <div className="text-[10px] text-muted-foreground">gerados</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-primary">{log.leads_criados}</div>
                          <div className="text-[10px] text-muted-foreground">criados</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-muted-foreground">{log.leads_duplicados}</div>
                          <div className="text-[10px] text-muted-foreground">duplic.</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
