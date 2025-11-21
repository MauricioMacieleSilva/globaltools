import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Clock, Mail, Send } from "lucide-react";
import { ReportConfigDialog } from './ReportConfigDialog';
import { ReportPreviewDialog } from './ReportPreviewDialog';
import { ReportDownloadButton } from './ReportDownloadButton';

interface ReportConfig {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  frequency: string;
  send_time: string;
  custom_days: string[] | null;
  include_vendas: boolean;
  include_funil: boolean;
  include_perdidos: boolean;
  include_cancelamentos: boolean;
  created_at: string;
}

export function ReportConfigTable() {
  const [configs, setConfigs] = useState<ReportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_reports_config' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs((data as unknown as ReportConfig[]) || []);
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('email_reports_config' as any)
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setConfigs(prev => prev.map(config => 
        config.id === id ? { ...config, is_active: isActive } : config
      ));

      toast({
        title: isActive ? "Ativado" : "Desativado",
        description: `Relatório ${isActive ? 'ativado' : 'desativado'} com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive"
      });
    }
  };

  const handleSendManual = async (configId: string) => {
    console.log(`🚀 Enviando relatório manual para config ID: ${configId}`);
    setSendingId(configId);
    try {
      const { data, error } = await supabase.functions.invoke('send-manual-report', {
        body: { configId }
      });

      console.log('📤 Resposta da Edge Function:', { data, error });

      if (error) throw error;

      toast({
        title: "Enviado",
        description: "Relatório enviado com sucesso!",
      });
    } catch (error: any) {
      console.error('❌ Erro ao enviar relatório:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o relatório.",
        variant: "destructive"
      });
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta configuração?')) return;

    try {
      const { error } = await supabase
        .from('email_reports_config' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConfigs(prev => prev.filter(config => config.id !== id));
      
      toast({
        title: "Removido",
        description: "Configuração removida com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao remover configuração:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a configuração.",
        variant: "destructive"
      });
    }
  };

  const getFrequencyLabel = (frequency: string, customDays?: string[] | null) => {
    if (frequency === 'custom' && customDays && customDays.length > 0) {
      const dayLabels: Record<string, string> = {
        monday: 'Seg',
        tuesday: 'Ter',
        wednesday: 'Qua',
        thursday: 'Qui',
        friday: 'Sex',
        saturday: 'Sáb',
        sunday: 'Dom'
      };
      return customDays.map(d => dayLabels[d] || d).join(', ');
    }
    
    switch (frequency) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      case 'custom': return 'Personalizada';
      default: return frequency;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configurações de Relatórios
          </div>
          <ReportConfigDialog onConfigAdded={loadConfigs} />
        </CardTitle>
        <CardDescription>
          Gerencie os destinatários e configurações dos relatórios automáticos
        </CardDescription>
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            ⚠️ <strong>Modo de Teste:</strong> Os emails estão sendo enviados para o email autorizado (mauricio.maciel@globalaco.com.br) 
            até que um domínio seja verificado no Resend. 
            <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline ml-1 font-medium hover:text-amber-700 dark:hover:text-amber-300">
              Configure um domínio aqui
            </a>
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {configs.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma configuração encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Comece adicionando um destinatário para os relatórios automáticos.
            </p>
            <ReportConfigDialog onConfigAdded={loadConfigs} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatário</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{config.full_name || config.email}</div>
                      {config.full_name && (
                        <div className="text-sm text-muted-foreground">{config.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {getFrequencyLabel(config.frequency, config.custom_days)}
                    </Badge>
                  </TableCell>
                  <TableCell>{config.send_time}</TableCell>
                  <TableCell>
                    <Switch
                      checked={config.is_active}
                      onCheckedChange={(checked) => handleToggleActive(config.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ReportPreviewDialog 
                        configId={config.id}
                        disabled={!config.is_active}
                      />
                      <ReportDownloadButton
                        configId={config.id}
                        disabled={!config.is_active}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendManual(config.id)}
                        disabled={sendingId === config.id || !config.is_active}
                        className="text-primary hover:text-primary"
                        title="Enviar relatório agora"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(config.id)}
                        className="text-destructive hover:text-destructive"
                        title="Remover configuração"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}