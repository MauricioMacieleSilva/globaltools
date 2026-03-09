import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, BarChart3, TrendingDown, XCircle, CalendarDays, Maximize2, Minimize2, Monitor } from 'lucide-react';
import { LastUpdatedIndicator } from '@/components/ui/last-updated-indicator';
import { SessionFilters } from '@/components/dashboard/SessionFilters';
import { cn } from '@/lib/utils';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { ComercialKPIs } from '@/components/dashboard/ComercialKPIs';
import { ComercialCharts } from '@/components/dashboard/ComercialCharts';
import { AnalisePrecos } from '@/components/dashboard/AnalisePrecos';
import { AnalisprecosInsights } from '@/components/dashboard/AnalisprecosInsights';
import { PerdidosKPIs } from '@/components/dashboard/PerdidosKPIs';
import { PerdidosCharts } from '@/components/dashboard/PerdidosCharts';
import { PerdidosTemporalChart } from '@/components/dashboard/PerdidosTemporalChart';
import { PerdidosTable } from '@/components/dashboard/PerdidosTable';
import { PerdidosVendedorChart } from '@/components/dashboard/PerdidosVendedorChart';
import { CancelamentosDevolucoesKPIs } from '@/components/dashboard/CancelamentosDevolucoesKPIs';
import { CancelamentosDevolucoesCharts } from '@/components/dashboard/CancelamentosDevolucoesCharts';
import { CancelamentosDevolucoesTable } from '@/components/dashboard/CancelamentosDevolucoesTable';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OrcamentosSection } from '@/components/dashboard/OrcamentosSection';
import { FollowUpSection } from '@/components/dashboard/FollowUpSection';

import { TemperaturaIndicatorVendas } from '@/components/dashboard/TemperaturaIndicatorVendas';
import { useComercial } from '@/context/ComercialContext';
import { useOrcamentosData } from '@/hooks/useOrcamentosData';

