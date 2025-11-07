
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
import { BarChart3, Monitor, FileText, Users, Settings, Mail, Brain, Target, Factory, Zap } from 'lucide-react';
import { ChapaBlankIcon } from './icons/ChapaBlankIcon';
import { PerfilUIcon } from './icons/PerfilUIcon';
import { UpdateNotification } from './UpdateNotification';
import { useIsMobile } from '@/hooks/use-mobile';

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
              {menuItems.map((item) => (
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
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <UpdateNotification />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
