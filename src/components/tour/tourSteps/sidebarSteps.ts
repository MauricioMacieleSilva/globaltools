import { DriveStep } from 'driver.js';

export const sidebarSteps: DriveStep[] = [
  {
    element: '[data-tour="sidebar-logo"]',
    popover: {
      title: 'Sua Central de Ferramentas',
      description: 'Aqui você encontra todas as ferramentas da Global Aço. Clique no menu para expandir ou recolher.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-dashboard"]',
    popover: {
      title: 'Dashboard de Vendas',
      description: 'Acompanhe o desempenho de vendas, faturamento, metas e indicadores da equipe comercial.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-pre-vendas"]',
    popover: {
      title: 'Gestão de Leads',
      description: 'Cadastre e gerencie leads, registre contatos e encaminhe para a equipe comercial.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-pipeline"]',
    popover: {
      title: 'Pipeline de Vendas',
      description: 'Acompanhe leads qualificados em negociação, veja status e histórico de cada oportunidade.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-clientes"]',
    popover: {
      title: 'Central de Clientes',
      description: 'Consulte a base de clientes, histórico de compras e análise ABC.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-producao"]',
    popover: {
      title: 'Acompanhamento de Produção',
      description: 'Veja o status dos pedidos em produção, materiais pendentes e estoque.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-politica"]',
    popover: {
      title: 'Tabelas de Preços',
      description: 'Consulte preços por categoria, simule formação de preços e descontos.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-corte-perfil"]',
    popover: {
      title: 'Calculadora de Perfis',
      description: 'Calcule cortes de perfis U, L, Cartola e otimize o aproveitamento das chapas.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-corte-blank"]',
    popover: {
      title: 'Calculadora de Blanks',
      description: 'Otimize o corte de peças em chapas, minimizando perdas de material.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-assistente"]',
    popover: {
      title: 'Zé da Global',
      description: 'Converse com a IA para tirar dúvidas sobre processos, produtos e políticas.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="sidebar-reunioes"]',
    popover: {
      title: 'Reuniões',
      description: 'Acesse o Secretário Digital para gerenciar reuniões e atas.',
      side: 'right',
      align: 'start'
    }
  }
];
