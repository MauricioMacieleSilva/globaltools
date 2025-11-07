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
  
  // Mock data para dashboard sem autenticação
  const mockDashboardData = useMemo(() => [
    { numeropedido: '10347', numeronf: 'NF10347', situacao: 'Emitida', data_emissao: '02/07/2025', descricaomat: 'Material Industrial', observacao: 'Pedido padrão', qtd: 1, un: 'PC', valor_un_bruto: 4435.16, valor: 4435.16, peso: 1500, classe: 'ARAMES', cli_nomefantasia: 'Cliente 10347', cliente: 'Cliente 10347', codigocliente: 'CLI10347', uf: 'SP', cli_cidade: 'São Paulo', data_inicio: '01/07/2025', data_pedido_pronto: '01/07/2025', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'João Silva' },
    { numeropedido: '10362', numeronf: 'NF10362', situacao: 'Emitida', data_emissao: '01/07/2025', descricaomat: 'Material Industrial', observacao: 'Pedido padrão', qtd: 1, un: 'PC', valor_un_bruto: 10381.45, valor: 10381.45, peso: 3200, classe: 'ARAMES', cli_nomefantasia: 'Cliente 10362', cliente: 'Cliente 10362', codigocliente: 'CLI10362', uf: 'RJ', cli_cidade: 'Rio de Janeiro', data_inicio: '30/06/2025', data_pedido_pronto: '30/06/2025', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Maria Santos' },
    { numeropedido: '10363', numeronf: 'NF10363', situacao: 'Emitida', data_emissao: '03/07/2025', descricaomat: 'Chapa Galvanizada', observacao: 'Pedido urgente', qtd: 2, un: 'PC', valor_un_bruto: 2500, valor: 5000, peso: 800, classe: 'CHAPAS', cli_nomefantasia: 'Cliente 10363', cliente: 'Cliente 10363', codigocliente: 'CLI10363', uf: 'MG', cli_cidade: 'Belo Horizonte', data_inicio: '02/07/2025', data_pedido_pronto: '02/07/2025', faturamento_tipo: 1, cliente_novo: 'Cliente novo', vendedor: 'Carlos Pereira' },
    { numeropedido: '10364', numeronf: '', situacao: 'Orçamento', data_emissao: '04/07/2025', descricaomat: 'Perfil L', observacao: 'Orçamento em análise', qtd: 5, un: 'PC', valor_un_bruto: 800, valor: 4000, peso: 600, classe: 'PERFIS', cli_nomefantasia: 'Cliente 10364', cliente: 'Cliente 10364', codigocliente: 'CLI10364', uf: 'PR', cli_cidade: 'Curitiba', data_inicio: '03/07/2025', data_pedido_pronto: '03/07/2025', faturamento_tipo: 0, cliente_novo: 'Cliente existente', vendedor: 'Ana Costa' },
    { numeropedido: '10365', numeronf: '', situacao: 'Pedido', data_emissao: '', descricaomat: 'Chapa de Aço', observacao: 'Pedido em produção', qtd: 3, un: 'PC', valor_un_bruto: 1200, valor: 3600, peso: 400, classe: 'CHAPAS', cli_nomefantasia: 'Cliente 10365', cliente: 'Cliente 10365', codigocliente: 'CLI10365', uf: 'SP', cli_cidade: 'São Paulo', data_inicio: '05/07/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'João Silva' },
  ], []);
  
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
    data = activeTab === 'dashboard' ? mockDashboardData : (comercialData?.data || []);
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

  // Usar dados mock para dashboard, dados do contexto para outras abas
  const currentData = activeTab === 'dashboard' ? mockDashboardData : data;
  
  // Usar dados não filtrados para orçamentos (mesma lógica da OrcamentosSection)
  const orcamentosData = useMemo(() => {
    return currentData.filter(item => {
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
  }, [currentData, activeTab]);
  
  // Dados filtrados APENAS para orçamentos (excluir pedidos) para o card de temperatura
  const orcamentosOnlyData = useMemo(() => {
    return currentData.filter(item => {
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
  }, [currentData, activeTab]);
  
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