import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { History, Send, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

interface ReportLog {
  id: string;
  email: string;
  report_date: string;
  report_type: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export function ReportHistoryTable() {
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_reports_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data as unknown as ReportLog[]) || []);
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar o histórico.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleTestReport = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-report', {
        body: { type: 'manual', test: true }
      });

      if (error) throw error;

      toast({
        title: "Relatório enviado",
        description: "Relatório de teste enviado com sucesso!",
      });

      // Recarregar histórico após alguns segundos
      setTimeout(loadLogs, 2000);

    } catch (error: any) {
      console.error('Erro ao enviar relatório:', error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Erro inesperado ao enviar relatório.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="text-green-700 bg-green-50">Enviado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
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
            <History className="h-5 w-5" />
            Histórico de Envios
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadLogs}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button 
              size="sm" 
              onClick={handleTestReport}
              disabled={sending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? "Enviando..." : "Enviar Teste"}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Histórico dos últimos 50 envios de relatórios automáticos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum envio encontrado</h3>
            <p className="text-muted-foreground mb-4">
              O histórico aparecerá aqui após os primeiros envios.
            </p>
            <Button onClick={handleTestReport} disabled={sending} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Enviando..." : "Enviar Relatório de Teste"}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{formatDate(log.sent_at || log.created_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        Data do relatório: {new Date(log.report_date).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{log.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {log.report_type === 'daily' ? 'Diário' : 
                       log.report_type === 'weekly' ? 'Semanal' : 
                       log.report_type === 'monthly' ? 'Mensal' : log.report_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      {getStatusBadge(log.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.error_message ? (
                      <div className="text-sm text-red-600 max-w-xs truncate" title={log.error_message}>
                        {log.error_message}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {log.status === 'success' ? 'Enviado com sucesso' : '-'}
                      </div>
                    )}
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