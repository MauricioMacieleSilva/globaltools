import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProducaoData } from '@/services/producaoService';
import { ProductionOrderData } from '@/services/productionOrdersService';
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

interface ProductionNotifyButtonProps {
  pedido: ProducaoData;
  tipo: 'op_concluida' | 'pedido_finalizado';
  numeroOp?: string;
  productionOrder?: ProductionOrderData;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'icon';
  showLabel?: boolean;
}

export function ProductionNotifyButton({ 
  pedido, tipo, numeroOp, productionOrder, variant = 'ghost', size = 'sm', showLabel = false 
}: ProductionNotifyButtonProps) {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const formatPesoForEmail = (item: ProducaoData) => {
    // Summary peso total: show ONLY KG weight (from commercial sheet)
    const pesoKg = Math.round(item.peso_total_kg || 0);
    return `${pesoKg.toLocaleString('pt-BR')}KG`;
  };

  const formatOpPesoForEmail = (op: ProducaoData['ops'][0]) => {
    const nonKgUnits = Object.entries(op.pesos_por_unidade)
      .filter(([un]) => un !== 'KG' && un !== 'T')
      .map(([un, peso]) => `${peso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${un}`);
    const pesoKg = Math.round(op.peso_total_kg || 0);
    const kgStr = `${pesoKg.toLocaleString('pt-BR')}KG`;
    if (nonKgUnits.length > 0) return `${nonKgUnits.join(' / ')} | ${kgStr}`;
    return kgStr;
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const situacaoMap: Record<string, string> = {
        'aguardando_mp': 'Aguardando MP',
        'em_producao': 'Em Produção',
      };

      const payload = {
        numero_pedido: pedido.numero_pedido,
        tipo,
        numero_op: numeroOp,
        cliente: pedido.cli_nomef,
        prazo: pedido.prazo_pcp,
        novo_prazo: productionOrder?.novo_prazo || undefined,
        situacao_producao: productionOrder?.situacao ? situacaoMap[productionOrder.situacao] || productionOrder.situacao : undefined,
        peso_total: formatPesoForEmail(pedido),
        percentual_concluido: pedido.percentual_concluido,
        ops: pedido.ops.map(op => ({
          numero_op: op.numero_op,
          situacao_op: op.situacao_op,
          peso: formatOpPesoForEmail(op),
          materiais: op.materiais.map(mat => ({
            descricaomat: mat.descricaomat,
            observacao: mat.observacao,
            quantidade: mat.qtd_pendente,
            unidade: mat.un,
          })),
        })),
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const response = await supabase.functions.invoke('notify-production-status', {
        body: payload,
      });

      if (response.error) throw response.error;

      toast({
        title: 'Notificação enviada!',
        description: tipo === 'pedido_finalizado' 
          ? `E-mail de conclusão do pedido ${pedido.numero_pedido} enviado com sucesso.`
          : `E-mail de conclusão da OP ${numeroOp} enviado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao enviar notificação:', error);
      toast({
        title: 'Erro ao enviar notificação',
        description: error.message || 'Não foi possível enviar o e-mail.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const label = tipo === 'pedido_finalizado' 
    ? 'Notificar conclusão do pedido' 
    : `Notificar conclusão da OP ${numeroOp}`;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={sending}
          title={label}
          className="gap-1.5"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {showLabel && <span className="text-xs">{tipo === 'pedido_finalizado' ? 'Notificar' : 'Notificar OP'}</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar notificação por e-mail?</AlertDialogTitle>
          <AlertDialogDescription>
            {tipo === 'pedido_finalizado'
              ? `Será enviado um e-mail informando a conclusão do pedido ${pedido.numero_pedido} (${pedido.cli_nomef}) para todos os contatos configurados nos relatórios.`
              : `Será enviado um e-mail informando a conclusão da OP ${numeroOp} do pedido ${pedido.numero_pedido} (${pedido.cli_nomef}) para todos os contatos configurados nos relatórios.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSend} disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar e-mail'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
