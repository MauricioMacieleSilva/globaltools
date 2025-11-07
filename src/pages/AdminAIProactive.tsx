import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminAIProactive() {
  const [isRunning, setIsRunning] = useState(false);

  const runAnalysis = async () => {
    setIsRunning(true);
    try {
      toast.info('Iniciando análise proativa...');
      
      const { data, error } = await supabase.functions.invoke('ai-proactive-analysis');
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.warning('Análise concluída sem alertas');
      }
    } catch (error: any) {
      console.error('Erro ao executar análise:', error);
      toast.error('Erro ao executar análise proativa');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">IA Proativa - Teste Manual</h1>
        <p className="text-muted-foreground mt-2">
          Execute manualmente a análise proativa da IA para gerar notificações
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Nota:</strong> Em produção, esta análise será executada automaticamente a cada 15 minutos.
          Use este botão apenas para testes.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Análise Proativa
          </CardTitle>
          <CardDescription>
            A IA irá analisar todos os dados do sistema e gerar notificações inteligentes
            sobre situações que requerem atenção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">O que será analisado:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Pedidos de produção atrasados (críticos: +7 dias)</li>
              <li>Leads sem follow-up há mais de 7 dias</li>
              <li>Follow-ups atrasados</li>
              <li>Insights e oportunidades identificadas pela IA</li>
            </ul>
          </div>

          <Button 
            onClick={runAnalysis} 
            disabled={isRunning}
            size="lg"
            className="w-full"
          >
            <Play className="mr-2 h-4 w-4" />
            {isRunning ? 'Executando análise...' : 'Executar Análise Agora'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            As notificações geradas aparecerão no sino de notificações no menu lateral
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona a IA Proativa?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">1. Monitoramento Contínuo</h4>
            <p className="text-muted-foreground">
              A IA analisa periodicamente todos os dados do sistema em busca de situações que requerem atenção.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-1">2. Priorização Inteligente</h4>
            <p className="text-muted-foreground">
              Cada notificação recebe um nível de prioridade (crítica, alta, média, baixa) baseado na urgência.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-1">3. Insights com IA</h4>
            <p className="text-muted-foreground">
              Além de alertas automáticos, a IA gera insights e identifica oportunidades que podem passar despercebidas.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-1">4. Ações Diretas</h4>
            <p className="text-muted-foreground">
              Cada notificação inclui um link direto para a página relevante, facilitando a ação imediata.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
