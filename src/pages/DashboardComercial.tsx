import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, BarChart3, TrendingDown, XCircle, CalendarDays } from 'lucide-react';
import { SessionFilters } from '@/components/dashboard/SessionFilters';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ComercialKPIs } from '@/components/dashboard/ComercialKPIs';
import { ComercialCharts } from '@/components/dashboard/ComercialCharts';
import { AnalisePrecos } from '@/components/dashboard/AnalisePrecos';
import { AnalisprecosInsights } from '@/components/dashboard/AnalisprecosInsights';
import { PerdidosKPIs } from '@/components/dashboard/PerdidosKPIs';
import { PerdidosCharts } from '@/components/dashboard/PerdidosCharts';
import { PerdidosTemporalChart } from '@/components/dashboard/PerdidosTemporalChart';
import { PerdidosTable } from '@/components/dashboard/PerdidosTable';
import { CancelamentosDevolucoesKPIs } from '@/components/dashboard/CancelamentosDevolucoesKPIs';
import { CancelamentosDevolucoesCharts } from '@/components/dashboard/CancelamentosDevolucoesCharts';
import { CancelamentosDevolucoesTable } from '@/components/dashboard/CancelamentosDevolucoesTable';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OrcamentosSection } from '@/components/dashboard/OrcamentosSection';
import { FollowUpSection } from '@/components/dashboard/FollowUpSection';
import { ReminderPopup } from '@/components/dashboard/ReminderPopup';
import { TemperaturaIndicatorVendas } from '@/components/dashboard/TemperaturaIndicatorVendas';
import { useComercial } from '@/context/ComercialContext';
import { useOrcamentosData } from '@/hooks/useOrcamentosData';

export default function DashboardComercial() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  
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
    const { setActiveSession } = comercialData;

    // Sync session with tab
    useEffect(() => {
      const sessionMap: Record<string, any> = {
        dashboard: 'dashboard',
        perdidos: 'perdidos', 
        cancelamentos: 'cancelamentos',
        precos: 'precos',
        orcamentos: 'orcamentos',
        followup: 'followup'
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
        <div className="min-h-screen w-full bg-background">
          <div className="container mx-auto p-2 space-y-2">
            {/* Navegação por Abas */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1">
                <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="perdidos" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Perdidos</span>
                </TabsTrigger>
                <TabsTrigger value="cancelamentos" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Canc./Dev.</span>
                </TabsTrigger>
                <TabsTrigger value="precos" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Preços</span>
                </TabsTrigger>
                <TabsTrigger value="orcamentos" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Orçamentos</span>
                </TabsTrigger>
                <TabsTrigger value="followup" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Follow-up</span>
                </TabsTrigger>
              </TabsList>

              {/* Filtros - Abaixo das abas */}
              <ErrorBoundary>
                <SessionFilters />
              </ErrorBoundary>

              {/* Aba Dashboard */}
              <TabsContent value="dashboard" className="space-y-2">
                {/* KPIs Vendas */}
                <ErrorBoundary>
                  <ComercialKPIs />
                </ErrorBoundary>

                {/* Gráficos Vendas e Indicador de Temperatura */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <ErrorBoundary>
                      <ComercialCharts />
                    </ErrorBoundary>
                  </div>
                  <ErrorBoundary>
                    <TemperaturaIndicatorVendas 
                      stats={temperatureStats} 
                      data={orcamentosData} 
                      ratings={orcamentosDataHook.ratings} 
                    />
                  </ErrorBoundary>
                </div>

              </TabsContent>

              {/* Aba Perdidos */}
              <TabsContent value="perdidos" className="space-y-4">
                {/* KPIs Perdidos */}
                <ErrorBoundary>
                  <PerdidosKPIs />
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

              {/* Aba Cancelamentos/Devoluções */}
              <TabsContent value="cancelamentos" className="space-y-4">
                {/* KPIs Cancelamentos/Devoluções */}
                <ErrorBoundary>
                  <CancelamentosDevolucoesKPIs />
                </ErrorBoundary>

                {/* Gráficos Cancelamentos/Devoluções */}
                <ErrorBoundary>
                  <CancelamentosDevolucoesCharts />
                </ErrorBoundary>

                {/* Tabela Detalhada */}
                <ErrorBoundary>
                  <CancelamentosDevolucoesTable />
                </ErrorBoundary>
              </TabsContent>

              {/* Aba Análise de Preços */}
              <TabsContent value="precos" className="space-y-2">
                {/* Análise de Preços */}
                <ErrorBoundary>
                  <AnalisePrecos />
                </ErrorBoundary>

                {/* Insights de Preços */}
                <ErrorBoundary>
                  <AnalisprecosInsights />
                </ErrorBoundary>
              </TabsContent>

              {/* Aba Orçamentos */}
              <TabsContent value="orcamentos" className="space-y-2">
                <ErrorBoundary>
                  <OrcamentosSection 
                    sharedOrcamentosData={orcamentosDataHook}
                  />
                </ErrorBoundary>
              </TabsContent>


              {/* Aba Follow-up */}
              <TabsContent value="followup" className="space-y-2">
                <ErrorBoundary>
                  <FollowUpSection />
                </ErrorBoundary>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Reminder Popup */}
        <ReminderPopup />
    </ErrorBoundary>
  );
}