import { DriveStep } from 'driver.js';

export const producaoSteps: DriveStep[] = [
  {
    element: '[data-tour="producao-kpis"]',
    popover: {
      title: 'Indicadores de Produção',
      description: 'Acompanhe pedidos em produção, atrasados, peso total e status geral.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="producao-tabs"]',
    popover: {
      title: 'Abas de Produção',
      description: 'Navegue entre Pedidos em Produção, Materiais Pendentes e Controle de Estoque.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="producao-filters"]',
    popover: {
      title: 'Filtros de Produção',
      description: 'Filtre pedidos por status, cliente, data de entrega ou busque por número do pedido.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="producao-table"]',
    popover: {
      title: 'Pedidos em Produção',
      description: 'Veja todos os pedidos com status, prazos e progresso. Clique para ver detalhes.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="producao-export"]',
    popover: {
      title: 'Exportar Relatório',
      description: 'Gere um relatório PDF com todos os pedidos em produção para impressão ou envio.',
      side: 'left',
      align: 'start'
    }
  }
];
