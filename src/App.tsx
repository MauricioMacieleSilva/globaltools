
import { Toaster } from 'sonner';
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
import { CRMDataProvider } from "./context/CRMDataContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { EmailConfirmation } from "./components/auth/EmailConfirmation";
import { useIsMobile } from "@/hooks/use-mobile";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { TourProvider } from "./components/tour/TourProvider";
import CorteBlank from "./pages/CorteBlank";
import CortePerfil from "./pages/CortePerfil";
import DashboardComercial from '@/pages/DashboardComercial';
import { PreVendas } from '@/pages/PreVendas';
import Clientes from "./pages/Clientes";
import PoliticaComercial from "./pages/PoliticaComercial";
import AssistenteGlobal from "./pages/AssistenteGlobal";

import { UserManagement } from "./pages/UserManagement";
import ReportsConfig from "./pages/ReportsConfig";

import NotFound from "./pages/NotFound";
import { Pipeline } from "./pages/Pipeline";
import Producao from "./pages/Producao";
import CRM from "./pages/CRM";
import { Navigate } from "react-router-dom";
import Fretes from "./pages/Fretes";
import Auth from "./pages/Auth";
import Treinamentos from "./pages/Treinamentos";
import Chamados from "./pages/Chamados";
import Ajuda from "./pages/Ajuda";
import { UserAvatarMenu } from "@/components/UserAvatarMenu";
import { LeadAssignmentNotification } from "@/components/crm/LeadAssignmentNotification";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();
  const { userProfile } = useAuth();

  const getPageTitle = () => {
    switch (currentPath) {
      case '/':
      case '/dashboard-comercial':
        return 'Dashboard Comercial';
      case '/crm':
        return 'CRM';
      case '/pre-vendas':
        return 'Pré-Vendas';
      case '/clientes':
        return 'Clientes';
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
        return 'Fábrica';
      case '/treinamentos':
        return 'Treinamentos';
      case '/fretes':
        return 'Fretes';
      case '/chamados':
        return 'Chamados';
      case '/ajuda':
        return 'Central de Ajuda';
      case '/admin/usuarios':
        return 'Administração';
      case '/admin/relatorios':
        return 'Configuração de Relatórios';
      default:
        return 'Global Aço';
    }
  };

  return (
    <Routes>
      {/* Public route - Auth page */}
      <Route path="/auth" element={<Auth />} />
      {/* Public route - Email confirmation */}
      <Route path="/confirm-email" element={<EmailConfirmation />} />
      
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
                      <CRMDataProvider>
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
                                </div>
                              </div>
                              {userProfile && <UserAvatarMenu />}
                            </header>
                            <main className="flex-1">
                              <TourProvider>
                                <Routes>
                                  <Route
                                    path="/"
                                    element={
                                      <ProtectedRoute requirePageAccess="/dashboard-comercial">
                                        <DashboardComercial />
                                      </ProtectedRoute>
                                    }
                                  />
                                <Route
                                  path="/dashboard-comercial"
                                  element={
                                    <ProtectedRoute requirePageAccess="/dashboard-comercial">
                                      <DashboardComercial />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/crm"
                                  element={
                                    <ProtectedRoute requirePageAccess="/crm">
                                      <CRM />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route path="/pre-vendas" element={<Navigate to="/crm" replace />} />
                                <Route path="/pipeline" element={<Navigate to="/crm" replace />} />
                                <Route
                                  path="/clientes"
                                  element={
                                    <ProtectedRoute requirePageAccess="/clientes">
                                      <Clientes />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/corte-chapa"
                                  element={
                                    <ProtectedRoute requirePageAccess="/corte-blank">
                                      <CorteBlank />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/corte-blank"
                                  element={
                                    <ProtectedRoute requirePageAccess="/corte-blank">
                                      <CorteBlank />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/corte-perfil"
                                  element={
                                    <ProtectedRoute requirePageAccess="/corte-perfil">
                                      <CortePerfil />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/politica-comercial"
                                  element={
                                    <ProtectedRoute requirePageAccess="/politica-comercial">
                                      <PoliticaComercial />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/assistente-global"
                                  element={
                                    <ProtectedRoute requirePageAccess="/assistente-global">
                                      <AssistenteGlobal />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/producao"
                                  element={
                                    <ProtectedRoute requirePageAccess="/producao">
                                      <Producao />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/fretes"
                                  element={
                                    <ProtectedRoute requirePageAccess="/producao">
                                      <Fretes />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/treinamentos"
                                  element={
                                    <ProtectedRoute requirePageAccess="/treinamentos">
                                      <Treinamentos />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/chamados"
                                  element={
                                    <ProtectedRoute>
                                      <Chamados />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/ajuda"
                                  element={
                                    <ProtectedRoute>
                                      <Ajuda />
                                    </ProtectedRoute>
                                  }
                                />


                                <Route
                                  path="/admin/usuarios"
                                  element={
                                    <ProtectedRoute requireRole="admin">
                                      <UserManagement />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/admin/relatorios"
                                  element={
                                    <ProtectedRoute requireRole="admin">
                                      <ReportsConfig />
                                    </ProtectedRoute>
                                  }
                                />


                                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                                <Route path="*" element={<NotFound />} />
                                </Routes>
                              </TourProvider>
                            </main>
                          </SidebarInset>
                          <PWAInstallPrompt />
                          <LeadAssignmentNotification />
                        </div>
                      </SidebarProvider>
                      </CRMDataProvider>
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
          <ThemeProvider>
            <AppContent />
            <Toaster position="top-center" richColors closeButton />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
