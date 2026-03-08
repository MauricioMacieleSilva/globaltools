import { DriveStep } from 'driver.js';

export const crmSteps: DriveStep[] = [
  {
    element: '[data-tour="crm-new-lead"]',
    popover: {
      title: 'Novo Lead',
      description: 'Clique aqui para cadastrar um novo lead. Preencha nome, empresa, produto de interesse e outras informações para iniciar o acompanhamento.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="crm-kpis"]',
    popover: {
      title: 'Indicadores do CRM',
      description: 'Acompanhe os KPIs principais: contatos do dia, visitas realizadas, total de leads por etapa do funil e leads perdidos.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="crm-tabs"]',
    popover: {
      title: 'Abas de Visualização',
      description: 'Alterne entre as visões: Kanban (quadro visual), Lista (tabela completa), Agenda (visitas agendadas), Performance (métricas da equipe) e Dashboard (gráficos analíticos).',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="crm-filters"]',
    popover: {
      title: 'Filtros',
      description: 'Filtre leads por nome ou vendedor responsável para encontrar rapidamente o que procura.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="crm-kanban"]',
    popover: {
      title: 'Quadro Kanban',
      description: 'Visualize seus leads organizados por etapa do funil: Lead → Contato Feito → Visita/Reunião → Proposta → Pedido. Arraste os cards entre as colunas para atualizar o status.',
      side: 'top',
      align: 'center'
    }
  },
  {
    popover: {
      title: 'Dica: Movimentação de Leads',
      description: 'Ao mover um lead para "Contato Feito", será necessário enriquecer os dados do lead. Ao mover para "Visita/Reunião", será solicitado agendar data, hora e local. Para marcar como "Perdido", informe o motivo da perda.',
    }
  },
  {
    popover: {
      title: 'Dica: Detalhes do Lead',
      description: 'Clique em qualquer card de lead para abrir o painel de detalhes. Lá você pode ver o histórico completo de atividades, editar informações, registrar contatos e agendar follow-ups.',
    }
  }
];
