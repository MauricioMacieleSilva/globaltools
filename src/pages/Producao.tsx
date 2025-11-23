import React, { useRef, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProducaoKPIs } from '@/components/dashboard/ProducaoKPIs';
import { MateriaisPendentesSummary } from '@/components/dashboard/MateriaisPendentesSummary';
import { ProducaoTable } from '@/components/dashboard/ProducaoTable';
import { RelatorioProducao } from '@/components/dashboard/RelatorioProducao';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generatePDFFromElement } from '@/lib/pdf-utils';
import { useToast } from '@/hooks/use-toast';
import { FileDown, EyeOff, ClipboardList, Package } from 'lucide-react';
import { useProducao } from '@/context/ProducaoContext';
import { HiddenOrdersDialog } from '@/components/dashboard/HiddenOrdersDialog';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export default function Producao() {
  const relatorioRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { filteredData, totalPedidos } = useProducao();
  const { isAdmin } = useUserPermissions();
  const [hiddenDialogOpen, setHiddenDialogOpen] = useState(false);
  

  // Debug: força refresh dos dados ao carregar a página
  React.useEffect(() => {
    console.log('Página de produção carregada - dados serão atualizados');
  }, []);

  const exportarPDF = async () => {
    if (!relatorioRef.current) {
      console.error('Referência do relatório não encontrada');
      toast({
        title: "Erro",
        description: "Referência do relatório não encontrada.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Iniciando geração de PDF...');
      console.log('Elemento encontrado:', relatorioRef.current);
      
      toast({
        title: "Gerando PDF...",
        description: "Por favor, aguarde enquanto o relatório é gerado."
      });

      await generatePDFFromElement(relatorioRef.current, {
        filename: `relatorio_producao_${new Date().toISOString().split('T')[0]}.pdf`,
        orientation: 'portrait',
        format: 'a4',
        quality: 2
      });

      console.log('PDF gerado com sucesso');
      toast({
        title: "PDF gerado com sucesso!",
        description: "O relatório foi baixado para seu dispositivo."
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: `Ocorreu um erro ao gerar o relatório: ${error.message || error}`,
        variant: "destructive"
      });
    }
  };


  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full bg-background">
        <div className="container mx-auto p-2 space-y-4">
          {/* Header com botões de exportar e pedidos ocultos */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Produção</h1>
            <div className="flex gap-2 w-full sm:w-auto">
              {isAdmin && (
                <Button
                  onClick={() => setHiddenDialogOpen(true)}
                  variant="outline"
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <EyeOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Pedidos Ocultos</span>
                </Button>
              )}
              <Button onClick={exportarPDF} className="gap-2 flex-1 sm:flex-none">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar Relatório PDF</span>
                <span className="sm:hidden">Exportar PDF</span>
              </Button>
            </div>
          </div>

          {/* Tabs para separar Produção e Materiais */}
          <Tabs defaultValue="producao" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="producao" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Produção
              </TabsTrigger>
              <TabsTrigger value="materiais" className="gap-2">
                <Package className="h-4 w-4" />
                Materiais Pendentes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="producao" className="space-y-4 mt-4">
              {/* KPIs Produção */}
              <ErrorBoundary>
                <ProducaoKPIs />
              </ErrorBoundary>

              {/* Tabela Detalhada de Produção */}
              <ErrorBoundary>
                <ProducaoTable />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="materiais" className="space-y-4 mt-4">
              {/* Resumo de Materiais Pendentes */}
              <ErrorBoundary>
                <MateriaisPendentesSummary />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>

        {/* Relatório oculto para geração de PDF */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <RelatorioProducao ref={relatorioRef} />
        </div>
        
        {/* Diálogo de pedidos ocultos */}
        {isAdmin && (
          <HiddenOrdersDialog
            open={hiddenDialogOpen}
            onOpenChange={setHiddenDialogOpen}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}