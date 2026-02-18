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
import { FileDown, EyeOff, ClipboardList, Package, Warehouse, RefreshCw, Clock } from 'lucide-react';
import { useProducao } from '@/context/ProducaoContext';
import { HiddenOrdersDialog } from '@/components/dashboard/HiddenOrdersDialog';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { EstoqueTab } from '@/components/estoque/EstoqueTab';
import { EstoqueProvider } from '@/context/EstoqueContext';
import { ProductionReportButton } from '@/components/dashboard/ProductionReportButton';

export default function Producao() {
  const relatorioRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { filteredData, totalPedidos, lastUpdated, refetchData, loading } = useProducao();
  const { isAdmin } = useUserPermissions();
  const [hiddenDialogOpen, setHiddenDialogOpen] = useState(false);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Nunca';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      ' - ' + date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const exportarPDF = async () => {
    if (!relatorioRef.current) {
      toast({
        title: "Erro",
        description: "Referência do relatório não encontrada.",
        variant: "destructive"
      });
      return;
    }

    try {
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

      toast({
        title: "PDF gerado com sucesso!",
        description: "O relatório foi baixado para seu dispositivo."
      });
    } catch (error: any) {
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3" data-tour="producao-header">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Produção</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                <Clock className="h-3 w-3" />
                <span>{formatLastUpdated(lastUpdated)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1"
                  onClick={() => refetchData()}
                  disabled={loading}
                  title="Atualizar dados"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              {isAdmin && (
                <>
                  <ProductionReportButton />
                  <Button
                    onClick={() => setHiddenDialogOpen(true)}
                    variant="outline"
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <EyeOff className="h-4 w-4" />
                    <span className="hidden sm:inline">Pedidos Ocultos</span>
                  </Button>
                </>
              )}
              <Button onClick={exportarPDF} className="gap-2 flex-1 sm:flex-none" data-tour="producao-export-btn">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar Relatório PDF</span>
                <span className="sm:hidden">Exportar PDF</span>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="producao" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg" data-tour="producao-tabs">
              <TabsTrigger value="producao" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Produção</span>
              </TabsTrigger>
              <TabsTrigger value="materiais" className="gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Materiais</span>
              </TabsTrigger>
              <TabsTrigger value="estoque" className="gap-2">
                <Warehouse className="h-4 w-4" />
                <span className="hidden sm:inline">Estoque</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="producao" className="space-y-4 mt-4">
              <ErrorBoundary>
                <ProducaoKPIs />
              </ErrorBoundary>
              <ErrorBoundary>
                <ProducaoTable />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="materiais" className="space-y-4 mt-4">
              <ErrorBoundary>
                <MateriaisPendentesSummary />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="estoque" className="space-y-4 mt-4" data-tour="estoque-tab">
              <ErrorBoundary>
                <EstoqueProvider>
                  <EstoqueTab />
                </EstoqueProvider>
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>

        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <RelatorioProducao ref={relatorioRef} />
        </div>
        
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
