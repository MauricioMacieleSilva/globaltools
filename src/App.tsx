
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { CorteBlanksProvider } from "./context/CorteBlanksContext";
import { PerfilProvider } from "./context/PerfilContext";
import { ComercialProvider } from "./context/ComercialContext";
import { PreVendasProvider } from "./context/PreVendasContext";
import { ProducaoProvider } from "./context/ProducaoContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useIsMobile } from "@/hooks/use-mobile";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import CorteBlank from "./pages/CorteBlank";
import CortePerfil from "./pages/CortePerfil";
import DashboardComercial from '@/pages/DashboardComercial';
import { PreVendas } from '@/pages/PreVendas';
import Clientes from "./pages/Clientes";
import PoliticaComercial from "./pages/PoliticaComercial";
import AssistenteGlobal from "./pages/AssistenteGlobal";
import KnowledgeManagement from "./pages/KnowledgeManagement";
import { UserManagement } from "./pages/UserManagement";
import ReportsConfig from "./pages/ReportsConfig";
import AdminAIProactive from "./pages/AdminAIProactive";
import NotFound from "./pages/NotFound";
import { Pipeline } from "./pages/Pipeline";
import Producao from "./pages/Producao";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const getPageTitle = () => {
    switch (currentPath) {
      case '/':
      case '/dashboard-comercial':
        return 'Vendas';
      case '/pre-vendas':
        return 'Pré-Vendas';
      case '/clientes':
        return 'Gestão de Clientes';
      case '/corte-chapa':
      case '/corte-blank':
        return 'Corte Blank';
      case '/corte-perfil':
        return 'Corte Perfil';
      case '/politica-comercial':
        return 'Política Comercial';
      case '/assistente-global':
        return 'Zé da Global';
      case '/pipeline':
        return 'Pipeline de Vendas';
      case '/producao':
        return 'Produção';
      case '/admin/conhecimento':
        return 'Gestão de Conhecimento';
      case '/admin/usuarios':
        return 'Gerenciamento de Usuários';
      case '/admin/ia-proativa':
        return 'IA Proativa - Teste';
      default:
        return 'Global Aço';
    }
  };

  const getPageSubtitle = () => {
    switch (currentPath) {
      case '/':
      case '/dashboard-comercial':
        return 'Análise de Desempenho de Vendas';
      case '/pre-vendas':
        return 'Gestão de Leads e Pré-Vendas';
      case '/clientes':
        return 'Orçamentos, Base de Clientes e Análise ABC';
      case '/corte-chapa':
      case '/corte-blank':
        return 'Otimização de corte para chapas metálicas';
      case '/corte-perfil':
        return 'Cálculo de corte para perfis metálicos';
      case '/politica-comercial':
        return 'Tabelas de preços e simulação de formação de preços';
      case '/assistente-global':
        return 'Assistente de Conhecimento Organizacional';
      case '/pipeline':
        return 'Leads encaminhados pelos SDRs para atendimento comercial';
      case '/producao':
        return 'Acompanhamento de pedidos em produção';
      case '/admin/conhecimento':
        return 'Base de conhecimento e artigos do Zé da Global';
      case '/admin/usuarios':
        return 'Controle de usuários e permissões do sistema';
      default:
        return 'Cálculo | Corte';
    }
  };

  return (
    <Routes>
      {/* Public route - Auth page */}
      <Route path="/auth" element={<Auth />} />
      
      {/* Protected routes - All other pages */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ComercialProvider>
              <ProducaoProvider>
                <CorteBlanksProvider>
                  <PerfilProvider>
                    <PreVendasProvider>
                      <SidebarProvider defaultOpen={!isMobile}>
                        <div className="flex min-h-screen w-full">
                          <AppSidebar />
                          <SidebarInset className="flex-1">
                            <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 sm:gap-4 px-2 sm:px-4 border-b bg-card">
                              <SidebarTrigger className="-ml-1 h-10 w-10 sm:h-9 sm:w-9" />
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <img 
                                  src="/lovable-uploads/385d4fbf-dc72-4bfa-af3a-1ca81c747837.png" 
                                  alt="Global Aço" 
                                  className="w-12 sm:w-20 h-auto flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">{getPageTitle()}</h1>
                                  <p className="text-xs text-muted-foreground truncate hidden sm:block">{getPageSubtitle()}</p>
                                </div>
                              </div>
                            </header>
                            <main className="flex-1">
                              <Routes>
                                <Route path="/" element={<DashboardComercial />} />
                                <Route path="/dashboard-comercial" element={<DashboardComercial />} />
                                <Route path="/pre-vendas" element={<PreVendas />} />
                                <Route path="/clientes" element={<Clientes />} />
                                <Route path="/corte-chapa" element={<CorteBlank />} />
                                <Route path="/corte-blank" element={<CorteBlank />} />
                                <Route path="/corte-perfil" element={<CortePerfil />} />
                                <Route path="/politica-comercial" element={<PoliticaComercial />} />
                                <Route path="/assistente-global" element={<AssistenteGlobal />} />
                                <Route path="/pipeline" element={<Pipeline />} />
                                <Route path="/producao" element={<Producao />} />
                                <Route path="/admin/conhecimento" element={<KnowledgeManagement />} />
                                <Route path="/admin/usuarios" element={<UserManagement />} />
                                <Route path="/admin/relatorios" element={<ReportsConfig />} />
                                <Route path="/admin/ia-proativa" element={<AdminAIProactive />} />
                                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </main>
                          </SidebarInset>
                          <PWAInstallPrompt />
                        </div>
                      </SidebarProvider>
                    </PreVendasProvider>
                  </PerfilProvider>
                </CorteBlanksProvider>
              </ProducaoProvider>
            </ComercialProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
