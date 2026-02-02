import { DriveStep } from 'driver.js';

export const clientesSteps: DriveStep[] = [
  {
    element: '[data-tour="clientes-tabs"]',
    popover: {
      title: 'Abas de Clientes',
      description: 'Navegue entre Orçamentos, Base de Clientes e Análise ABC para diferentes visões dos dados.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="clientes-kpis"]',
    popover: {
      title: 'Indicadores de Clientes',
      description: 'Acompanhe métricas como total de clientes, ticket médio e distribuição ABC.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="clientes-search"]',
    popover: {
      title: 'Buscar Cliente',
      description: 'Digite o nome, código ou CNPJ para encontrar um cliente rapidamente.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="clientes-table"]',
    popover: {
      title: 'Lista de Clientes',
      description: 'Clique em um cliente para ver detalhes completos e histórico de orçamentos.',
      side: 'top',
      align: 'center'
    }
  }
];
