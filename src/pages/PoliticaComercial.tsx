import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PoliticaComercialProvider, usePoliticaComercial } from '@/context/PoliticaComercialContext';
import { fetchAllPoliticaComercialData } from '@/services/politicaComercialService';
import { PoliticaDescontos } from '@/components/politica-comercial/PoliticaDescontos';
import { TabelaPrecos } from '@/components/politica-comercial/TabelaPrecos';
import { TabelaPerfis } from '@/components/politica-comercial/TabelaPerfis';
import { SimuladorPreco } from '@/components/politica-comercial/SimuladorPreco';

import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchPerfilPrecos } from '@/services/perfilPrecosService';

const classes = [
  { key: 'ARAMES', label: 'Arames' },
  { key: 'BOBINAS', label: 'Bobinas' },
  { key: 'PERFIS', label: 'Perfis' },
  { key: 'CHAPAS', label: 'Chapas' },
  { key: 'TELHAS', label: 'Telhas' },
  { key: 'TUBOS', label: 'Tubos' },
  { key: 'LAMINADOS', label: 'Laminados' },
  { key: 'VERGALHAO', label: 'Construção Civil' },
  { key: 'BLANK', label: 'Blank' }
];

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
  
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [perfilCount, setPerfilCount] = useState(0);

  // Check if user is admin
  useEffect(() => {
    async function checkAdminRole() {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(data.role === 'admin');
      }
    }

    checkAdminRole();
  }, [user?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dadosCompletos, perfilData] = await Promise.all([
        fetchAllPoliticaComercialData(),
        fetchPerfilPrecos()
      ]);
      setDados(dadosCompletos);
      setPerfilCount(perfilData.data?.length || 0);
    } catch (error) {
      console.error('Erro ao carregar dados da política comercial:', error);
    } finally {
      setLoading(false);
    }
  }, [setDados, setLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleItemClick = (preco: number) => {
    setSimulador({
      ...simulador,
      precoBase: preco
    });
  };

  const handleDataChanged = () => {
    loadData();
  };

  const getItemCount = (key: string) => {
    if (key === 'PERFIS') {
      return perfilCount;
    }
    return dados[key]?.length || 0;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Conteúdo Principal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Política de Descontos */}
          <PoliticaDescontos isAdmin={isAdmin} />

          {/* Tabelas de Preços */}
          <Tabs value={classeAtiva} onValueChange={setClasseAtiva} className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9" data-tour="politica-categorias">
              {classes.map(classe => (
                <TabsTrigger key={classe.key} value={classe.key} className="text-xs relative">
                  {classe.label}
                  {getItemCount(classe.key) > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1 text-[10px] px-1.5 py-0 h-4 min-w-[18px]"
                    >
                      {getItemCount(classe.key)}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {classes.map(classe => (
              <TabsContent key={classe.key} value={classe.key} className="mt-6">
                {classe.key === 'PERFIS' ? (
                  <TabelaPerfis 
                    isAdmin={isAdmin}
                    onItemClick={handleItemClick}
                  />
                ) : (
                  <TabelaPrecos 
                    titulo={classe.label} 
                    dados={dados[classe.key] || []} 
                    loading={loading} 
                    onItemClick={handleItemClick}
                    isAdmin={isAdmin}
                    classeAtiva={classe.key}
                    onDataChanged={handleDataChanged}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Sidebar com Simulador */}
        <div className="lg:col-span-1">
          <SimuladorPreco />
        </div>
      </div>
    </div>
  );
}

export default function PoliticaComercial() {
  return (
    <PoliticaComercialProvider>
      <PoliticaComercialContent />
    </PoliticaComercialProvider>
  );
}