export default function DashboardComercial({ tvMode = false }: { tvMode?: boolean }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Initialize active tab from localStorage, URL params, or default to "dashboard"
  const [activeTab, setActiveTab] = useState(() => {
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab) {
      return urlTab;
    }
    const savedTab = localStorage.getItem('dashboard-comercial-tab');
    return savedTab || "dashboard";
  });
  
  // Use hook com error boundary - verificação condicional
  let comercialData;
  let data = [];
  
  try {
    comercialData = useComercial();
    data = comercialData?.data || [];
    const { setActiveSession, cacheStatus, refreshData, isLoading } = comercialData;

    // Sync session with tab
    useEffect(() => {
      const sessionMap: Record<string, any> = {
        dashboard: 'dashboard',
        perdidos: 'perdidos',
        orcamentos: 'orcamentos'
      };
      
      if (sessionMap[activeTab]) {
        setActiveSession(sessionMap[activeTab]);
      }
    }, [activeTab, setActiveSession]);

  } catch (error) {
    console.error('Erro ao acessar ComercialContext:', error);
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro no contexto comercial</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
  const orcamentosDataHook = useOrcamentosData();

  // Handle URL parameter for tab navigation and persist tab changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
      localStorage.setItem('dashboard-comercial-tab', tabParam);
      // Clear the URL parameter to keep URL clean
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate, activeTab]);

  // Persist tab changes to localStorage
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    localStorage.setItem('dashboard-comercial-tab', newTab);
  };

  
  // Usar dados não filtrados para orçamentos (mesma lógica da OrcamentosSection)
  const orcamentosData = useMemo(() => {
    return data.filter(item => {
      // Excluir vendedor "VENDEDOR"
      if (item.vendedor === 'VENDEDOR') return false;
      
      // Filtrar cliente GLOBAL AÇO SC
      const normalizeText = (text: string) => text?.toUpperCase().replace(/\s+/g, ' ').trim();
      const nomeFantasia = normalizeText(item.cli_nomefantasia || '');
      const cliente = normalizeText(item.cliente || '');
      
      if (nomeFantasia.includes('GLOBAL') && nomeFantasia.includes('AÇO') && nomeFantasia.includes('SC')) {
        return false;
      }
      if (cliente.includes('GLOBAL') && cliente.includes('AÇO') && cliente.includes('SC')) {
        return false;
      }
      
      return ["Orçamento", "Pedido"].includes(item.situacao);
    });
  }, [data]);
  
  // Dados filtrados APENAS para orçamentos (excluir pedidos) para o card de temperatura
  const orcamentosOnlyData = useMemo(() => {
    return data.filter(item => {
      // Excluir vendedor "VENDEDOR"
      if (item.vendedor === 'VENDEDOR') return false;
      
      // Filtrar cliente GLOBAL AÇO SC
      const normalizeText = (text: string) => text?.toUpperCase().replace(/\s+/g, ' ').trim();
      const nomeFantasia = normalizeText(item.cli_nomefantasia || '');
      const cliente = normalizeText(item.cliente || '');
      
      if (nomeFantasia.includes('GLOBAL') && nomeFantasia.includes('AÇO') && nomeFantasia.includes('SC')) {
        return false;
      }
      if (cliente.includes('GLOBAL') && cliente.includes('AÇO') && cliente.includes('SC')) {
        return false;
      }
      
      // Apenas orçamentos, excluir pedidos
      return item.situacao === "Orçamento";
    });
  }, [data]);
  
  const temperatureStats = orcamentosDataHook.calculateTemperatureStats(orcamentosOnlyData, orcamentosDataHook.ratings);

  // Carregar ratings quando o componente montar
  useEffect(() => {
    orcamentosDataHook.loadRatings();
  }, []);

  // Recarregar quando as ratings mudam
  useEffect(() => {
    // Force re-render when ratings change
  }, [orcamentosDataHook.ratings]);


  return (
    <ErrorBoundary>
        <div className={cn(
          "min-h-screen w-full bg-background overflow-x-hidden",
          isFullscreen && "dashboard-fullscreen-mode"
        )}>
          {/* Botão flutuante para sair do modo tela cheia */}
          {isFullscreen && (
            <Button
              variant="secondary"
              size="icon"
              className="fixed top-4 right-4 z-[60] shadow-lg"
              onClick={() => setIsFullscreen(false)}
              title="Sair do modo tela cheia"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
          
          <div className="container mx-auto px-2 sm:px-4 py-2 space-y-2">
            {/* Navegação por Abas */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full overflow-hidden">
              <div className="flex items-center gap-1 sm:gap-2 w-full overflow-hidden">
                <TabsList data-tour="dashboard-tabs" className="grid grid-cols-3 gap-0.5 sm:gap-1 h-9 sm:h-10 flex-1 min-w-0">
                  <TabsTrigger value="dashboard" className="flex items-center justify-center gap-1 text-[10px] sm:text-sm px-1 sm:px-3 h-7 sm:h-8 min-w-0">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="perdidos" className="flex items-center justify-center gap-1 text-[10px] sm:text-sm px-1 sm:px-3 h-7 sm:h-8 min-w-0">
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Perdidos</span>
                  </TabsTrigger>
                  <TabsTrigger value="orcamentos" className="flex items-center justify-center gap-1 text-[10px] sm:text-sm px-1 sm:px-3 h-7 sm:h-8 min-w-0">
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Orçamentos</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* Botões Tela Cheia e Modo TV - escondidos no mobile */}
                {!isFullscreen && (
                  <div className="flex items-center gap-1 shrink-0 hidden sm:flex">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate('/crm?tv=1')}
                      title="Modo TV - Alternar dashboards"
                      className="h-9 w-9"
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      data-tour="dashboard-fullscreen"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsFullscreen(true)}
                      title="Modo tela cheia"
                      className="h-9 w-9"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
               </div>

              {/* Indicador de última atualização */}
              <div className="flex justify-end mt-1">
                <LastUpdatedIndicator 
                  lastUpdated={comercialData?.cacheStatus?.lastUpdate || null} 
                  onRefresh={comercialData?.refreshData} 
                  loading={comercialData?.isLoading} 
                />
              </div>
              {/* Filtros - Abaixo das abas (escondidos em tela cheia) */}
              {!isFullscreen && (
                <ErrorBoundary>
                  <div data-tour="dashboard-filters">
                    <SessionFilters />
                  </div>
                </ErrorBoundary>
              )}

              {/* Aba Dashboard */}
              <TabsContent value="dashboard" className="space-y-2 sm:space-y-4 mt-2">
                {/* KPIs Vendas */}
                <ErrorBoundary>
                  <div data-tour="dashboard-kpis">
                    <ComercialKPIs />
                  </div>
                </ErrorBoundary>

                {/* Gráficos Vendas e Indicador de Temperatura */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-2 sm:gap-4">
                  {/* Coluna esquerda: Faturamento Diário + Top 5 e Fat. por Classe */}
                  <div className="space-y-2 sm:space-y-4" data-tour="dashboard-charts">
                    <ErrorBoundary>
                      <ComercialCharts />
                    </ErrorBoundary>
                  </div>
                  
                  {/* Coluna direita: Card de Temperatura */}
                  <div className="lg:row-span-1" data-tour="dashboard-temperatura">
                    <ErrorBoundary>
                      <TemperaturaIndicatorVendas 
                        stats={temperatureStats} 
                        data={orcamentosData} 
                        ratings={orcamentosDataHook.ratings} 
                      />
                    </ErrorBoundary>
                  </div>
                </div>

              </TabsContent>

              {/* Aba Perdidos */}
              <TabsContent value="perdidos" className="space-y-2 sm:space-y-4 mt-2 overflow-hidden">
                {/* KPIs Perdidos */}
                <ErrorBoundary>
                  <PerdidosKPIs />
                </ErrorBoundary>

                {/* Perdidos por Vendedor */}
                <ErrorBoundary>
                  <PerdidosVendedorChart />
                </ErrorBoundary>

                {/* Gráfico Temporal Perdidos */}
                <ErrorBoundary>
                  <PerdidosTemporalChart />
                </ErrorBoundary>

                {/* Gráficos Perdidos */}
                <ErrorBoundary>
                  <PerdidosCharts />
                </ErrorBoundary>

                {/* Tabela Detalhada */}
                <ErrorBoundary>
                  <PerdidosTable />
                </ErrorBoundary>
              </TabsContent>

              {/* Aba Orçamentos */}
              <TabsContent value="orcamentos" className="space-y-2 sm:space-y-4 mt-2">
                <ErrorBoundary>
                  <OrcamentosSection 
                    sharedOrcamentosData={orcamentosDataHook}
                  />
                </ErrorBoundary>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
    </ErrorBoundary>
  );
}