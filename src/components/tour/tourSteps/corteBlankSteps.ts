import { DriveStep } from 'driver.js';

export const corteBlankSteps: DriveStep[] = [
  {
    element: '[data-tour="blank-tabs"]',
    popover: {
      title: 'Etapas do Cálculo',
      description: 'Navegue entre Configuração da Chapa, Lista de Peças, Visualização e Relatório.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="blank-chapa"]',
    popover: {
      title: 'Dimensões da Chapa',
      description: 'Informe as dimensões da chapa: largura, comprimento e espessura.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="blank-pecas"]',
    popover: {
      title: 'Adicionar Peças',
      description: 'Cadastre as peças que precisam ser cortadas com suas dimensões e quantidades.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="blank-otimizar"]',
    popover: {
      title: 'Otimizar Corte',
      description: 'O sistema calcula a melhor distribuição das peças para minimizar perdas.',
      side: 'top',
      align: 'start'
    }
  },
  {
    element: '[data-tour="blank-visualizacao"]',
    popover: {
      title: 'Mapa de Corte',
      description: 'Veja o layout otimizado mostrando como as peças serão dispostas na chapa.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="blank-relatorio"]',
    popover: {
      title: 'Relatório de Aproveitamento',
      description: 'Confira o percentual de aproveitamento, peso utilizado e perda de material.',
      side: 'left',
      align: 'start'
    }
  }
];
