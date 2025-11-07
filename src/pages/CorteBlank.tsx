
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
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card p-1 rounded-lg h-auto">
            <TabsTrigger value="configuracao" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
              <Settings className="h-4 w-4 mr-1" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="pecas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
              <Package className="h-4 w-4 mr-1" />
              Peças
            </TabsTrigger>
            <TabsTrigger value="visualizacao" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
              <Eye className="h-4 w-4 mr-1" />
              Visualização
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm p-2 sm:p-3">
              <FileText className="h-4 w-4 mr-1" />
              Relatório
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configuracao" className="mt-4 sm:mt-6">
            <ConfiguracaoChapa />
          </TabsContent>

          <TabsContent value="pecas" className="mt-4 sm:mt-6">
            <ListaPecas />
          </TabsContent>

          <TabsContent value="visualizacao" className="mt-4 sm:mt-6">
            <VisualizacaoCorte />
          </TabsContent>

          <TabsContent value="relatorio" className="mt-4 sm:mt-6">
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
