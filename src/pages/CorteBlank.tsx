
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Package, Eye, FileText } from 'lucide-react';
import { CorteBlanksProvider, useCorteBlanks } from '@/context/CorteBlanksContext';
import { ConfiguracaoChapa } from '@/components/corte-blank/ConfiguracaoChapa';
import { ListaPecas } from '@/components/corte-blank/ListaPecas';
import { VisualizacaoCorte } from '@/components/corte-blank/VisualizacaoCorte';
import { RelatorioAproveitamento } from '@/components/corte-blank/RelatorioAproveitamento';

function CorteBlankContent() {
  const { abaSelecionada, setAbaSelecionada } = useCorteBlanks();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-background">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-8">
        <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card p-1 rounded-lg h-auto" data-tour="blank-tabs">
            <TabsTrigger value="configuracao" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[10px] sm:text-sm p-1.5 sm:p-3 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Configuração</span>
              <span className="sm:hidden">Config.</span>
            </TabsTrigger>
            <TabsTrigger value="pecas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[10px] sm:text-sm p-1.5 sm:p-3 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Peças
            </TabsTrigger>
            <TabsTrigger value="visualizacao" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[10px] sm:text-sm p-1.5 sm:p-3 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Visualização</span>
              <span className="sm:hidden">Visual</span>
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[10px] sm:text-sm p-1.5 sm:p-3 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Relatório</span>
              <span className="sm:hidden">Relat.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configuracao" className="mt-4 sm:mt-6" data-tour="blank-chapa">
            <ConfiguracaoChapa />
          </TabsContent>

          <TabsContent value="pecas" className="mt-4 sm:mt-6" data-tour="blank-pecas">
            <ListaPecas />
          </TabsContent>

          <TabsContent value="visualizacao" className="mt-4 sm:mt-6" data-tour="blank-visualizacao">
            <VisualizacaoCorte />
          </TabsContent>

          <TabsContent value="relatorio" className="mt-4 sm:mt-6" data-tour="blank-relatorio">
            <RelatorioAproveitamento />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const CorteBlank = () => {
  return <CorteBlankContent />;
};

export default CorteBlank;
