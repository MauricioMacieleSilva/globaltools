import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PoliticaComercialProvider, usePoliticaComercial } from '@/context/PoliticaComercialContext';
import { fetchAllPoliticaComercialData } from '@/services/politicaComercialService';
import { PoliticaDescontos } from '@/components/politica-comercial/PoliticaDescontos';
import { TabelaPrecos } from '@/components/politica-comercial/TabelaPrecos';
import { SimuladorPreco } from '@/components/politica-comercial/SimuladorPreco';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
const classes = [{
  key: 'ARAMES',
  label: 'Arames'
}, {
  key: 'BOBINAS',
  label: 'Bobinas'
}, {
  key: 'PERFIS',
  label: 'Perfis'
}, {
  key: 'CHAPAS',
  label: 'Chapas'
}, {
  key: 'TELHAS',
  label: 'Telhas'
}, {
  key: 'TUBOS',
  label: 'Tubos'
}, {
  key: 'LAMINADOS',
  label: 'Laminados'
}, {
  key: 'VERGALHAO',
  label: 'Vergalhão'
}, {
  key: 'BLANK',
  label: 'Blank'
}];
function PoliticaComercialContent() {
  const {
    dados,
    setDados,
    loading,
    setLoading,
    simulador,
    setSimulador,
    classeAtiva,
    setClasseAtiva
  } = usePoliticaComercial();
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const dadosCompletos = await fetchAllPoliticaComercialData();
        setDados(dadosCompletos);
      } catch (error) {
        console.error('Erro ao carregar dados da política comercial:', error);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, [setDados, setLoading]);

  const handleItemClick = (preco: number) => {
    setSimulador({
      ...simulador,
      precoBase: preco
    });
  };
  return <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Conteúdo Principal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Política de Descontos */}
          <PoliticaDescontos />

          {/* Tabelas de Preços */}
          <Tabs value={classeAtiva} onValueChange={setClasseAtiva} className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
              {classes.map(classe => <TabsTrigger key={classe.key} value={classe.key} className="text-xs">
                  {classe.label}
                </TabsTrigger>)}
            </TabsList>

            {classes.map(classe => <TabsContent key={classe.key} value={classe.key} className="mt-6">
                <TabelaPrecos 
                  titulo={classe.label} 
                  dados={dados[classe.key] || []} 
                  loading={loading} 
                  onItemClick={handleItemClick}
                />
              </TabsContent>)}
          </Tabs>
        </div>

        {/* Sidebar com Simulador */}
        <div className="lg:col-span-1">
          <SimuladorPreco />
        </div>
      </div>
    </div>;
}
export default function PoliticaComercial() {
  return <PoliticaComercialProvider>
      <PoliticaComercialContent />
    </PoliticaComercialProvider>;
}