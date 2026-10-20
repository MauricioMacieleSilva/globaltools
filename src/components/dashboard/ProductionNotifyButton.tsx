import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProducaoData } from '@/services/producaoService';
import { ProductionOrderData } from '@/services/productionOrdersService';
import {
  AlertDialog,
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
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [recipientsCount, setRecipientsCount] = useState<number | null>(null);
  const [isAlreadySent, setIsAlreadySent] = useState(false);
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

  const handleOpenChange = (newOpen: boolean) => {
    if (sending) return; // Prevent closing while sending
    if (newOpen) {
      setSentSuccess(false);
    }
    setOpen(newOpen);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const situacaoMap: Record<string, string> = {
        'aguardando_mp': 'Aguardando MP',
        'em_producao': 'Em Produção',
        'material_em_estoque': 'Material em Estoque',
        'outra': 'Outra',
      };

      const payload = {
        numero_pedido: pedido.numero_pedido,
        tipo,
        numero_op: numeroOp,
        cliente: pedido.cli_nomef,
        prazo: pedido.prazo_pcp,
        novo_prazo: productionOrder?.novo_prazo || undefined,
        situacao_producao: productionOrder?.situacao 
          ? (productionOrder.situacao === 'outra' && productionOrder.situacao_descricao 
            ? productionOrder.situacao_descricao 
            : situacaoMap[productionOrder.situacao] || productionOrder.situacao) 
          : undefined,
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

      const count = response.data?.recipients || response.data?.results?.length || 1;
      setRecipientsCount(count);
      setSentSuccess(true);
      setIsAlreadySent(true);

      toast({
        title: 'Notificação enviada com sucesso!',
        description: tipo === 'pedido_finalizado' 
          ? `E-mail de conclusão do pedido ${pedido.numero_pedido} enviado.`
          : `E-mail de conclusão da OP ${numeroOp} enviado.`,
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

  const label = isAlreadySent
    ? (tipo === 'pedido_finalizado' ? 'E-mail de conclusão já enviado (clique para reenviar)' : `E-mail da OP ${numeroOp} já enviado (clique para reenviar)`)
    : (tipo === 'pedido_finalizado' ? 'Notificar conclusão do pedido' : `Notificar conclusão da OP ${numeroOp}`);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant={isAlreadySent ? 'outline' : variant}
          size={size}
          disabled={sending}
          title={label}
          className={`gap-1.5 transition-colors ${
            isAlreadySent 
              ? 'text-emerald-600 border-emerald-300 hover:text-emerald-700 hover:border-emerald-400 bg-emerald-50/50' 
              : ''
          }`}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAlreadySent ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {showLabel && (
            <span className="text-xs">
              {isAlreadySent 
                ? 'Enviado' 
                : (tipo === 'pedido_finalizado' ? 'Notificar' : 'Notificar OP')}
            </span>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {sentSuccess ? (
          <>
            <AlertDialogHeader className="text-center sm:text-center pt-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 animate-in zoom-in-50 duration-200">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <AlertDialogTitle className="text-center text-lg font-bold text-gray-900">
                E-mail enviado com sucesso!
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm text-gray-600 space-y-2 mt-2">
                <p>
                  {tipo === 'pedido_finalizado' ? (
                    <>
                      A notificação de conclusão do pedido <strong>{pedido.numero_pedido}</strong> ({pedido.cli_nomef}) foi enviada com sucesso para os contatos configurados.
                    </>
                  ) : (
                    <>
                      A notificação de conclusão da OP <strong>{numeroOp}</strong> do pedido <strong>{pedido.numero_pedido}</strong> foi enviada com sucesso.
                    </>
                  )}
                </p>
                {recipientsCount !== null && (
                  <p className="text-xs text-muted-foreground bg-gray-50 py-1.5 px-3 rounded-md border border-gray-100 inline-block">
                    Destinatários notificados: <strong>{recipientsCount} contato(s)</strong>
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center mt-4">
              <Button 
                onClick={() => setOpen(false)} 
                className="w-full sm:w-auto min-w-[120px] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Concluir
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isAlreadySent ? 'Reenviar notificação por e-mail?' : 'Enviar notificação por e-mail?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {tipo === 'pedido_finalizado'
                  ? `Será enviado um e-mail informando a conclusão do pedido ${pedido.numero_pedido} (${pedido.cli_nomef}) para todos os contatos configurados nos relatórios.`
                  : `Será enviado um e-mail informando a conclusão da OP ${numeroOp} do pedido ${pedido.numero_pedido} (${pedido.cli_nomef}) para todos os contatos configurados nos relatórios.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={sending}>Cancelar</AlertDialogCancel>
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando e-mail...
                  </>
                ) : (
                  'Enviar e-mail'
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
