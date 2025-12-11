
import { NavLink, useLocation } from 'react-router-dom';
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { BarChart3, Monitor, FileText, Users, Settings, Mail, Brain, Target, Factory, Zap, LogOut, DollarSign } from 'lucide-react';
import { ChapaBlankIcon } from './icons/ChapaBlankIcon';
import { PerfilUIcon } from './icons/PerfilUIcon';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { useUserPermissions, type PageKey } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';

const menuItems = [
  {
    title: 'Dashboard Comercial',
    url: '/dashboard-comercial',
    icon: BarChart3,
    pageKey: 'dashboard',
  },
  {
    title: 'Pré-Vendas',
    url: '/pre-vendas',
    icon: Target,
    pageKey: 'prevendas',
  },
  {
    title: 'Pipeline de Vendas',
    url: '/pipeline',
    icon: Target,
    pageKey: 'pipeline',
  },
  {
    title: 'Clientes',
    url: '/clientes',
    icon: Users,
    pageKey: 'clientes',
  },
  {
    title: 'Produção',
    url: '/producao',
    icon: Factory,
    pageKey: 'producao',
  },
  {
    title: 'Política Comercial',
    url: '/politica-comercial',
    icon: FileText,
    pageKey: 'politica',
  },
  {
    title: 'Corte Perfil',
    url: '/corte-perfil',
    icon: PerfilUIcon,
    pageKey: 'corteperfil',
  },
  {
    title: 'Corte Blank',
    url: '/corte-blank',
    icon: ChapaBlankIcon,
    pageKey: 'corteblank',
  },
  {
    title: 'Assistente Global',
    url: '/assistente-global',
    icon: Monitor,
    pageKey: 'assistente',
  },
  {
    title: 'Central de Preços',
    url: 'https://central-de-pre-os-437535537334.us-west1.run.app/',
    icon: DollarSign,
    pageKey: 'centralprecos',
    external: true,
  },
]

const adminMenuItems = [
  {
    title: 'Gestão de Conhecimento',
    url: '/admin/conhecimento',
    icon: Brain,
    pageKey: 'conhecimento',
  },
  {
    title: 'Gerenciar Usuários',
    url: '/admin/usuarios',
    icon: Settings,
    pageKey: 'usuarios',
  },
  {
    title: 'Configuração de Relatórios',
    url: '/admin/relatorios',
    icon: Mail,
    pageKey: 'relatorios',
  },
  {
    title: 'IA Proativa - Teste',
    url: '/admin/ia-proativa',
    icon: Zap,
    pageKey: 'ia_proativa',
  },
];

export function AppSidebar() {
  const { state, setOpen, open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();
  const { userProfile, signOut } = useAuth();
  const { checkPageAccess, loading } = useUserPermissions();

  const isActive = (path: string) => currentPath === path;

  // Auto-close sidebar on mobile when route changes
  React.useEffect(() => {
    if (isMobile && open) {
      setOpen(false);
    }
  }, [currentPath, isMobile]);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <div className={`flex items-center gap-2 px-2 py-1 ${state === "collapsed" ? "justify-center" : ""}`}>
          <img 
            src="/lovable-uploads/8030c9ff-1e7f-497b-8069-65171ce1ab5e.png" 
            alt="Global Aço" 
            className="h-8 w-8 flex-shrink-0 object-contain"
            style={{ minWidth: '32px', minHeight: '32px' }}
          />
          {state === "expanded" && (
            <div>
              <h2 className="text-sm font-semibold">Global Aço</h2>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(loading ? menuItems : menuItems.filter(item => checkPageAccess(item.pageKey as PageKey).canView)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={!item.external && isActive(item.url)}>
                    {item.external ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    ) : (
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userProfile?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                  {state === "expanded" && <span>Sair</span>}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
