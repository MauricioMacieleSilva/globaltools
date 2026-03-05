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

export function EstoqueReportButton() {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    setSending(true);
    try {
      const response = await supabase.functions.invoke('send-estoque-report', {
        body: {},
      });

      if (response.error) throw response.error;

      const data = response.data;
      toast({
        title: 'Relatório de estoque enviado!',
        description: `Relatório com ${data?.totalItens || 0} itens em ${data?.categorias || 0} categorias enviado para ${data?.enviados || 0} contato(s).`,
      });
    } catch (error: any) {
      console.error('Erro ao enviar relatório de estoque:', error);
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
        <Button variant="outline" size="sm" className="gap-2" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          <span className="hidden sm:inline">Enviar Relatório Estoque</span>
          <span className="sm:hidden">Email</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar relatório de estoque por e-mail?</AlertDialogTitle>
          <AlertDialogDescription>
            Será gerado e enviado um relatório completo de estoque separado por categoria, com KPIs,
            dimensões, peso e valor estimado para os contatos configurados nos relatórios.
            Categorias vazias não serão incluídas.
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
