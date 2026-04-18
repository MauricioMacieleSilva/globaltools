import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useStaleLeadsBlinkSettings } from '@/hooks/useCrmSettings';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export function StaleLeadsBlinkConfig() {
  const { settings, loading, save } = useStaleLeadsBlinkSettings();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [days, setDays] = useState(settings.days_threshold);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(settings.enabled);
    setDays(settings.days_threshold);
  }, [settings.enabled, settings.days_threshold]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({ enabled, days_threshold: Math.max(1, Number(days) || 2) });
      toast.success('Configuração salva');
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Alerta visual para leads parados
        </CardTitle>
        <CardDescription>
          Quando ativado, leads sem interação há mais que o limite configurado piscarão no Kanban para chamar a atenção dos vendedores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Piscar leads parados no Kanban</Label>
            <p className="text-xs text-muted-foreground">
              Aplica animação visual nos cards de leads inativos.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="days-threshold" className="text-sm">Limite de dias sem interação</Label>
          <Input
            id="days-threshold"
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            disabled={loading || !enabled}
            className="max-w-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            Leads sem atualização há mais de <strong>{days}</strong> dia(s) ficarão piscando.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Salvando...' : 'Salvar configuração'}
        </Button>
      </CardContent>
    </Card>
  );
}
