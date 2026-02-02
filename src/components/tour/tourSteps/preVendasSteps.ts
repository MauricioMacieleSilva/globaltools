import { DriveStep } from 'driver.js';

export const preVendasSteps: DriveStep[] = [
  {
    element: '[data-tour="pre-vendas-novo-lead"]',
    popover: {
      title: 'Cadastrar Novo Lead',
      description: 'Clique aqui para registrar um novo lead. Preencha os dados do cliente e interesse.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="pre-vendas-status-cards"]',
    popover: {
      title: 'Status dos Leads',
      description: 'Veja quantos leads estão em cada etapa: novos, em contato, qualificados, encaminhados.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="pre-vendas-kpis"]',
    popover: {
      title: 'Indicadores de Contatos',
      description: 'Acompanhe o volume de contatos diários e mensais, e compare com suas metas.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="pre-vendas-filters"]',
    popover: {
      title: 'Filtros de Busca',
      description: 'Filtre leads por status, data, origem ou busque por nome do cliente.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="pre-vendas-table"]',
    popover: {
      title: 'Lista de Leads',
      description: 'Aqui aparecem todos os seus leads. Clique em um lead para ver detalhes ou registrar atividades.',
      side: 'top',
      align: 'center'
    }
  }
];
