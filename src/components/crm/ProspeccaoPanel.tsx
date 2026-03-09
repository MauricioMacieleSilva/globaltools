import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Play, Sparkles, CheckCircle2, XCircle, Clock,
  Info, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export function ProspeccaoPanel() {
  const [config, setConfig] = useState<ProspectingConfig | null>(null);
  const [logs, setLogs] = useState<ProspectingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const [ramosInput, setRamosInput] = useState('');
  const [estadosInput, setEstadosInput] = useState('');
  const [cidadesInput, setCidadesInput] = useState('');
  const [produtosInput, setProdutosInput] = useState('');
  const [maxLeads, setMaxLeads] = useState('10');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [isActive, setIsActive] = useState(false);

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
        setRamosInput(cfg.ramos_atuacao?.join(', ') || '');
        setEstadosInput(cfg.estados?.join(', ') || '');
        setCidadesInput(cfg.cidades?.join(', ') || '');
        setProdutosInput(cfg.produtos_interesse?.join(', ') || '');
        setMaxLeads(String(cfg.max_leads_per_run || 10));
        setScheduleTime(cfg.schedule_time || '08:00');
        setIsActive(cfg.is_active || false);
      }

      setLogs((logsData as ProspectingLog[]) || []);
    } catch (error) {
      console.error('Error loading prospecting data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const parseArray = (input: string): string[] =>
    input.split(',').map(s => s.trim()).filter(Boolean);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const payload = {
        is_active: isActive,
        ramos_atuacao: parseArray(ramosInput),
        estados: parseArray(estadosInput),
        cidades: parseArray(cidadesInput),
        produtos_interesse: parseArray(produtosInput),
        max_leads_per_run: parseInt(maxLeads) || 10,
        schedule_time: scheduleTime,
        updated_at: new Date().toISOString(),
      };

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

  const runNow = async () => {
    if (!config?.id) {
      toast.error('Salve a configuração antes de executar');
      return;
    }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('prospect-leads', {
        body: { config_id: config.id },
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
      <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Sucesso
      </Badge>
    );
    if (status === 'running') return (
      <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
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
            disabled={running || !config?.id}
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
            <CardDescription className="text-xs">Separe múltiplos valores por vírgula</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Ramos de Atuação</Label>
              <Input
                placeholder="construção civil, metalúrgica, estruturas metálicas"
                value={ramosInput}
                onChange={e => setRamosInput(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Estados (UF)</Label>
              <Input
                placeholder="SP, MG, RJ, PR, SC, RS"
                value={estadosInput}
                onChange={e => setEstadosInput(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Cidades (opcional)</Label>
              <Input
                placeholder="São Paulo, Belo Horizonte, Curitiba"
                value={cidadesInput}
                onChange={e => setCidadesInput(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Produtos de Interesse</Label>
              <Input
                placeholder="bobinas, chapas, perfis metálicos, tubos"
                value={produtosInput}
                onChange={e => setProdutosInput(e.target.value)}
                className="h-8 text-xs"
              />
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

      {/* History */}
      <Card>
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
    </div>
  );
}
