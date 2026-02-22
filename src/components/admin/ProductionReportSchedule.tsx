import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Factory, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScheduleConfig {
  id: string;
  is_active: boolean;
  send_time: string;
}

interface ProductionReportScheduleProps {
  embedded?: boolean;
}

export function ProductionReportSchedule({ embedded = false }: ProductionReportScheduleProps) {
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('production_report_schedule')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('production_report_schedule')
        .update({
          is_active: config.is_active,
          send_time: config.send_time,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: 'Configuração salva',
        description: config.is_active 
          ? `Relatório de produção será enviado de seg a sex às ${config.send_time}.`
          : 'Envio automático do relatório de produção desativado.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) return null;

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Envio automático</Label>
          <p className="text-sm text-muted-foreground">
            Enviar relatório de seg a sex para os destinatários configurados
          </p>
        </div>
        <Switch
          checked={config.is_active}
          onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
        />
      </div>

      {config.is_active && (
        <div className="space-y-2">
          <Label htmlFor="prod-send-time" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Horário de Envio
          </Label>
          <Input
            id="prod-send-time"
            type="time"
            value={config.send_time}
            onChange={(e) => setConfig({ ...config, send_time: e.target.value })}
            className="w-40"
          />
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar Configuração
      </Button>
    </div>
  );

  // When embedded, render just the content (parent provides Card wrapper)
  if (embedded) {
    return content;
  }

  // Standalone mode with its own Card
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Relatório de Produção Diário
        </CardTitle>
        <CardDescription>
          Configure o envio automático diário do relatório de produção por e-mail
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
