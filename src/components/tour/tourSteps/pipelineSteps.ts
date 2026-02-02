import { DriveStep } from 'driver.js';

export const pipelineSteps: DriveStep[] = [
  {
    element: '[data-tour="pipeline-status-cards"]',
    popover: {
      title: 'Visão Geral do Pipeline',
      description: 'Veja quantos leads estão em cada etapa: encaminhados, orçando, fechados e perdidos.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="pipeline-lead-time"]',
    popover: {
      title: 'Tempo Médio de Conversão',
      description: 'Acompanhe quanto tempo em média um lead leva para ser convertido em pedido.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="pipeline-tabs"]',
    popover: {
      title: 'Etapas do Pipeline',
      description: 'Navegue entre as etapas: Leads (novos encaminhamentos), Orçando (em negociação), Fechados e Perdidos.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="pipeline-filters"]',
    popover: {
      title: 'Filtros Avançados',
      description: 'Filtre por SDR responsável, vendedor atribuído, período ou busque por cliente.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="pipeline-table"]',
    popover: {
      title: 'Lista de Oportunidades',
      description: 'Clique em um lead para ver qualificação, histórico de atividades e atualizar status.',
      side: 'top',
      align: 'center'
    }
  }
];
