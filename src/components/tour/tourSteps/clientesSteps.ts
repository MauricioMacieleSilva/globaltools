import { DriveStep } from 'driver.js';

export const clientesSteps: DriveStep[] = [
  {
    element: '[data-tour="clientes-header"]',
    popover: {
      title: 'Central de Clientes',
      description: 'Gerencie e analise sua base de clientes com dados de faturamento, histórico e indicadores.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="clientes-tabs"]',
    popover: {
      title: 'Abas de Navegação',
      description: 'Alterne entre a lista de Clientes e a Análise geográfica/demográfica.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="clientes-kpis"]',
    popover: {
      title: 'Indicadores de Clientes',
      description: 'Visão geral: total de clientes, ativos (compraram nos últimos 3 meses), inativos, faturamento total e ticket médio.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="clientes-search"]',
    popover: {
      title: 'Buscar Cliente',
      description: 'Digite o nome do cliente para filtrar a lista rapidamente.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="clientes-table"]',
    popover: {
      title: 'Lista de Clientes',
      description: 'Veja todos os clientes com status, faturamento, pedidos e última compra. A tabela é paginada para melhor performance.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="clientes-historico"]',
    popover: {
      title: 'Histórico do Cliente',
      description: 'Clique para ver todos os pedidos do cliente, incluindo valores, datas e itens de cada pedido.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="clientes-followup"]',
    popover: {
      title: 'Follow-up',
      description: 'Agende lembretes de contato para manter o relacionamento ativo com o cliente.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="clientes-pagination"]',
    popover: {
      title: 'Paginação',
      description: 'Navegue entre as páginas para ver mais clientes. A lista mostra 50 clientes por página.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="analise-kpis"]',
    popover: {
      title: 'Análise por Região',
      description: 'Veja quantas UFs são atendidas, qual tem mais clientes e maior faturamento, além do percentual de clientes novos.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="analise-grafico-uf"]',
    popover: {
      title: 'Gráfico por UF',
      description: 'Visualize a distribuição de clientes por estado. Clique em uma barra para fazer drill-down e ver as cidades.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="analise-perfil"]',
    popover: {
      title: 'Perfil de Clientes',
      description: 'Proporção entre clientes novos (primeira compra há menos de 1 ano) e antigos.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="analise-tabela"]',
    popover: {
      title: 'Tabela Detalhada',
      description: 'Lista completa por UF/cidade com quantidade de clientes, clientes novos e faturamento. Clique para navegar.',
      side: 'top',
      align: 'center'
    }
  }
];
