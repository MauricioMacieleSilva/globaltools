import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function ProductionReportButton() {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    setSending(true);
    try {
      const response = await supabase.functions.invoke('send-production-report', {
        body: {},
      });

      if (response.error) throw response.error;

      const data = response.data;
      toast({
        title: 'Relatório de produção enviado!',
        description: `Relatório com ${data?.totalPedidos || 0} pedidos enviado para os contatos configurados.`,
      });
    } catch (error: any) {
      console.error('Erro ao enviar relatório de produção:', error);
      toast({
        title: 'Erro ao enviar relatório',
        description: error.message || 'Não foi possível enviar o relatório.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          <span className="hidden sm:inline">Enviar Relatório Produção</span>
          <span className="sm:hidden">Relatório</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar relatório de produção?</AlertDialogTitle>
          <AlertDialogDescription>
            Será gerado e enviado um relatório completo de produção com KPIs, pedidos atrasados, 
            finalizados e todos os detalhes para os contatos configurados nos relatórios comerciais.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSend} disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar relatório'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
