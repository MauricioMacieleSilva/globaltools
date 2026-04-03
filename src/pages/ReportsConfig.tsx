import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { ReportConfigTable } from "@/components/admin/ReportConfigTable";
import { ReportHistoryTable } from "@/components/admin/ReportHistoryTable";
import { MonthlyClosingReportDialog } from "@/components/admin/MonthlyClosingReportDialog";
import { Mail, History, Settings, Factory, Calendar, Clock, Loader2, Save, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  children: React.ReactNode;
}

function ReportCard({ icon, title, description, badge, children }: ReportCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="outline" className="text-xs shrink-0">
            {badge}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ProductionConfig() {
  const [config, setConfig] = useState<{ id: string; is_active: boolean; send_time: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('production_report_schedule')
          .select('*')
          .limit(1)
          .single();
        if (error) throw error;
        setConfig(data);
      } catch (e) {
        console.error('Erro ao carregar configuração:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('production_report_schedule')
        .update({ is_active: config.is_active, send_time: config.send_time, updated_at: new Date().toISOString() })
        .eq('id', config.id);
      if (error) throw error;
      toast({
        title: 'Configuração salva',
        description: config.is_active
          ? `Relatório será enviado de seg a sex às ${config.send_time}.`
          : 'Envio automático desativado.',
      });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!config) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Envio automático</Label>
          <p className="text-sm text-muted-foreground">Enviar relatório de seg a sex para os destinatários configurados</p>
        </div>
        <Switch checked={config.is_active} onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })} />
      </div>
      {config.is_active && (
        <div className="space-y-2">
          <Label htmlFor="prod-send-time" className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Horário de Envio
          </Label>
          <Input id="prod-send-time" type="time" value={config.send_time} onChange={(e) => setConfig({ ...config, send_time: e.target.value })} className="w-40" />
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}




function EstoqueConfig() {
  const [config, setConfig] = useState<{ id: string; is_active: boolean; send_time: string; send_days: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const DAYS = [
    { key: 'seg', label: 'Seg' },
    { key: 'ter', label: 'Ter' },
    { key: 'qua', label: 'Qua' },
    { key: 'qui', label: 'Qui' },
    { key: 'sex', label: 'Sex' },
    { key: 'sab', label: 'Sáb' },
    { key: 'dom', label: 'Dom' },
  ];

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('estoque_report_schedule' as any)
          .select('*')
          .limit(1)
          .single();
        if (error) throw error;
        const d = data as any;
        setConfig({ id: d.id, is_active: d.is_active, send_time: d.send_time, send_days: d.send_days || ['seg','ter','qua','qui','sex'] });
      } catch (e) {
        console.error('Erro ao carregar configuração de estoque:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleDay = (day: string) => {
    if (!config) return;
    const days = config.send_days.includes(day)
      ? config.send_days.filter(d => d !== day)
      : [...config.send_days, day];
    setConfig({ ...config, send_days: days });
  };

  const handleSave = async () => {
    if (!config) return;
    if (config.send_days.length === 0) {
      toast({ title: 'Selecione ao menos um dia', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('estoque_report_schedule' as any)
        .update({ is_active: config.is_active, send_time: config.send_time, send_days: config.send_days, updated_at: new Date().toISOString() } as any)
        .eq('id', config.id);
      if (error) throw error;
      const dayLabels = DAYS.filter(d => config.send_days.includes(d.key)).map(d => d.label).join(', ');
      toast({
        title: 'Configuração salva',
        description: config.is_active
          ? `Relatório de estoque será enviado ${dayLabels} às ${config.send_time}.`
          : 'Envio automático de estoque desativado.',
      });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!config) return null;

  const selectedDayLabels = DAYS.filter(d => config.send_days.includes(d.key)).map(d => d.label).join(', ');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Envio automático</Label>
          <p className="text-sm text-muted-foreground">Enviar relatório nos dias selecionados para os destinatários configurados</p>
        </div>
        <Switch checked={config.is_active} onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })} />
      </div>
      {config.is_active && (
        <>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Dias de Envio
            </Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(day => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    config.send_days.includes(day.key)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="estoque-send-time" className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Horário de Envio
            </Label>
            <Input id="estoque-send-time" type="time" value={config.send_time} onChange={(e) => setConfig({ ...config, send_time: e.target.value })} className="w-40" />
          </div>
        </>
      )}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

export default function ReportsConfig() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios Automáticos</h1>
        <p className="text-muted-foreground">
          Configure destinatários, horários e acompanhe o histórico de envios
        </p>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico de Envios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <ReportCard
            icon={<Mail className="h-5 w-5 text-primary" />}
            title="Relatório Comercial"
            description="Configure destinatários e horários do relatório comercial diário"
            badge="Seg a Sex"
          >
            <ReportConfigTable />
          </ReportCard>

          <ReportCard
            icon={<Factory className="h-5 w-5 text-primary" />}
            title="Relatório de Produção"
            description="Configure o envio automático do relatório de produção diário"
            badge="Seg a Sex"
          >
            <ProductionConfig />
          </ReportCard>

          <ReportCard
            icon={<Package className="h-5 w-5 text-primary" />}
            title="Relatório de Estoque"
            description="Configure o envio automático do relatório de estoque diário"
            badge="Seg a Sex"
          >
            <EstoqueConfig />
          </ReportCard>

          <ReportCard
            icon={<Calendar className="h-5 w-5 text-primary" />}
            title="Fechamento Mensal"
            description="Gere relatórios completos de meses anteriores para fechamento contábil"
            badge="Sob demanda"
          >
            <div className="flex justify-end">
              <MonthlyClosingReportDialog />
            </div>
          </ReportCard>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ReportHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
