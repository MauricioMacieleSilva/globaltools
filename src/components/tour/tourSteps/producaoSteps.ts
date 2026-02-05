import { DriveStep } from 'driver.js';

export const producaoSteps: DriveStep[] = [
  {
    element: '[data-tour="producao-header"]',
    popover: {
      title: 'Página de Produção',
      description: 'Acompanhe todos os pedidos em produção, materiais pendentes e controle de estoque da fábrica.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="producao-export-btn"]',
    popover: {
      title: 'Exportar Relatório',
      description: 'Gere um PDF com todos os pedidos em produção para impressão ou envio.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="producao-tabs"]',
    popover: {
      title: 'Abas de Navegação',
      description: 'Navegue entre Produção (pedidos), Materiais (pendentes) e Estoque (controle de itens).',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="producao-kpis"]',
    popover: {
      title: 'Indicadores de Produção',
      description: 'Visão geral: total de pedidos, peso em produção, pedidos no prazo, atrasados, a programar e finalizados.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="producao-kpi-total"]',
    popover: {
      title: 'Total de Pedidos',
      description: 'Quantidade total de pedidos atualmente em produção.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="producao-kpi-atrasados"]',
    popover: {
      title: 'Pedidos Atrasados',
      description: 'Pedidos que ultrapassaram a data de entrega prevista. Clique para filtrar apenas esses.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="producao-filters"]',
    popover: {
      title: 'Filtros da Tabela',
      description: 'Busque por número do pedido, cliente ou material. Filtre por cliente específico ou status.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="producao-table"]',
    popover: {
      title: 'Tabela de Pedidos',
      description: 'Lista completa dos pedidos com status, prazo, progresso e dias de atraso. Clique em uma linha para expandir e ver detalhes.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="producao-row-expand"]',
    popover: {
      title: 'Expandir Pedido',
      description: 'Clique para ver as ordens de produção (OPs), materiais e status detalhado de cada operação.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="producao-novo-prazo"]',
    popover: {
      title: 'Novo Prazo',
      description: 'Informe um novo prazo de entrega quando houver reprogramação. Salva automaticamente.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="producao-situacao"]',
    popover: {
      title: 'Situação do Pedido',
      description: 'Marque se o pedido está aguardando matéria-prima ou já em produção.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="materiais-kpis"]',
    popover: {
      title: 'Resumo de Materiais',
      description: 'Veja o total de materiais distintos, materiais críticos (em pedidos atrasados) e peso total pendente.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="materiais-filtros"]',
    popover: {
      title: 'Filtros de Materiais',
      description: 'Busque por material ou classe. Use "Apenas Críticos" para ver só os que têm pedidos atrasados.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="materiais-tabela"]',
    popover: {
      title: 'Tabela de Materiais',
      description: 'Lista agregada de todos os materiais pendentes. Clique em um material para ver quais pedidos o utilizam.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="estoque-tab"]',
    popover: {
      title: 'Controle de Estoque',
      description: 'Gerencie itens do estoque: adicione novos itens, registre entradas/saídas e acompanhe quantidades.',
      side: 'top',
      align: 'center'
    }
  }
];
