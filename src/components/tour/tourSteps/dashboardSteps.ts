import { DriveStep } from 'driver.js';

export const dashboardSteps: DriveStep[] = [
  {
    element: '[data-tour="dashboard-tabs"]',
    popover: {
      title: 'Navegação por Abas',
      description: 'Alterne entre a visão geral de vendas, análise de orçamentos perdidos e gestão de orçamentos ativos.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="dashboard-filters"]',
    popover: {
      title: 'Filtros de Data',
      description: 'Selecione o período que deseja analisar. Você pode escolher períodos pré-definidos ou datas personalizadas.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="dashboard-kpis"]',
    popover: {
      title: 'Indicadores de Vendas',
      description: 'Acompanhe os principais números: faturamento, meta, ticket médio e quantidade de pedidos.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="dashboard-charts"]',
    popover: {
      title: 'Faturamento Diário',
      description: 'Visualize a evolução do faturamento dia a dia no período selecionado.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="dashboard-temperatura"]',
    popover: {
      title: 'Temperatura dos Orçamentos',
      description: 'Veja a "saúde" dos seus orçamentos: quentes (prontos para fechar), mornos (em negociação) e frios (precisam de atenção).',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="dashboard-fullscreen"]',
    popover: {
      title: 'Modo Apresentação',
      description: 'Clique para ver o dashboard em tela cheia, ideal para reuniões e acompanhamento em TV.',
      side: 'left',
      align: 'start'
    }
  }
];
