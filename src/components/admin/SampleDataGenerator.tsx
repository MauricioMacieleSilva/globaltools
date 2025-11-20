import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Loader2, TestTube, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function SampleDataGenerator() {
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateSampleData = async () => {
    setGenerating(true);
    try {
      // Criar clientes de exemplo
      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .insert([
          {
            nome: 'Empresa Exemplo A',
            cnpj: '12.345.678/0001-90',
            email: 'contato@empresaa.com.br',
            telefone: '(11) 98765-4321',
            cidade: 'São Paulo',
            estado: 'SP',
            segmento: 'Indústria',
          },
          {
            nome: 'Empresa Exemplo B',
            cnpj: '98.765.432/0001-10',
            email: 'contato@empresab.com.br',
            telefone: '(21) 97654-3210',
            cidade: 'Rio de Janeiro',
            estado: 'RJ',
            segmento: 'Comércio',
          }
        ])
        .select();

      if (clientesError) throw clientesError;

      const clienteIds = clientes?.map(c => c.id) || [];

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar orçamentos de exemplo
      const { data: orcamentos, error: orcamentosError } = await supabase
        .from('orcamentos')
        .insert([
          {
            numero_orcamento: `ORC-EXEMPLO-001`,
            cliente_id: clienteIds[0],
            vendedor_id: user.id,
            valor_total: 15000,
            valor_final: 15000,
            status: 'enviado',
            observacoes: 'Orçamento de exemplo para testes'
          },
          {
            numero_orcamento: `ORC-EXEMPLO-002`,
            cliente_id: clienteIds[1],
            vendedor_id: user.id,
            valor_total: 25000,
            valor_final: 23750,
            desconto_percentual: 5,
            valor_desconto: 1250,
            status: 'aprovado',
            observacoes: 'Orçamento de exemplo para testes'
          },
          {
            numero_orcamento: `ORC-EXEMPLO-003`,
            cliente_id: clienteIds[0],
            vendedor_id: user.id,
            valor_total: 8000,
            valor_final: 8000,
            status: 'perdido',
            observacoes: 'Orçamento de exemplo - perdido por preço'
          },
          {
            numero_orcamento: `ORC-EXEMPLO-004`,
            cliente_id: clienteIds[1],
            vendedor_id: user.id,
            valor_total: 12000,
            valor_final: 12000,
            status: 'aberto',
            observacoes: 'Orçamento de exemplo para testes'
          },
          {
            numero_orcamento: `ORC-EXEMPLO-005`,
            cliente_id: clienteIds[0],
            vendedor_id: user.id,
            valor_total: 30000,
            valor_final: 30000,
            status: 'enviado',
            observacoes: 'Orçamento de exemplo para testes'
          }
        ])
        .select();

      if (orcamentosError) throw orcamentosError;

      // Criar pedidos de exemplo
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .insert([
          {
            numero_pedido: `PED-EXEMPLO-001`,
            cliente_id: clienteIds[0],
            vendedor_id: user.id,
            valor_total: 15000,
            status: 'producao',
            orcamento_id: orcamentos?.[0]?.id,
            observacoes: 'Pedido de exemplo para testes'
          },
          {
            numero_pedido: `PED-EXEMPLO-002`,
            cliente_id: clienteIds[1],
            vendedor_id: user.id,
            valor_total: 23750,
            status: 'finalizado',
            orcamento_id: orcamentos?.[1]?.id,
            observacoes: 'Pedido de exemplo para testes'
          },
          {
            numero_pedido: `PED-EXEMPLO-003`,
            cliente_id: clienteIds[0],
            vendedor_id: user.id,
            valor_total: 18500,
            status: 'entregue',
            observacoes: 'Pedido de exemplo para testes'
          }
        ])
        .select();

      if (pedidosError) throw pedidosError;

      // Criar um cancelamento de exemplo
      await supabase
        .from('cancelamentos')
        .insert({
          numero_pedido: 'PED-EXEMPLO-004',
          cliente_id: clienteIds[1],
          valor: 5000,
          motivo: 'Cliente desistiu da compra - exemplo para teste',
          observacoes: 'Cancelamento de exemplo para testes de relatório'
        });

      // Invalidar queries para atualizar dados
      queryClient.invalidateQueries();

      toast({
        title: "Dados gerados com sucesso!",
        description: "Foram criados 2 clientes, 5 orçamentos, 3 pedidos e 1 cancelamento de exemplo.",
      });
    } catch (error: any) {
      console.error('Erro ao gerar dados:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível gerar os dados de exemplo.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const clearSampleData = async () => {
    if (!confirm('Tem certeza que deseja remover todos os dados de exemplo? Esta ação não pode ser desfeita.')) return;

    setClearing(true);
    try {
      // Deletar em ordem reversa por causa das foreign keys
      await supabase.from('cancelamentos').delete().ilike('observacoes', '%exemplo para teste%');
      await supabase.from('pedidos').delete().ilike('observacoes', '%exemplo para teste%');
      await supabase.from('orcamentos').delete().ilike('observacoes', '%exemplo para teste%');
      await supabase.from('clientes').delete().ilike('nome', 'Empresa Exemplo%');

      queryClient.invalidateQueries();

      toast({
        title: "Dados removidos",
        description: "Todos os dados de exemplo foram removidos com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao limpar dados:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover os dados de exemplo.",
        variant: "destructive"
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TestTube className="h-4 w-4" />
          Dados de Exemplo
        </CardTitle>
        <CardDescription>
          Gere dados fictícios para testar os relatórios por email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Button
            onClick={generateSampleData}
            disabled={generating || clearing}
            variant="outline"
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Gerar Dados de Teste
              </>
            )}
          </Button>
          <Button
            onClick={clearSampleData}
            disabled={generating || clearing}
            variant="ghost"
            size="sm"
          >
            {clearing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Dados de Teste
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
