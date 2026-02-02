import { DriveStep } from 'driver.js';

export const politicaSteps: DriveStep[] = [
  {
    element: '[data-tour="politica-categorias"]',
    popover: {
      title: 'Categorias de Produtos',
      description: 'Navegue entre as categorias: Chapas, Perfis, Tubos, etc. Cada aba mostra os produtos daquela categoria.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="politica-table"]',
    popover: {
      title: 'Tabela de Preços',
      description: 'Consulte preços por produto. Os preços são atualizados automaticamente via integração.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="politica-simulador"]',
    popover: {
      title: 'Simulador de Preço',
      description: 'Simule a formação de preço considerando custo, margem, frete e descontos.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="politica-descontos"]',
    popover: {
      title: 'Política de Descontos',
      description: 'Veja as regras de desconto por volume, tipo de cliente ou condição de pagamento.',
      side: 'left',
      align: 'start'
    }
  }
];
